import assert from "node:assert/strict";
import { test } from "node:test";
import { PermissionsBitField } from "discord.js";
import { addCalendarMonths, canManageCommand, COMMAND_DEFINITIONS, evaluatePromotionVotes, formatVerseDate, nextServiceRank, OFFICER_ROLE_IDS, PERSONNEL_CHANNELS, PERSONNEL_ROLES, promotionReviewDelay, promotionRoleChanges, SERVICE_RANKS } from "../lib/personnel/policy.js";
import { createPersonnelService } from "../bot/personnelService.js";
import { personnelCommandDefinition } from "../bot/personnelCommands.js";
import { promotionReviewMessage } from "../bot/personnelMessages.js";
import { checkPublicRsiMembership } from "../bot/rsiMembership.js";

const guildId = "100000000000000001";
const candidateId = "100000000000000002";
const captainId = "261698704468213763";
const officerId = "100000000000000004";
const warlordId = "100000000000000005";
const requestId = "11111111-1111-4111-8111-111111111111";
const memberId = "22222222-2222-4222-8222-222222222222";

function ballot(voterDiscordId, decision, isVeto = false) { return { voterDiscordId, decision, isVeto }; }

test("promotion review reminders use six months for lower ranks and twelve for senior ranks", () => {
  assert.deepEqual(SERVICE_RANKS.slice(1).map((rank) => promotionReviewDelay(rank.roleId)), [6, 6, 12, 12]);
  assert.throws(() => promotionReviewDelay(PERSONNEL_ROLES.foundling));
});

test("ordinary rejection schedules a durable reminder without repeated votes postponing it", async () => {
  const state = fixture();
  await state.vote(captainId, "REJECT");
  assert.equal(state.request.nextReviewReminderAt.toISOString(), "2027-04-22T12:00:00.000Z");
  state.advance(86_400_000);
  await state.vote(captainId, "REJECT");
  assert.equal(state.request.nextReviewReminderAt.toISOString(), "2027-04-22T12:00:00.000Z");
});

test("senior promotion rejection schedules one year rather than original service time", async () => {
  const state = fixture({ approvals: 3 });
  state.request.targetRankRoleId = PERSONNEL_ROLES.fieldMarshal;
  await state.vote(captainId, "REJECT");
  assert.equal(state.request.nextReviewReminderAt.toISOString(), "2027-10-22T12:00:00.000Z");
});

test("Warlord veto cancels reminders and is never automatically reopened", async () => {
  const state = fixture();
  await state.vote(captainId, "REJECT");
  await state.vote(warlordId, "REJECT");
  assert.equal(state.request.nextReviewReminderAt, null);
  state.advance(366 * 86_400_000);
  assert.equal(await state.service.remindReview(requestId), false);
  assert.equal(state.request.status, "VETOED");
  assert.equal(state.sent.length, 0);
});

test("changing the last ordinary rejection to approval cancels its reminder", async () => {
  const state = fixture({ approvals: 3 });
  await state.vote(captainId, "REJECT");
  await state.vote(captainId, "APPROVE");
  assert.equal(state.request.status, "REVIEW");
  assert.equal(state.request.nextReviewReminderAt, null);
});

test("approved promotions cancel reminders permanently", async () => {
  const state = fixture();
  await state.vote(captainId, "REJECT");
  await state.vote(captainId, "APPROVE");
  assert.equal(state.request.status, "COMPLETED");
  assert.equal(state.request.nextReviewReminderAt, null);
  assert.equal(await state.service.remindReview(requestId), false);
});

test("due reminder preserves votes and roles and concurrent workers send only once", async () => {
  const state = fixture();
  state.candidate.user.displayAvatarURL = () => "https://cdn.discordapp.com/embed/avatars/0.png";
  await state.vote(captainId, "REJECT");
  assert.equal(await state.service.remindReview(requestId), false);
  state.advance(183 * 86_400_000);
  assert.deepEqual(await Promise.all([state.service.remindReview(requestId), state.service.remindReview(requestId)]), [true, false]);
  assert.equal(state.sent.length, 1);
  assert.match(state.sent[0].components[0].components[0].url, /review-message$/);
  assert.equal(state.votes.length, 1);
  assert.equal(state.request.status, "REVIEW");
  assert.equal(state.roleCalls.length, 0);
  assert.ok(state.request.lastReviewReminderAt);
  assert.ok(state.request.nextReviewReminderAt > state.request.lastReviewReminderAt);
});

test("failed reminder sends stay due and retry without changing ballots", async () => {
  const state = fixture();
  state.candidate.user.displayAvatarURL = () => "https://cdn.discordapp.com/embed/avatars/0.png";
  await state.vote(captainId, "REJECT");
  state.advance(183 * 86_400_000);
  state.options.announcementFailure = true;
  await assert.rejects(state.service.remindReview(requestId), /permission denied/);
  assert.equal(state.request.lastReviewReminderAt, undefined);
  state.options.announcementFailure = false;
  assert.equal(await state.service.remindReview(requestId), true);
});

test("changed live rank cancels stale reminders instead of promoting anyone", async () => {
  const state = fixture();
  await state.vote(captainId, "REJECT");
  state.advance(183 * 86_400_000);
  state.candidate.roles.cache.delete(PERSONNEL_ROLES.foundling);
  assert.equal(await state.service.remindReview(requestId), false);
  assert.equal(state.request.status, "STALE");
  assert.equal(state.request.nextReviewReminderAt, null);
  assert.equal(state.sent.length, 0);
});

test("review copy refers to a Dragoon and The Clan Warlord", () => {
  const state = fixture();
  state.candidate.user.displayAvatarURL = () => "https://cdn.discordapp.com/embed/avatars/0.png";
  const payload = promotionReviewMessage({ ...state.request, votes: [] }, state.candidate);
  assert.match(payload.embeds[0].description, /A Dragoon has reached/);
  assert.match(payload.embeds[0].fields.find((field) => field.name === "STANDING ORDERS").value, /The Clan Warlord/);
});

test("service durations are 6, 12, 18, and 24 calendar months", () => {
  assert.deepEqual(SERVICE_RANKS.slice(1).map((rank) => rank.months), [6, 12, 18, 24]);
  assert.deepEqual(SERVICE_RANKS.slice(1).map((rank) => rank.approvals), [1, 2, 3, 3]);
  assert.equal(nextServiceRank(PERSONNEL_ROLES.fieldMarshal), null);
});

test("calendar service periods clamp month ends and handle leap years", () => {
  assert.equal(addCalendarMonths("2025-08-31T12:00:00Z", 6).toISOString(), "2026-02-28T12:00:00.000Z");
  assert.equal(addCalendarMonths("2023-08-31T12:00:00Z", 6).toISOString(), "2024-02-29T12:00:00.000Z");
  assert.equal(addCalendarMonths("2024-02-29T12:00:00Z", 12).toISOString(), "2025-02-28T12:00:00.000Z");
});

test("three approvals minus one rejection meets a two-approval threshold", () => {
  const result = evaluatePromotionVotes([ballot("one", "APPROVE"), ballot("two", "APPROVE"), ballot("three", "APPROVE"), ballot("four", "REJECT")], 2);
  assert.equal(result.status, "APPROVED");
  assert.equal(result.score, 2);
});

test("two approvals and one objection do not meet a two-net-approval threshold", () => {
  assert.equal(evaluatePromotionVotes([ballot("one", "APPROVE"), ballot("two", "APPROVE"), ballot("three", "REJECT")], 2).status, "REVIEW");
});

test("Warlord veto overrides any number of approvals while a review is pending", () => {
  assert.equal(evaluatePromotionVotes([...Array.from({ length: 20 }, (_, index) => ballot(`officer-${index}`, "APPROVE")), ballot("warlord", "REJECT", true)], 3).status, "VETOED");
});

test("one person cannot provide multiple approval votes", () => {
  assert.equal(evaluatePromotionVotes([ballot("one", "APPROVE"), ballot("one", "APPROVE")], 2).status, "REVIEW");
});

test("Foundling role changes remove Visitor and Buyer and add all membership roles", () => {
  assert.deepEqual(promotionRoleChanges(PERSONNEL_ROLES.foundling, null, "buyer"), { add: [PERSONNEL_ROLES.foundling, PERSONNEL_ROLES.member, PERSONNEL_ROLES.houseWolf], remove: [PERSONNEL_ROLES.visitor, "buyer"] });
});

test("fictional date follows the supplied real-year plus 930 convention", () => {
  assert.equal(formatVerseDate("2026-10-17T15:00:00Z"), "17 October, 2956");
});

const command = { id: "tacops", commandRoleId: "tacops-command", allowedRoleIds: ["dire-wolfs"], captainDiscordIds: [captainId] };
const memberRoles = [PERSONNEL_ROLES.member, PERSONNEL_ROLES.houseWolf];

test("MeddlerWolf can manage TACOPS specialist roles with Captain rank", () => {
  assert.equal(canManageCommand({ actorId: captainId, actorRoles: [PERSONNEL_ROLES.captain], command, memberRoles, roleId: "dire-wolfs" }), true);
});

test("LOCOPS Captain cannot use TACOPS authority", () => {
  assert.equal(canManageCommand({ actorId: "173989558877159424", actorRoles: [PERSONNEL_ROLES.captain], command, memberRoles, roleId: "dire-wolfs" }), false);
});

test("named ownership without Captain rank is insufficient", () => {
  assert.equal(canManageCommand({ actorId: captainId, actorRoles: [], command, memberRoles, roleId: "dire-wolfs" }), false);
});

test("Captain cannot grant rank or command authority even if put on an allowlist", () => {
  for (const roleId of [PERSONNEL_ROLES.warlord, PERSONNEL_ROLES.captain, PERSONNEL_ROLES.foundling, "tacops-command"]) {
    assert.equal(canManageCommand({ actorId: captainId, actorRoles: [PERSONNEL_ROLES.captain], command: { ...command, allowedRoleIds: [roleId] }, memberRoles, roleId }), false);
  }
});

test("the supplied command families and Captain bindings are preserved", () => {
  assert.equal(COMMAND_DEFINITIONS.find((definition) => definition.key === "tacops").captainDiscordIds[0], captainId);
  assert.equal(COMMAND_DEFINITIONS.find((definition) => definition.key === "locops").captainDiscordIds[0], "173989558877159424");
  assert.deepEqual(COMMAND_DEFINITIONS.map((definition) => definition.roles.length), [2, 3, 4, 3]);
  assert.equal(OFFICER_ROLE_IDS.length, 7);
});

function matches(record, where) {
  if (!record) return false;
  for (const [key, expected] of Object.entries(where)) {
    if (key === "OR") { if (!expected.some((condition) => matches(record, condition))) return false; }
    else if (expected && typeof expected === "object" && !(expected instanceof Date)) {
      if ("in" in expected && !expected.in.includes(record[key])) return false;
      else if ("lt" in expected && !(record[key] && record[key] < expected.lt)) return false;
      else if ("not" in expected && record[key] === expected.not) return false;
      else if (!["in", "lt", "not"].some((operator) => operator in expected) && !matches(record[key], expected)) return false;
    } else if (record[key] !== expected) return false;
  }
  return true;
}

function fixture(options = {}) {
  let clock = new Date("2026-10-22T12:00:00Z");
  const sourceRank = options.founding ? PERSONNEL_ROLES.visitor : PERSONNEL_ROLES.foundling;
  const targetRank = options.founding ? PERSONNEL_ROLES.foundling : PERSONNEL_ROLES.wolfDragoon;
  const member = { id: memberId, guildId, discordId: candidateId, rsiHandle: "wolf", applicationAcceptedAt: new Date("2026-04-22T12:00:00Z"), membershipConfirmedAt: options.unverified ? null : new Date("2026-04-22T12:00:00Z"), membershipVerifiedBy: options.unverified ? null : captainId, currentRankRoleId: options.founding ? null : sourceRank, rankSince: options.founding ? null : new Date("2026-04-22T12:00:00Z") };
  const request = { id: requestId, memberId, sourceRankRoleId: sourceRank, targetRankRoleId: targetRank, rankSince: new Date("2026-04-22T12:00:00Z"), eligibleAt: clock, approvalsRequired: options.founding ? 0 : options.approvals || 1, status: options.status || (options.founding ? "APPROVED" : "REVIEW"), officerMessageId: "review-message", announcementMessageId: null, vetoedBy: null, processingToken: null, processingUntil: null, createdAt: clock, executeAfter: null };
  const votes = [];
  const audits = [];
  const roleCalls = [];
  const sent = [];
  const roleDefinitions = new Map([...Object.values(PERSONNEL_ROLES), "buyer", "dire-wolfs", "mining", "tacops-command", "locops-command", "cosmetic"].map((id) => [id, { id, name: SERVICE_RANKS.find((rank) => rank.roleId === id)?.name || id, editable: true, managed: false, position: 1, color: 0, permissions: new PermissionsBitField(options.privilegedRole === id ? PermissionsBitField.Flags.Administrator : 0n) }]));
  if (options.uneditable) roleDefinitions.get(targetRank).editable = false;
  const people = new Map();
  function person(id, roles) {
    const cache = new Map(roles.map((roleId) => [roleId, roleDefinitions.get(roleId)]));
    const value = { id, displayName: "Nightmare Wolf", user: { bot: false, displayAvatarURL() { throw new Error("Use local banner fallback"); } }, roles: {
      cache,
      add: async (roleId) => { assert.equal(typeof roleId, "string"); roleCalls.push(["ADD", roleId]); if (options.addFailure) throw new Error("Role addition failed"); cache.set(roleId, roleDefinitions.get(roleId)); },
      remove: async (roleId) => { assert.equal(typeof roleId, "string"); roleCalls.push(["REMOVE", roleId]); if (options.removeFailure) throw new Error("Role removal failed"); cache.delete(roleId); },
    } };
    people.set(id, value);
    return value;
  }
  const candidate = person(candidateId, options.founding ? [PERSONNEL_ROLES.visitor, "buyer"] : [sourceRank, PERSONNEL_ROLES.member, PERSONNEL_ROLES.houseWolf, "cosmetic"]);
  person(captainId, [PERSONNEL_ROLES.captain]);
  person(officerId, [PERSONNEL_ROLES.lieutenant]);
  person(warlordId, [PERSONNEL_ROLES.warlord]);
  person("173989558877159424", [PERSONNEL_ROLES.captain]);
  const commands = [command, { id: "locops", commandRoleId: "locops-command", allowedRoleIds: ["mining"], captainDiscordIds: ["173989558877159424"] }];
  function fullRequest() { return { ...structuredClone(request), member: structuredClone(member), votes: structuredClone(votes) }; }
  let queue = Promise.resolve();
  const prisma = {
    $queryRaw: async () => [],
    $transaction: async (operation) => {
      const previous = queue;
      let release;
      queue = new Promise((resolve) => { release = resolve; });
      await previous;
      try { return await operation(prisma); } finally { release(); }
    },
    promotionRequest: {
      findUnique: async () => fullRequest(),
      findFirst: async () => options.activeRequest ? fullRequest() : null,
      findMany: async () => [fullRequest()],
      upsert: async ({ create }) => { options.createdRequest = create; return fullRequest(); },
      update: async ({ data }) => { Object.assign(request, data); return fullRequest(); },
      updateMany: async ({ where, data }) => { if (!matches(request, where)) return { count: 0 }; Object.assign(request, data); return { count: 1 }; },
    },
    promotionVote: {
      upsert: async ({ create, update }) => { const existing = votes.find((vote) => vote.voterDiscordId === create.voterDiscordId); if (existing) Object.assign(existing, update); else votes.push(create); },
      findMany: async () => structuredClone(votes),
    },
    personnelMember: {
      findUnique: async () => structuredClone(member),
      findMany: async () => [structuredClone(member)],
      update: async ({ data }) => { Object.assign(member, data); return structuredClone(member); },
      upsert: async ({ update }) => { Object.assign(member, update); return structuredClone(member); },
    },
    personnelAudit: { create: async ({ data }) => { audits.push(data); return data; } },
    personnelCommand: { findUnique: async ({ where }) => commands.find((item) => item.id === where.guildId_key.key), findMany: async () => commands },
    marketplaceGuest: { deleteMany: async () => { options.guestRetired = true; return { count: 1 }; } },
    user: { findUnique: async () => null },
  };
  const destination = { guildId, isTextBased: () => true, messages: { fetch: async () => ({ edit: async (payload) => { options.lastReview = payload; } }) }, send: async (payload) => {
    if (options.announcementFailure) throw new Error("Announcement permission denied");
    sent.push(payload);
    return { id: `message-${sent.length}` };
  } };
  const server = { id: guildId, members: { fetch: async ({ user }) => { if (!people.has(user)) throw new Error("Unknown member"); return people.get(user); }, fetchMe: async () => ({}) }, roles: { fetch: async () => roleDefinitions } };
  const client = { isReady: () => true, guilds: { fetch: async () => server }, channels: { fetch: async () => destination } };
  const service = createPersonnelService({ client, prisma, config: { guildId, buyerRoleId: "buyer" }, now: () => clock, logger: { error() {} } });
  const vote = (actorId, decision = "APPROVE", overrides = {}) => service.castVote({ requestId, actorId, decision, messageId: "review-message", channelId: PERSONNEL_CHANNELS.officers, ...overrides });
  return { options, service, prisma, member, request, votes, audits, roleCalls, candidate, people, sent, vote, advance: (milliseconds) => { clock = new Date(clock.getTime() + milliseconds); } };
}

test("approval threshold finalizes and applies only the specified rank changes", async () => {
  const state = fixture();
  await state.vote(captainId);
  assert.equal(state.request.status, "COMPLETED");
  assert.deepEqual(state.roleCalls, [["ADD", PERSONNEL_ROLES.wolfDragoon], ["REMOVE", PERSONNEL_ROLES.foundling]]);
  assert.equal(state.candidate.roles.cache.has("cosmetic"), true);
  assert.equal(state.member.currentRankRoleId, PERSONNEL_ROLES.wolfDragoon);
  assert.equal(state.sent.length, 1);
});

test("a completed approval cannot be rejected afterward", async () => {
  const state = fixture();
  await state.vote(captainId);
  await assert.rejects(state.vote(warlordId, "REJECT"), /decision is final/);
  assert.equal(state.request.status, "COMPLETED");
});

test("Warlord rejection vetoes a pending order and makes no role changes", async () => {
  const state = fixture({ approvals: 3 });
  await state.vote(captainId);
  await state.vote(officerId);
  await state.vote(warlordId, "REJECT");
  assert.equal(state.request.status, "VETOED");
  assert.equal(state.roleCalls.length, 0);
  await assert.rejects(state.vote(captainId), /final/);
});

test("repeat ballots update one officer's vote rather than adding approvals", async () => {
  const state = fixture({ approvals: 3 });
  await state.vote(captainId);
  await state.vote(captainId);
  assert.equal(state.votes.length, 1);
  assert.equal(state.request.status, "REVIEW");
  await state.vote(captainId, "REJECT");
  assert.equal(state.votes[0].decision, "REJECT");
});

test("forged message IDs, wrong channels, and unauthorized voters are refused", async () => {
  const state = fixture();
  await assert.rejects(state.vote(captainId, "APPROVE", { messageId: "forged" }), /current promotion review/);
  await assert.rejects(state.vote(captainId, "APPROVE", { channelId: "public" }), /officer-chat/);
  await assert.rejects(state.vote(candidateId), /officer rank/);
  assert.equal(state.votes.length, 0);
});

test("self-voting is refused even for an officer", async () => {
  const state = fixture();
  state.candidate.roles.cache.set(PERSONNEL_ROLES.lieutenant, {});
  await assert.rejects(state.vote(candidateId), /own promotion/);
});

test("two concurrent approvals still produce one role transition", async () => {
  const state = fixture();
  await Promise.allSettled([state.vote(captainId), state.vote(officerId)]);
  assert.equal(state.request.status, "COMPLETED");
  assert.equal(state.roleCalls.filter(([action]) => action === "ADD").length, 1);
});

test("partial Discord failures retry without replacing unrelated roles", async () => {
  const state = fixture({ removeFailure: true });
  await state.vote(captainId);
  assert.equal(state.request.status, "RETRY");
  assert.equal(state.sent.length, 0);
  state.options.removeFailure = false;
  state.advance(61_000);
  await state.service.executeRequest(requestId);
  assert.equal(state.request.status, "COMPLETED");
  assert.equal(state.candidate.roles.cache.has("cosmetic"), true);
  assert.equal(state.sent.length, 1);
});

test("uneditable roles fail before any Discord role is changed", async () => {
  const state = fixture({ uneditable: true });
  await state.vote(captainId);
  assert.equal(state.request.status, "RETRY");
  assert.equal(state.roleCalls.length, 0);
});

test("a live officer rank stops a stale automatic promotion", async () => {
  const state = fixture();
  state.candidate.roles.cache.set(PERSONNEL_ROLES.captain, {});
  await state.vote(captainId);
  assert.equal(state.request.status, "STALE");
  assert.equal(state.roleCalls.length, 0);
});

test("Foundling needs no ballot after both membership conditions are verified", async () => {
  const state = fixture({ founding: true });
  await state.service.executeRequest(requestId);
  assert.equal(state.request.status, "COMPLETED");
  assert.equal(state.votes.length, 0);
  assert.equal(state.candidate.roles.cache.has(PERSONNEL_ROLES.member), true);
  assert.equal(state.candidate.roles.cache.has(PERSONNEL_ROLES.houseWolf), true);
  assert.equal(state.candidate.roles.cache.has(PERSONNEL_ROLES.visitor), false);
  assert.equal(state.candidate.roles.cache.has("buyer"), false);
  assert.equal(state.options.guestRetired, true);
});

test("unverified RSI membership blocks Foundling", async () => {
  const state = fixture({ founding: true, unverified: true });
  await state.service.executeRequest(requestId);
  assert.equal(state.request.status, "RETRY");
  assert.equal(state.roleCalls.length, 0);
});

test("missing time-in-rank history never substitutes the guild join date", async () => {
  const state = fixture();
  await state.service.considerMember({ ...state.member, rankSince: null });
  assert.equal(state.options.createdRequest, undefined);
});

test("announcement failures retry separately without reapplying the rank", async () => {
  const state = fixture({ announcementFailure: true });
  await state.vote(captainId);
  assert.equal(state.request.status, "COMPLETED");
  assert.equal(state.request.announcementMessageId, null);
  const rolesApplied = state.roleCalls.length;
  state.options.announcementFailure = false;
  state.advance(61_000);
  await state.service.publishAnnouncement(requestId);
  assert.ok(state.request.announcementMessageId);
  assert.equal(state.roleCalls.length, rolesApplied);
});

test("Captain assignment is scoped and uses a single-role API call", async () => {
  const state = fixture();
  await state.service.assignCommandRole({ actorId: captainId, discordId: candidateId, commandKey: "tacops", roleId: "dire-wolfs", action: "ADD" });
  assert.equal(state.candidate.roles.cache.has("dire-wolfs"), true);
  assert.equal(state.audits.at(-1).action, "COMMAND_ROLE_COMPLETED");
});

test("other-command Captains, transfers, and privileged specialist roles are refused", async () => {
  const state = fixture();
  const input = { discordId: candidateId, commandKey: "tacops", roleId: "dire-wolfs", action: "ADD" };
  await assert.rejects(state.service.assignCommandRole({ ...input, actorId: "173989558877159424" }), /own command/);
  state.candidate.roles.cache.set("mining", {});
  await assert.rejects(state.service.assignCommandRole({ ...input, actorId: captainId }), /another command/);
  const privileged = fixture({ privilegedRole: "dire-wolfs" });
  await assert.rejects(privileged.service.assignCommandRole({ ...input, actorId: captainId }), /administrative permissions/);
});

test("review cards carry persistent buttons, count votes, and disable terminal decisions", () => {
  const state = fixture();
  state.candidate.user.displayAvatarURL = () => "https://cdn.discordapp.com/avatar.png";
  const payload = promotionReviewMessage({ ...state.request, votes: [] }, state.candidate);
  assert.match(payload.components[0].components[0].custom_id, /hw:promotion:APPROVE:/);
  assert.equal(payload.allowedMentions.parse.length, 0);
  const complete = promotionReviewMessage({ ...state.request, status: "COMPLETED", votes: [] }, state.candidate);
  assert.equal(complete.components[0].components.every((button) => button.disabled), true);
});

test("slash command schema is valid and offers scoped Captain assignment", () => {
  const definition = personnelCommandDefinition();
  assert.equal(definition.name, "personnel");
  assert.ok(definition.options.find((option) => option.name === "assign-role"));
});

test("RSI membership is never inferred from an unconfigured API", async () => {
  assert.equal((await checkPublicRsiMembership("wolf", {})).confirmed, false);
});

test("RSI checks require exact linked identity, fresh data, and CUTTERWOLF", async () => {
  const now = new Date("2026-10-22T12:00:00Z");
  const payload = { success: true, updatedAt: now.toISOString(), data: { profile: { handle: "Wolf" }, organization: { sid: "CUTTERWOLF" } } };
  const check = (value) => checkPublicRsiMembership("wolf", { apiKey: "fake-test-key", now, fetcher: async () => Response.json(value) });
  assert.equal((await check(payload)).confirmed, true);
  assert.equal((await check({ ...payload, updatedAt: "2026-10-20T12:00:00Z" })).confirmed, false);
  assert.equal((await check({ ...payload, data: { ...payload.data, profile: { handle: "somebody_else" } } })).confirmed, false);
  assert.equal((await check({ ...payload, data: { ...payload.data, organization: { sid: "OTHERORG" } } })).confirmed, false);
});
