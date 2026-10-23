import assert from "node:assert/strict";
import { test } from "node:test";
import { Collection, PermissionsBitField } from "discord.js";
import { addCalendarMonths, canManageCommand, COMMAND_DEFINITIONS, evaluatePromotionVotes, formatVerseDate, nextServiceRank, OFFICER_ROLE_IDS, PERSONNEL_CHANNELS, PERSONNEL_COMMAND_ROLE_IDS, PERSONNEL_ROLES, promotionReviewDelay, promotionRoleChanges, SERVICE_RANKS } from "../lib/personnel/policy.js";
import { createPersonnelService } from "../bot/personnelService.js";
import { attachPersonnelInteractions, divisionCommandDefinitions, personnelCommandDefinition, registerPersonnelCommand } from "../bot/personnelCommands.js";
import { promotionReviewMessage } from "../bot/personnelMessages.js";
import { checkPublicRsiMembership, discordRsiHandleCandidates } from "../bot/rsiMembership.js";

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
  assert.deepEqual(COMMAND_DEFINITIONS.map((definition) => definition.roles.length), [2, 3, 5, 3]);
  assert.equal(OFFICER_ROLE_IDS.length, 7);
});

function matches(record, where) {
  if (!record) return false;
  for (const [key, expected] of Object.entries(where)) {
    if (key === "OR") { if (!expected.some((condition) => matches(record, condition))) return false; }
    else if (expected && typeof expected === "object" && !(expected instanceof Date)) {
      if ("in" in expected && !expected.in.includes(record[key])) return false;
      else if ("lt" in expected && !(record[key] && record[key] < expected.lt)) return false;
      else if ("lte" in expected && !(record[key] <= expected.lte)) return false;
      else if ("gt" in expected && !(record[key] > expected.gt)) return false;
      else if ("not" in expected && record[key] === expected.not) return false;
      else if (!["in", "lt", "lte", "gt", "not"].some((operator) => operator in expected) && !matches(record[key], expected)) return false;
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
  const rawQueries = [];
  const assignments = [];
  const websiteRoles = new Set();
  let inTransaction = false;
  const roleCalls = [];
  const sent = [];
  const roleDefinitions = new Map([...Object.values(PERSONNEL_ROLES), "buyer", "dire-wolfs", "mining", "tacops-command", "locops-command", "cosmetic"].map((id) => [id, { id, name: SERVICE_RANKS.find((rank) => rank.roleId === id)?.name || id, editable: true, managed: false, position: 1, color: 0, permissions: new PermissionsBitField(options.privilegedRole === id ? PermissionsBitField.Flags.Administrator : 0n) }]));
  if (options.uneditable) roleDefinitions.get(targetRank).editable = false;
  roleDefinitions.get("dire-wolfs").name = "TACOPS - Dire Wolfs";
  roleDefinitions.get("mining").name = "LOCOPS - Mining";
  const people = new Map();
  function person(id, roles) {
    const cache = new Map(roles.map((roleId) => [roleId, roleDefinitions.get(roleId)]));
    const value = { id, displayName: "Nightmare Wolf", user: { bot: false, displayAvatarURL() { throw new Error("Use local banner fallback"); } }, roles: {
      cache,
      add: async (roleId) => { assert.equal(inTransaction, false, "Discord changes must run outside SQL transactions"); assert.equal(typeof roleId, "string"); roleCalls.push(["ADD", roleId]); if (options.addFailure) throw new Error("Role addition failed"); cache.set(roleId, roleDefinitions.get(roleId)); if (options.ambiguousRoleFailure) throw new Error("Connection lost after Discord applied the role"); },
      remove: async (roleId) => { assert.equal(inTransaction, false, "Discord changes must run outside SQL transactions"); assert.equal(typeof roleId, "string"); roleCalls.push(["REMOVE", roleId]); if (options.removeFailure) throw new Error("Role removal failed"); cache.delete(roleId); },
    } };
    people.set(id, value);
    return value;
  }
  const candidate = person(candidateId, options.founding ? [PERSONNEL_ROLES.visitor, "buyer"] : [sourceRank, PERSONNEL_ROLES.member, PERSONNEL_ROLES.houseWolf, "cosmetic"]);
  person(captainId, [PERSONNEL_ROLES.captain]);
  person(officerId, [PERSONNEL_ROLES.lieutenant]);
  person(warlordId, [PERSONNEL_ROLES.warlord]);
  person("173989558877159424", [PERSONNEL_ROLES.captain]);
  const commands = [structuredClone(command), { id: "locops", commandRoleId: "locops-command", allowedRoleIds: ["mining"], captainDiscordIds: ["173989558877159424"] }];
  function fullRequest() { return { ...structuredClone(request), member: structuredClone(member), votes: structuredClone(votes) }; }
  let queue = Promise.resolve();
  const prisma = {
    $queryRaw: async (strings, ...parameters) => {
      const sql = strings.join("?");
      rawQueries.push({ sql, parameters, inTransaction });
      if (/^SELECT pg_advisory_xact_lock/.test(sql)) throw new Error("Failed to deserialize column of type void");
      return sql.includes("pg_advisory_xact_lock") ? [{ locked: 1 }] : [];
    },
    $transaction: async (operation) => {
      const previous = queue;
      let release;
      queue = new Promise((resolve) => { release = resolve; });
      await previous;
      const saved = { assignments: structuredClone(assignments), audits: structuredClone(audits), websiteRoles: [...websiteRoles] };
      inTransaction = true;
      try {
        const result = await operation(prisma);
        if (options.failEnqueueCommit && assignments.length > saved.assignments.length) throw new Error("Enqueue commit failed");
        if (options.failAssignmentCommit && assignments.some((job, index) => job.status === "COMPLETED" && saved.assignments[index]?.status !== "COMPLETED")) {
          options.failAssignmentCommit = false;
          throw new Error("Assignment commit failed");
        }
        return result;
      } catch (error) {
        assignments.splice(0, assignments.length, ...saved.assignments);
        audits.splice(0, audits.length, ...saved.audits);
        websiteRoles.clear();
        for (const role of saved.websiteRoles) websiteRoles.add(role);
        throw error;
      } finally { inTransaction = false; release(); }
    },
    personnelRoleAssignment: {
      create: async ({ data }) => { const job = { id: `assignment-${assignments.length + 1}`, status: "PENDING", processingUntil: null, processingToken: null, ...data }; assignments.push(job); return structuredClone(job); },
      findFirst: async ({ where }) => structuredClone(assignments.find(job => matches(job, where)) || null),
      findUnique: async ({ where }) => structuredClone(assignments.find(job => matches(job, where)) || null),
      findMany: async ({ where, take }) => structuredClone(assignments.filter(job => matches(job, where)).slice(0, take)),
      updateMany: async ({ where, data }) => { let count = 0; for (const job of assignments) if (matches(job, where)) { Object.assign(job, data); count++; } return { count }; },
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
    personnelCommand: {
      updateMany: async ({ where, data }) => {
        const command = commands.find(item => item.guildId === where.guildId && item.key === where.key);
        if (!command || command.allowedRoleIds.includes(where.NOT.allowedRoleIds.has)) return { count: 0 };
        command.allowedRoleIds.push(data.allowedRoleIds.push);
        command.updatedBy = data.updatedBy;
        return { count: 1 };
      },
      findUnique: async ({ where }) => commands.find((item) => item.id === where.guildId_key.key),
      findMany: async () => commands,
      upsert: async ({ where, create, update }) => {
        const existing = commands.find(item => item.id === where.guildId_key.key);
        if (existing) { Object.assign(existing, update); return existing; }
        const mapped = { id: where.guildId_key.key, ...create };
        commands.push(mapped);
        return mapped;
      },
    },
    marketplaceGuest: { deleteMany: async () => { options.guestRetired = true; return { count: 1 }; } },
    user: { findUnique: async () => options.websiteUser ? { id: "website-user" } : null },
    discordRole: { upsert: async () => ({}) },
    userRole: {
      upsert: async ({ create }) => { if (options.websiteSyncFailure) throw new Error("Website role sync failed"); websiteRoles.add(create.discordRoleId); },
      deleteMany: async ({ where }) => { if (options.websiteSyncFailure) throw new Error("Website role sync failed"); for (const id of where.discordRoleId.in) websiteRoles.delete(id); },
    },
  };
  const destination = { guildId, isTextBased: () => true, messages: { fetch: async () => ({ edit: async (payload) => { options.lastReview = payload; } }) }, send: async (payload) => {
    if (options.announcementFailure) throw new Error("Announcement permission denied");
    sent.push(payload);
    return { id: `message-${sent.length}` };
  } };
  const server = { id: guildId, members: { fetch: async ({ user }) => { if (!people.has(user)) throw Object.assign(new Error("Unknown member"), { code: 10007 }); return people.get(user); }, fetchMe: async () => ({}) }, roles: { fetch: async () => roleDefinitions } };
  const client = { user: { id: "bot" }, isReady: () => true, guilds: { fetch: async () => server }, channels: { fetch: async () => destination } };
  const createService = () => createPersonnelService({ client, prisma, config: { guildId, buyerRoleId: "buyer", rsiApiKey: options.rsiApiKey }, membershipLookup: options.membershipLookup, now: () => clock, logger: { error() {} } });
  const service = createService();
  const vote = (actorId, decision = "APPROVE", overrides = {}) => service.castVote({ requestId, actorId, decision, messageId: "review-message", channelId: PERSONNEL_CHANNELS.officers, ...overrides });
  return { options, service, createService, prisma, assignments, websiteRoles, member, request, votes, audits, rawQueries, roleCalls, candidate, people, sent, vote, roleDefinitions, commands, advance: (milliseconds) => { clock = new Date(clock.getTime() + milliseconds); } };
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

const specialistInput = { actorId: captainId, discordId: candidateId, commandKey: "tacops", roleId: "dire-wolfs", action: "ADD" };

test("an assignment enqueue rollback never changes Discord", async () => {
  const state = fixture({ failEnqueueCommit: true });
  await assert.rejects(state.service.assignCommandRole(specialistInput), /Enqueue commit failed/);
  assert.equal(state.assignments.length, 0);
  assert.equal(state.roleCalls.length, 0);
  assert.deepEqual(state.audits.map(event => event.action), ["COMMAND_ROLE_FAILED"]);
});

for (const failure of ["websiteSyncFailure", "failAssignmentCommit", "ambiguousRoleFailure"]) {
  test(`durable assignment recovers from ${failure} after a worker restart`, async () => {
    const state = fixture({ websiteUser: true, [failure]: true });
    const result = await state.service.assignCommandRole(specialistInput);
    assert.equal(result.status, "RETRY");
    assert.equal(state.candidate.roles.cache.has("dire-wolfs"), true);
    assert.equal(state.assignments[0].status, "RETRY");
    assert.equal(state.websiteRoles.has("dire-wolfs"), false);
    assert.equal(state.audits.filter(event => event.action === "COMMAND_ROLE_COMPLETED").length, 0);
    state.options[failure] = false;
    state.advance(61_000);
    await state.createService().reconcileCommandAssignments();
    assert.equal(state.assignments[0].status, "COMPLETED");
    assert.equal(state.websiteRoles.has("dire-wolfs"), true);
    assert.equal(state.roleCalls.length, 1, "recovery must not reapply an already confirmed Discord change");
    assert.equal(state.audits.filter(event => event.action === "COMMAND_ROLE_COMPLETED").length, 1);
    await state.createService().reconcileCommandAssignments();
    assert.equal(state.roleCalls.length, 1);
  });
}

test("a failed removal synchronizes the website on retry without removing unrelated roles", async () => {
  const state = fixture({ websiteUser: true, websiteSyncFailure: true });
  state.candidate.roles.cache.set("dire-wolfs", state.roleDefinitions.get("dire-wolfs"));
  state.websiteRoles.add("dire-wolfs");
  assert.equal((await state.service.assignCommandRole({ ...specialistInput, action: "REMOVE" })).status, "RETRY");
  assert.equal(state.candidate.roles.cache.has("dire-wolfs"), false);
  assert.equal(state.websiteRoles.has("dire-wolfs"), true);
  state.options.websiteSyncFailure = false;
  state.advance(61_000);
  await state.service.reconcileCommandAssignments();
  assert.equal(state.assignments[0].status, "COMPLETED");
  assert.equal(state.websiteRoles.has("dire-wolfs"), false);
  assert.equal(state.candidate.roles.cache.has("cosmetic"), true);
  assert.equal(state.roleCalls.length, 1);
});

test("a pending assignment prevents conflicting commands for the same member", async () => {
  const state = fixture({ addFailure: true });
  await state.service.assignCommandRole(specialistInput);
  await assert.rejects(state.service.assignCommandRole({ ...specialistInput, actorId: "173989558877159424", commandKey: "locops", roleId: "mining" }), /pending specialist assignment/);
  assert.equal(state.assignments.length, 1);
});

test("concurrent workers claim a pending assignment only once", async () => {
  const state = fixture({ addFailure: true });
  await state.service.assignCommandRole(specialistInput);
  state.options.addFailure = false;
  state.advance(61_000);
  await Promise.all([state.service.reconcileCommandAssignments(), state.createService().reconcileCommandAssignments()]);
  assert.equal(state.assignments[0].status, "COMPLETED");
  assert.equal(state.roleCalls.length, 2, "one failed attempt and one successful retry");
  assert.equal(state.audits.filter(event => event.action === "COMMAND_ROLE_COMPLETED").length, 1);
});

test("expired execution leases are recovered after a crash", async () => {
  const state = fixture({ addFailure: true });
  await state.service.assignCommandRole(specialistInput);
  Object.assign(state.assignments[0], { status: "EXECUTING", processingToken: "crashed-worker", processingUntil: new Date("2026-10-22T12:05:00Z") });
  state.options.addFailure = false;
  state.advance(61_000);
  await state.createService().reconcileCommandAssignments();
  assert.equal(state.roleCalls.length, 1);
  state.advance(300_000);
  await state.createService().reconcileCommandAssignments();
  assert.equal(state.assignments[0].status, "COMPLETED");
});

for (const change of ["demoted", "departed", "other-command"]) {
  test(`a pending assignment does not grant roles when authority changes: ${change}`, async () => {
    const state = fixture({ addFailure: true, websiteUser: true });
    await state.service.assignCommandRole(specialistInput);
    state.options.addFailure = false;
    if (change === "demoted") state.people.get(captainId).roles.cache.delete(PERSONNEL_ROLES.captain);
    if (change === "departed") state.people.delete(captainId);
    if (change === "other-command") state.candidate.roles.cache.set("mining", state.roleDefinitions.get("mining"));
    state.advance(61_000);
    await state.createService().reconcileCommandAssignments();
    assert.equal(state.assignments[0].status, "CANCELLED");
    assert.equal(state.candidate.roles.cache.has("dire-wolfs"), false);
    assert.equal(state.websiteRoles.has("dire-wolfs"), false);
    assert.equal(state.roleCalls.length, 1);
  });
}

test("the personnel poll runs durable assignment recovery", async () => {
  const state = fixture({ addFailure: true });
  await state.service.assignCommandRole(specialistInput);
  state.options.addFailure = false;
  state.advance(61_000);
  await state.createService().poll();
  assert.equal(state.assignments[0].status, "COMPLETED");
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
  assert.equal(definition.default_member_permissions, "0");
  assert.deepEqual(definition.options.map(option => option.name), ["service-history"]);
  assert.equal(definition.options.some(option => option.name === "assign-role"), false);
  const choices = Object.fromEntries(COMMAND_DEFINITIONS.map(command => [command.key, command.roles.map((name, index) => ({ name, value: `${command.key}-role-${index}` }))]));
  const divisions = divisionCommandDefinitions(choices);
  assert.deepEqual(divisions.map(command => command.name), COMMAND_DEFINITIONS.map(command => command.key));
  for (const command of divisions) {
    assert.equal(command.default_member_permissions, "0");
    assert.deepEqual(command.options.map(option => option.name), ["member", "role", "action"]);
    assert.ok(command.options.every(option => option.required));
    const role = command.options.find(option => option.name === "role");
    assert.equal(role.type, 3);
    assert.equal(role.autocomplete, false);
    assert.deepEqual(JSON.parse(JSON.stringify(role.choices)), choices[command.name]);
  }
  assert.equal(definition.options.some(option => option.name === "initialize-commands"), false);
});

function unmappedCommandsFixture() {
  const state = fixture();
  state.commands.length = 0;
  const names = new Set(COMMAND_DEFINITIONS.flatMap(definition => [definition.commandRole, ...definition.roles]));
  for (const [id, role] of state.roleDefinitions) if (names.has(role.name)) state.roleDefinitions.delete(id);
  for (const definition of COMMAND_DEFINITIONS) {
    for (const name of [definition.commandRole, ...definition.roles]) {
      const id = `role-${name}`;
      state.roleDefinitions.set(id, { id, name, editable: true, managed: false, permissions: new PermissionsBitField(0n) });
    }
  }
  return state;
}

test("fresh databases automatically map each division and offer only its own specialist roles", async () => {
  const state = unmappedCommandsFixture();
  assert.equal((await state.service.ensureCommandsConfigured()).length, 4);
  for (const definition of COMMAND_DEFINITIONS) {
    const choices = await state.service.commandRoleChoices(definition.key);
    assert.deepEqual(choices.map(choice => choice.name).sort(), [...definition.roles].sort());
    assert.equal(choices.some(choice => choice.name === definition.commandRole), false);
    const command = state.commands.find(item => item.key === definition.key);
    assert.deepEqual(command.captainDiscordIds, definition.captainDiscordIds);
    assert.equal(command.commandRoleId, `role-${definition.commandRole}`);
    assert.equal(command.updatedBy, "bot");
  }
  assert.equal(state.roleCalls.length, 0);
});

test("Merchant can be added to an existing LOCOPS mapping without replacing Captains or other roles", async () => {
  const state = unmappedCommandsFixture();
  await state.service.ensureCommandsConfigured();
  const mapping = state.commands.find(item => item.key === "locops");
  const merchantId = "role-LOCOPS - Merchant";
  mapping.allowedRoleIds = mapping.allowedRoleIds.filter(id => id !== merchantId);
  mapping.captainDiscordIds = ["configured-captain"];
  const before = structuredClone(state.commands);
  await state.service.addApprovedSpecialistRole("locops", "LOCOPS - Merchant");
  assert.deepEqual(mapping.allowedRoleIds, [...before.find(item => item.key === "locops").allowedRoleIds, merchantId]);
  assert.deepEqual(mapping.captainDiscordIds, ["configured-captain"]);
  assert.deepEqual(state.commands.filter(item => item.key !== "locops"), before.filter(item => item.key !== "locops"));
  assert.ok((await state.service.commandRoleChoices("locops")).some(choice => choice.value === merchantId));
  assert.equal((await state.service.commandRoleChoices("tacops")).some(choice => choice.value === merchantId), false);
  await state.service.addApprovedSpecialistRole("locops", "LOCOPS - Merchant");
  assert.equal(mapping.allowedRoleIds.filter(id => id === merchantId).length, 1);
  assert.equal(state.roleCalls.length, 0);
});

for (const issue of ["missing", "duplicate", "privileged", "managed", "uneditable"]) {
  test(`Merchant mapping rejects an unsafe role: ${issue}`, async () => {
    const state = unmappedCommandsFixture();
    await state.service.ensureCommandsConfigured();
    const mapping = state.commands.find(item => item.key === "locops");
    mapping.allowedRoleIds = mapping.allowedRoleIds.filter(id => id !== "role-LOCOPS - Merchant");
    const before = structuredClone(state.commands);
    const role = state.roleDefinitions.get("role-LOCOPS - Merchant");
    if (issue === "missing") state.roleDefinitions.delete(role.id);
    if (issue === "duplicate") state.roleDefinitions.set("duplicate", { ...role, id: "duplicate" });
    if (issue === "privileged") role.permissions = new PermissionsBitField(PermissionsBitField.Flags.Administrator);
    if (issue === "managed") role.managed = true;
    if (issue === "uneditable") role.editable = false;
    await assert.rejects(state.service.addApprovedSpecialistRole("locops", "LOCOPS - Merchant"));
    assert.deepEqual(state.commands, before);
    assert.equal(state.roleCalls.length, 0);
  });
}

test("specialist maintenance rejects unapproved and cross-division role names", async () => {
  const state = unmappedCommandsFixture();
  await state.service.ensureCommandsConfigured();
  await assert.rejects(state.service.addApprovedSpecialistRole("tacops", "LOCOPS - Merchant"), /not an approved/);
  await assert.rejects(state.service.addApprovedSpecialistRole("locops", "LOCOPS - Command"), /not an approved/);
});

test("automatic command mapping preserves existing mappings and captain bindings across restarts", async () => {
  const state = unmappedCommandsFixture();
  await state.service.ensureCommandsConfigured();
  state.commands[0].captainDiscordIds = ["configured-captain"];
  const before = structuredClone(state.commands);
  assert.deepEqual(await state.createService().ensureCommandsConfigured(), []);
  assert.deepEqual(state.commands, before);
});

for (const definition of COMMAND_DEFINITIONS) {
  test(`${definition.name} Captain can assign a selected specialist from their own division`, async () => {
    const state = unmappedCommandsFixture();
    await state.service.ensureCommandsConfigured();
    const actorId = definition.captainDiscordIds[0] || captainId;
    const mapping = state.commands.find(item => item.key === definition.key);
    state.people.get(actorId).roles.cache.set(mapping.commandRoleId, state.roleDefinitions.get(mapping.commandRoleId));
    const roleId = mapping.allowedRoleIds[0];
    const result = await state.service.assignCommandRole({ actorId, discordId: candidateId, commandKey: definition.key, roleId, action: "ADD" });
    assert.equal(result.status, "COMPLETED");
    assert.equal(state.candidate.roles.cache.has(roleId), true);
    assert.equal(state.candidate.roles.cache.has(mapping.commandRoleId), false);
    assert.deepEqual(state.roleCalls, [["ADD", roleId]]);
  });
}

for (const issue of ["missing", "duplicate", "privileged", "managed", "uneditable"]) {
  test(`unsafe division mapping is skipped without preventing other divisions: ${issue}`, async () => {
    const state = unmappedCommandsFixture();
    const role = state.roleDefinitions.get("role-SPECOPS - Wolfen");
    if (issue === "missing") state.roleDefinitions.delete(role.id);
    if (issue === "duplicate") state.roleDefinitions.set("duplicate", { ...role, id: "duplicate" });
    if (issue === "privileged") role.permissions = new PermissionsBitField(PermissionsBitField.Flags.Administrator);
    if (issue === "managed") role.managed = true;
    if (issue === "uneditable") role.editable = false;
    const results = await state.service.ensureCommandsConfigured();
    assert.equal(state.commands.some(item => item.key === "specops"), false);
    assert.equal(state.commands.length, 3);
    assert.ok(results.some(result => result.startsWith("SPECOPS:") && result.includes("skipped")));
  });
}

test("role suggestions contain only approved roles in the selected command", async () => {
  const state = fixture();
  assert.deepEqual(await state.service.commandRoleChoices("tacops"), [{ name: "TACOPS - Dire Wolfs", value: "dire-wolfs" }]);
  assert.deepEqual(await state.service.commandRoleChoices("locops"), [{ name: "LOCOPS - Mining", value: "mining" }]);
  assert.deepEqual(await state.service.commandRoleChoices("tacops", "MINING"), []);
  assert.deepEqual(await state.service.commandRoleChoices("tacops", "dire"), [{ name: "TACOPS - Dire Wolfs", value: "dire-wolfs" }]);
  assert.deepEqual(await state.service.commandRoleChoices("unknown"), []);
});

test("role suggestions exclude administrative, managed, and uneditable roles", async () => {
  const state = fixture({ privilegedRole: "dire-wolfs" });
  assert.deepEqual(await state.service.commandRoleChoices("tacops"), []);
  const role = state.roleDefinitions.get("mining");
  role.managed = true;
  assert.deepEqual(await state.service.commandRoleChoices("locops"), []);
  role.managed = false;
  role.editable = false;
  assert.deepEqual(await state.service.commandRoleChoices("locops"), []);
});

test("role suggestions require the live Captain's own division or Warlord authority", async () => {
  const state = fixture();
  const locopsCaptain = "173989558877159424";
  assert.equal((await state.service.commandRoleChoices("tacops", "", captainId)).length, 1);
  assert.equal((await state.service.commandRoleChoices("locops", "", locopsCaptain)).length, 1);
  assert.deepEqual(await state.service.commandRoleChoices("tacops", "", locopsCaptain), []);
  state.people.get(locopsCaptain).roles.cache.set("tacops-command", state.roleDefinitions.get("tacops-command"));
  assert.deepEqual(await state.service.commandRoleChoices("tacops", "", locopsCaptain), [], "A command role cannot bypass a named Captain binding");
  assert.deepEqual(await state.service.commandRoleChoices("locops", "", captainId), []);
  assert.deepEqual(await state.service.commandRoleChoices("locops", "", officerId), []);
  assert.equal((await state.service.commandRoleChoices("locops", "", warlordId)).length, 1);
  state.people.get(captainId).roles.cache.delete(PERSONNEL_ROLES.captain);
  assert.deepEqual(await state.service.commandRoleChoices("tacops", "", captainId), []);
});

test("an unnamed command requires both Captain rank and its command role for suggestions", async () => {
  const state = fixture();
  state.commands[0].captainDiscordIds = [];
  assert.deepEqual(await state.service.commandRoleChoices("tacops", "", captainId), []);
  state.people.get(captainId).roles.cache.set("tacops-command", state.roleDefinitions.get("tacops-command"));
  assert.equal((await state.service.commandRoleChoices("tacops", "", captainId)).length, 1);
  state.people.get(captainId).roles.cache.delete(PERSONNEL_ROLES.captain);
  assert.deepEqual(await state.service.commandRoleChoices("tacops", "", captainId), []);
});

test("assignment queues with a parameterized, transaction-scoped lock without returning void", async () => {
  const state = fixture();
  const result = await state.service.assignCommandRole({ actorId: captainId, discordId: candidateId, commandKey: "tacops", roleId: "dire-wolfs", action: "ADD" });
  assert.equal(result.status, "COMPLETED");
  const locks = state.rawQueries.filter(query => query.sql.includes("pg_advisory_xact_lock"));
  assert.equal(locks.length, 1);
  assert.match(locks[0].sql, /^SELECT 1 AS "locked" FROM pg_advisory_xact_lock/);
  assert.deepEqual(locks[0].parameters, [`personnel-command:${guildId}:${candidateId}`]);
  assert.equal(locks[0].inTransaction, true);
});

test("registration updates all division commands without deleting unrelated commands", async () => {
  const commands = new Collection([["personnel-id", { id: "personnel-id", name: "personnel" }], ["locops-id", { id: "locops-id", name: "locops" }], ["other-id", { id: "other-id", name: "marketplace" }]]);
  const edits = [], creates = [];
  const guild = { commands: {
    fetch: async () => commands,
    edit: async (id, definition) => { edits.push(id); commands.set(id, { id, ...definition }); },
    create: async definition => { creates.push(definition.name); commands.set(definition.name, { id: definition.name, ...definition }); },
  } };
  const client = { guilds: { fetch: async id => { assert.equal(id, guildId); return guild; } } };
  const roleChoices = Object.fromEntries(COMMAND_DEFINITIONS.map(command => [command.key, command.roles.map((name, index) => ({ name, value: `${command.key}-role-${index}` }))]));
  const service = { commandRoleChoices: async key => roleChoices[key] };
  await registerPersonnelCommand(client, guildId, service);
  assert.deepEqual(edits, ["personnel-id", "locops-id"]);
  assert.deepEqual(creates, ["tacops", "specops", "arcops"]);
  assert.ok(commands.has("other-id"));
  assert.equal(commands.get("personnel-id").options.some(option => option.name === "assign-role"), false);
  for (const division of COMMAND_DEFINITIONS) {
    const role = commands.find(command => command.name === division.key).options.find(option => option.name === "role");
    assert.equal(role.autocomplete, false);
    assert.deepEqual(JSON.parse(JSON.stringify(role.choices)), roleChoices[division.key]);
  }
  await registerPersonnelCommand(client, guildId, service);
  assert.equal(creates.length, 3, "re-registration must not create duplicates");
});

test("a role lookup failure cannot publish partially prepared division menus", async () => {
  const writes = [];
  const client = { guilds: { fetch: async () => ({ commands: {
    fetch: async () => new Collection(), create: async definition => writes.push(definition), edit: async () => assert.fail("No edits expected"),
  } }) } };
  await assert.rejects(registerPersonnelCommand(client, guildId, { commandRoleChoices: async key => {
    if (key === "specops") throw new Error("Database unavailable");
    return [{ name: "TACOPS - Dire Wolfs", value: "dire-wolfs" }];
  } }), /Database unavailable/);
  assert.deepEqual(writes, []);
});

for (const division of COMMAND_DEFINITIONS) {
  test(`/${division.key} autocomplete and execution are bound to ${division.name}`, async () => {
    const state = unmappedCommandsFixture();
    await state.service.ensureCommandsConfigured();
    const actorId = division.captainDiscordIds[0] || captainId;
    const mapping = state.commands.find(item => item.key === division.key);
    state.people.get(actorId).roles.cache.set(mapping.commandRoleId, state.roleDefinitions.get(mapping.commandRoleId));
    const roleId = mapping.allowedRoleIds[0];
    let handler;
    attachPersonnelInteractions({ on: (_event, callback) => { handler = callback; } }, state.service, { guildId });
    const responses = [], replies = [];
    const interaction = {
      isAutocomplete: () => true, isButton: () => false, isChatInputCommand: () => true,
      commandName: division.key, guildId, user: { id: actorId },
      options: {
        getSubcommand: () => { assert.fail("Division commands have no subcommands"); },
        getFocused: () => ({ name: "role", value: "" }),
        getUser: () => ({ id: candidateId }),
        getString: name => name === "role" ? roleId : name === "action" ? "ADD" : "another-command",
      },
      respond: async choices => responses.push(choices),
      deferReply: async () => { interaction.deferred = true; },
      editReply: async reply => replies.push(reply),
    };
    await handler(interaction);
    assert.deepEqual(responses[0].map(choice => choice.name).sort(), [...division.roles].sort());
    interaction.isAutocomplete = () => false;
    await handler(interaction);
    assert.equal(state.assignments[0].commandKey, division.key);
    assert.equal(state.assignments[0].status, "COMPLETED");
    assert.match(replies[0], /assignment confirmed/);
    assert.deepEqual(state.roleCalls, [["ADD", roleId]]);
    interaction.options.getString = name => name === "role" ? roleId : name === "action" ? "REMOVE" : "another-command";
    await handler(interaction);
    assert.equal(state.assignments[1].status, "COMPLETED");
    assert.equal(state.candidate.roles.cache.has(roleId), false);
  });
}

test("division interactions hide unauthorized choices and refuse cross-command assignments", async () => {
  const state = fixture();
  let handler;
  attachPersonnelInteractions({ on: (_event, callback) => { handler = callback; } }, state.service, { guildId });
  const responses = [], replies = [];
  const interaction = {
    isAutocomplete: () => true, isButton: () => false, isChatInputCommand: () => true,
    commandName: "locops", guildId, user: { id: captainId },
    options: { getFocused: () => ({ name: "role", value: "" }), getUser: () => ({ id: candidateId }), getString: name => name === "role" ? "mining" : "ADD" },
    respond: async value => responses.push(value), deferReply: async () => { interaction.deferred = true; }, editReply: async reply => replies.push(reply),
  };
  await handler(interaction);
  assert.deepEqual(responses, [[]]);
  interaction.isAutocomplete = () => false;
  await handler(interaction);
  assert.match(replies[0].content, /own command/);
  assert.equal(state.assignments.length, 0);
  assert.equal(state.roleCalls.length, 0);
  interaction.guildId = "other-guild";
  await handler(interaction);
  assert.match(replies.at(-1).content, /House Wolf server/);
});

test("database failures do not expose Prisma queries in Discord replies", async () => {
  let handler;
  const replies = [];
  attachPersonnelInteractions({ on: (_event, callback) => { handler = callback; } }, { canUsePersonnelCommands: async () => true, assignCommandRole: async () => { throw Object.assign(new Error("Invalid prisma.$queryRaw invocation with internal SQL details"), { name: "PrismaClientKnownRequestError", code: "P2010" }); } }, { guildId });
  const interaction = {
    isAutocomplete: () => false, isButton: () => false, isChatInputCommand: () => true,
    commandName: "locops", guildId, user: { id: captainId },
    options: { getUser: () => ({ id: candidateId }), getString: name => name === "role" ? "mining" : "ADD" },
    deferReply: async () => { interaction.deferred = true; }, editReply: async reply => replies.push(reply),
  };
  await handler(interaction);
  assert.match(replies[0].content, /database could not complete/);
  assert.doesNotMatch(replies[0].content, /queryRaw|SQL details|P2010/);
});

test("cached personnel autocomplete scopes command roles to the actor without deferring a normal reply", async () => {
  let handler;
  const responses = [];
  const choices = [{ name: "LOCOPS - Mining", value: "mining" }];
  const service = { canUsePersonnelCommands: async () => true, commandRoleChoices: async (commandKey, search, actorId) => {
    assert.equal(commandKey, "locops"); assert.equal(search, "min"); assert.equal(actorId, captainId); return choices;
  } };
  attachPersonnelInteractions({ on: (_event, callback) => { handler = callback; } }, service, { guildId });
  const interaction = {
    isAutocomplete: () => true, commandName: "personnel", guildId, user: { id: captainId },
    options: { getSubcommand: () => "assign-role", getFocused: named => named ? { name: "role", value: "min" } : "min", getString: () => "locops" },
    respond: async value => responses.push(value),
  };
  await handler(interaction);
  assert.deepEqual(responses, [choices]);
  interaction.guildId = "another-server";
  await handler(interaction);
  assert.deepEqual(responses.at(-1), []);
});

test("RSI membership is never inferred from an unconfigured API", async () => {
  assert.equal((await checkPublicRsiMembership("wolf", {})).confirmed, false);
});

test("RSI candidates use exact Discord names, deduplicate case, and never guess from tags or punctuation", () => {
  assert.deepEqual(discordRsiHandleCandidates({ displayName: " Wolf_One ", user: { globalName: "wolf_ONE", username: "wolf-two" } }), ["wolf_one", "wolf-two"]);
  assert.deepEqual(discordRsiHandleCandidates({ displayName: "[HW] Wolf", user: { globalName: "Wolf One", username: "wolf.one" } }), []);
});

test("same-name RSI suggestions do not verify identity, grant roles, or call the external provider", async () => {
  const state = fixture({ founding: true, unverified: true, rsiApiKey: "test-key", membershipLookup: async () => { assert.fail("Autocomplete must not call the provider"); } });
  state.member.rsiHandle = null;
  state.candidate.displayName = "Wolf";
  state.candidate.user.globalName = "WOLF";
  state.candidate.user.username = "wolf_alt";
  const choices = await state.service.rsiHandleChoices(candidateId, "wo");
  assert.deepEqual(choices.map(choice => choice.value), ["wolf", "wolf_alt"]);
  assert.ok(choices.every(choice => choice.name.includes("verify identity")));
  assert.equal(state.member.membershipConfirmedAt, null);
  assert.equal(state.roleCalls.length, 0);
});

test("existing linked RSI identities take precedence over changed Discord names", async () => {
  const state = fixture();
  state.candidate.user.username = "different_user";
  assert.deepEqual(await state.service.rsiHandleChoices(candidateId), [{ name: "wolf (linked RSI handle)", value: "wolf" }]);
  assert.deepEqual(await state.service.rsiHandleChoices(candidateId, "different"), []);
  state.candidate.user.bot = true;
  assert.deepEqual(await state.service.rsiHandleChoices(candidateId), []);
});

test("acceptance automatically checks the selected RSI handle and queues Foundling on confirmed membership", async () => {
  const lookups = [];
  const state = fixture({ founding: true, unverified: true, rsiApiKey: "test-key", membershipLookup: async (handle, options) => {
    lookups.push({ handle, apiKey: options.apiKey });
    return { confirmed: true, evidence: "https://robertsspaceindustries.com/en/citizens/wolf", verifiedAt: new Date("2026-10-22T12:00:00Z") };
  } });
  await state.service.acceptApplication({ actorId: captainId, discordId: candidateId, rsiHandle: "Wolf", evidence: "Officer verified this Discord member's RSI identity and application" });
  assert.deepEqual(lookups, [{ handle: "wolf", apiKey: "test-key" }]);
  assert.equal(state.member.membershipVerifiedBy, "RSI_PUBLIC_PROVIDER");
  assert.ok(state.member.membershipConfirmedAt);
  assert.equal(state.request.status, "COMPLETED");
  assert.equal(state.candidate.roles.cache.has(PERSONNEL_ROLES.foundling), true);
  assert.equal(state.candidate.roles.cache.has(PERSONNEL_ROLES.visitor), false);
  const audit = state.audits.find(event => event.action === "APPLICATION_ACCEPTED");
  assert.equal(audit.details.identityAttestedBy, captainId);
  assert.equal(audit.details.automaticallyConfirmed, true);
  assert.match(audit.details.membershipEvidence, /citizens\/wolf$/);
});

for (const scenario of ["unconfigured", "not-confirmed", "provider-failure"]) {
  test(`automatic RSI lookup leaves the accepted application pending without granting membership: ${scenario}`, async () => {
    const state = fixture({ founding: true, unverified: true, rsiApiKey: scenario === "unconfigured" ? undefined : "test-key", membershipLookup: async () => {
      if (scenario === "unconfigured") assert.fail("No API calls without a configured key");
      if (scenario === "provider-failure") throw new Error("Provider unavailable");
      return { confirmed: false, reason: "UNVERIFIED_OR_STALE_RESPONSE" };
    } });
    await state.service.acceptApplication({ actorId: captainId, discordId: candidateId, rsiHandle: "wolf", evidence: "Officer verified application and identity" });
    assert.ok(state.member.applicationAcceptedAt);
    assert.equal(state.member.membershipConfirmedAt, null);
    assert.equal(state.roleCalls.length, 0);
    assert.equal(state.audits.find(event => event.action === "APPLICATION_ACCEPTED").details.automaticallyConfirmed, false);
  });
}

test("manual officer membership confirmation remains available without calling the provider", async () => {
  const state = fixture({ founding: true, unverified: true, rsiApiKey: "test-key", membershipLookup: async () => { assert.fail("Manual evidence does not need a provider lookup"); } });
  await state.service.acceptApplication({ actorId: captainId, discordId: candidateId, rsiHandle: "wolf", evidence: "Officer verified RSI membership directly", rsiConfirmed: true });
  assert.equal(state.member.membershipVerifiedBy, captainId);
  assert.equal(state.request.status, "COMPLETED");
});

test("a name suggestion cannot overwrite an existing RSI identity", async () => {
  const state = fixture({ rsiApiKey: "test-key", membershipLookup: async () => { assert.fail("Conflicting identities must be rejected before lookup"); } });
  await assert.rejects(state.service.acceptApplication({ actorId: captainId, discordId: candidateId, rsiHandle: "otherwolf", evidence: "Application identity evidence" }), /already linked/);
  assert.equal(state.member.rsiHandle, "wolf");
  assert.equal(state.roleCalls.length, 0);
});

test("removed accept-application autocomplete cannot look up RSI identities", async () => {
  let handler;
  const responses = [];
  attachPersonnelInteractions({ on: (_event, callback) => { handler = callback; } }, { canUsePersonnelCommands: async () => true, rsiHandleChoices: async () => { assert.fail("Removed command must not look up identities"); } }, { guildId });
  const interaction = { isAutocomplete: () => true, commandName: "personnel", guildId, user: { id: officerId },
    options: { getSubcommand: () => "accept-application", getFocused: () => ({ name: "rsi-handle", value: "wo" }), getUser: () => ({ id: candidateId }) },
    respond: async value => responses.push(value),
  };
  await handler(interaction);
  interaction.options.getUser = () => null;
  await handler(interaction);
  assert.deepEqual(responses, [[], []]);
  assert.equal(personnelCommandDefinition().options.some(option => option.name === "accept-application"), false);
});

test("a cached removed accept-application command cannot change membership or roles", async () => {
  let handler;
  const replies = [];
  attachPersonnelInteractions({ on: (_event, callback) => { handler = callback; } }, { canUsePersonnelCommands: async () => true, acceptApplication: async () => { assert.fail("Removed command must not accept applications"); } }, { guildId });
  await handler({ isAutocomplete: () => false, isButton: () => false, isChatInputCommand: () => true, commandName: "personnel", guildId, user: { id: officerId },
    options: { getSubcommand: () => "accept-application" }, deferReply: async () => {}, editReply: async message => replies.push(message) });
  assert.match(replies[0], /removed/);
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

test("RSI verifier supports the real nested v2 primary-organization response", async () => {
  const now = new Date("2026-10-22T12:00:00Z");
  const result = await checkPublicRsiMembership("wolf", { apiKey: "test-key", now, fetcher: async () => Response.json({
    success: true, updatedAt: now.toISOString(), data: { profile: { handle: "Wolf" }, organization: { affiliations: [], organization: { info: { sid: "CUTTERWOLF", name: "House Wolf" } } } },
  }) });
  assert.equal(result.confirmed, true);
  assert.equal(result.primaryOrganizationSid, "CUTTERWOLF");
});

test("RSI affiliation membership never substitutes for CUTTERWOLF primary membership", async () => {
  const now = new Date("2026-10-22T12:00:00Z");
  for (const primary of [{ info: { sid: "OTHERORG" } }, null]) {
    const result = await checkPublicRsiMembership("wolf", { apiKey: "test-key", now, fetcher: async () => Response.json({
      success: true, updatedAt: now.toISOString(), data: { profile: { handle: "Wolf" }, organization: { affiliations: [{ sid: "CUTTERWOLF" }], organization: primary } },
    }) });
    assert.equal(result.confirmed, false);
    assert.equal(result.reason, "PRIMARY_ORGANIZATION_MISMATCH");
  }
});

test("RSI verifier refuses conflicting flat and nested primary organizations", async () => {
  const now = new Date("2026-10-22T12:00:00Z");
  const result = await checkPublicRsiMembership("wolf", { apiKey: "test-key", now, fetcher: async () => Response.json({
    success: true, updatedAt: now.toISOString(), data: { profile: { handle: "Wolf" }, organization: { sid: "CUTTERWOLF", organization: { info: { sid: "OTHERORG" } } } },
  }) });
  assert.equal(result.confirmed, false);
  assert.equal(result.reason, "CONFLICTING_ORGANIZATION_RESPONSE");
});

test("verified RSI membership repairs Foundling and both base roles without changing tenure", async () => {
  const state = fixture({ websiteUser: true });
  state.candidate.roles.cache.delete(PERSONNEL_ROLES.foundling);
  state.candidate.roles.cache.delete(PERSONNEL_ROLES.member);
  state.candidate.roles.cache.delete(PERSONNEL_ROLES.houseWolf);
  state.candidate.roles.cache.set(PERSONNEL_ROLES.visitor, {});
  const since = state.member.rankSince;
  await state.service.reconcileRsiMember(state.member);
  for (const id of [PERSONNEL_ROLES.foundling, PERSONNEL_ROLES.member, PERSONNEL_ROLES.houseWolf]) assert.ok(state.candidate.roles.cache.has(id));
  assert.equal(state.candidate.roles.cache.has(PERSONNEL_ROLES.visitor), false);
  assert.equal(state.member.rankSince, since);
  assert.equal(state.sent.length, 0);
});
test("RSI role repair preserves higher service and officer ranks without adding Foundling", async () => {
  for (const role of [PERSONNEL_ROLES.rallyMaster, PERSONNEL_ROLES.captain]) {
    const state = fixture(); state.candidate.roles.cache.clear(); state.candidate.roles.cache.set(role, {});
    await state.service.reconcileRsiMember(state.member);
    assert.ok(state.candidate.roles.cache.has(role));
    assert.ok(state.candidate.roles.cache.has(PERSONNEL_ROLES.member));
    assert.ok(state.candidate.roles.cache.has(PERSONNEL_ROLES.houseWolf));
    assert.equal(state.candidate.roles.cache.has(PERSONNEL_ROLES.foundling), false);
  }
});
test("RSI role repair refuses unconfirmed membership and preflights all missing roles", async () => {
  const unverified = fixture({ unverified: true }); await unverified.service.reconcileRsiMember(unverified.member);
  assert.equal(unverified.roleCalls.length, 0);
  const state = fixture(); state.candidate.roles.cache.delete(PERSONNEL_ROLES.member);
  state.roleDefinitions.get(PERSONNEL_ROLES.member).editable = false;
  await assert.rejects(state.service.reconcileRsiMember(state.member), /cannot manage/);
  assert.equal(state.roleCalls.length, 0);
});
test("new RSI members use the existing Foundling order and announcement", async () => {
  const state = fixture({ founding: true }); await state.service.reconcileRsiMember(state.member);
  assert.equal(state.request.status, "COMPLETED");
  for (const id of [PERSONNEL_ROLES.foundling, PERSONNEL_ROLES.member, PERSONNEL_ROLES.houseWolf]) assert.ok(state.candidate.roles.cache.has(id));
  assert.equal(state.candidate.roles.cache.has(PERSONNEL_ROLES.visitor), false);
  assert.equal(state.candidate.roles.cache.has("buyer"), false);
  assert.equal(state.sent.length, 1);
});
test("an unrecorded higher live rank never queues a Foundling order", async () => {
  const state = fixture({ founding: true }); state.candidate.roles.cache.set(PERSONNEL_ROLES.rallyMaster, {});
  await state.service.considerMember(state.member);
  assert.equal(state.options.createdRequest, undefined); assert.equal(state.roleCalls.length, 0);
});
test("a nonexistent RSI name is unconfirmed rather than a transient provider failure", async () => {
  const result = await checkPublicRsiMembership("unknown", { apiKey: "test", fetcher: async () => new Response(null, { status: 404 }) });
  assert.equal(result.confirmed, false); assert.equal(result.reason, "RSI_HANDLE_NOT_FOUND");
});

test("routine RSI verification uses the free cache endpoint with all freshness and identity checks intact", async () => {
  const now = new Date("2026-10-23T01:35:00Z");
  let requested;
  const result = await checkPublicRsiMembership("talon_graves", { apiKey: "test-only-key", now, fetcher: async (url, options) => {
    requested = new URL(url);
    assert.equal(options.headers["x-api-key"], "test-only-key");
    return Response.json({ success: true, updatedAt: "2026-10-23T01:21:19Z", data: { profile: { handle: "Talon_Graves" }, organization: { organization: { info: { sid: "CUTTERWOLF" } } } } });
  } });
  assert.equal(requested.pathname, "/v2/users/talon_graves");
  assert.equal(requested.search, "");
  assert.equal(result.confirmed, true);
});

test("only the four configured command roles qualify, using live roles and excluding bots", async () => {
  assert.deepEqual(PERSONNEL_COMMAND_ROLE_IDS, ["1182799457650233465", "1318668938854273077", "1308253899357950034", "1318673103424852092"]);
  const state = fixture();
  for (const id of PERSONNEL_COMMAND_ROLE_IDS) {
    state.candidate.roles.cache.clear(); state.candidate.roles.cache.set(id, {});
    assert.equal(await state.service.canUsePersonnelCommands(candidateId), true);
  }
  for (const id of [...Object.values(PERSONNEL_ROLES).filter(id => !PERSONNEL_COMMAND_ROLE_IDS.includes(id)), "cosmetic"]) {
    state.candidate.roles.cache.clear(); state.candidate.roles.cache.set(id, {});
    assert.equal(await state.service.canUsePersonnelCommands(candidateId), false);
  }
  state.candidate.roles.cache.set(PERSONNEL_ROLES.captain, {}); state.candidate.user.bot = true;
  assert.equal(await state.service.canUsePersonnelCommands(candidateId), false);
});

test("cached commands and autocomplete cannot bypass the live command-role gate", async () => {
  let handler;
  const replies = [], responses = [];
  attachPersonnelInteractions({ on: (_event, callback) => { handler = callback; } }, {
    canUsePersonnelCommands: async () => false,
    assignCommandRole: async () => assert.fail("Unauthorized command must not reach assignments"),
    commandRoleChoices: async () => assert.fail("Unauthorized autocomplete must not disclose roles"),
  }, { guildId });
  const interaction = { isAutocomplete: () => false, isButton: () => false, isChatInputCommand: () => true, commandName: "locops", guildId,
    user: { id: candidateId }, deferReply: async () => { interaction.deferred = true; }, editReply: async message => replies.push(message), respond: async choices => responses.push(choices) };
  await handler(interaction); assert.match(replies[0].content, /Leadership Core, Fleet Commander, Captain, or Lieutenant/);
  interaction.isAutocomplete = () => true;
  await handler(interaction); assert.deepEqual(responses, [[]]);
});
