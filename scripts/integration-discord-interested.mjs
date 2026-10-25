import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createAuthorizer, CommandError } from "../lib/command/access.js";
import { createOperationService } from "../lib/command/operations.js";
import { createCrewService } from "../lib/command/crewService.js";
import { createDiscordInterestService } from "../lib/command/discordInterestService.js";
import { createDiscordOAuthUser } from "../lib/authDiscordIdentity.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";

const database = process.env.COMMAND_TEST_DATABASE_URL;
const url = new URL(database || "https://refuse.invalid");
if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.pathname !== "/housewolf_command_test") throw new Error("Use only the named disposable loopback database.");
const prisma = new PrismaClient({ datasourceUrl: database });
const guildId = `interested-${randomUUID()}`, officer = randomUUID(), member = randomUUID();
const snow = () => String(900000000000000000n + BigInt(`0x${randomUUID().replaceAll("-", "").slice(0, 12)}`));
const officerDiscord = snow(), memberDiscord = snow();
const people = new Map([[officerDiscord, { username: "TestOfficer", roles: [PERSONNEL_ROLES.lieutenant] }], [memberDiscord, { username: "TestMember", roles: [PERSONNEL_ROLES.member] }]]);
const rosters = new Map();
let reads = 0, upstreamError = null, schedule = 0;
const discord = async path => {
  if (path.includes("/members/")) {
    const id = path.split("/members/")[1], person = people.get(id);
    return person ? { user: { id, username: person.username }, roles: person.roles } : null;
  }
  reads++;
  if (upstreamError) throw upstreamError;
  const eventId = /scheduled-events\/([^/?]+)/.exec(path)?.[1];
  if (!path.includes("/users?")) return { id: eventId, guild_id: guildId, status: 1 };
  return (rosters.get(eventId) || []).map(id => ({ guild_scheduled_event_id: eventId, user: { id, username: people.get(id).username }, member: { nick: people.get(id).username, roles: people.get(id).roles } }));
};
const authorize = createAuthorizer({ guildId, loadAccount: id => prisma.user.findUnique({ where: { id } }), loadMember: async (guild, id) => { const record = await discord(`/guilds/${guild}/members/${id}`); return record ? { guildId: guild, userId: id, roleIds: record.roles } : null; } });
const operations = createOperationService({ prisma, authorize, preflight: async () => true, baseUrl: "https://fixture.invalid", staffingEnabled: true });
const interests = createDiscordInterestService({ prisma, authorize, discord });
const crew = createCrewService({ prisma, authorize, interests, advanced: true });
const raw = { title: "Interested fixture", description: "Local fake Discord", entityType: "EXTERNAL", location: "Fixture", timezone: "UTC", startLocal: "2099-01-01T10:00", endLocal: "2099-01-01T12:00", visibility: "GUILD", recurrence: "NONE" };
async function operation() {
  const day = ++schedule;
  const draft = await operations.create(officer, { ...raw, startLocal: `2099-02-${String(day).padStart(2, "0")}T10:00`, endLocal: `2099-02-${String(day).padStart(2, "0")}T12:00` }, randomUUID());
  const published = await operations.mutate(officer, draft.id, "publish", draft.revision);
  return prisma.commandOperation.update({ where: { id: published.id }, data: { nativeEventId: snow() } });
}
async function change(op, action, input) { const current = await prisma.commandOperation.findUnique({ where: { id: op.id } }); return crew.mutate(officer, op.id, action, current.crewRevision, input); }
async function seat(op, requiredCode = "") { await change(op, "addSeat", { label: `Seat-${randomUUID()}`, role: "GROUND", requiredCode }); return prisma.commandSeat.findFirst({ where: { operationId: op.id }, orderBy: { id: "desc" } }); }
async function interested(op) {
  const id = snow(); people.set(id, { username: `DiscordWolf-${id}`, roles: [PERSONNEL_ROLES.member] });
  rosters.set(op.nativeEventId, [id]); await interests.refresh(officer, op.id); return id;
}
before(async () => { await prisma.user.createMany({ data: [{ id: officer, discordId: officerDiscord, discordUsername: "InterestedOfficer" }, { id: member, discordId: memberDiscord, discordUsername: "InterestedMember" }] }); });
after(async () => {
  const users = await prisma.user.findMany({ where: { discordId: { in: [...people.keys()] } }, select: { id: true } }), ids = users.map(user => user.id);
  const ops = await prisma.commandOperation.findMany({ where: { guildId }, select: { id: true } }), opIds = ops.map(op => op.id);
  await prisma.commandCrewAssignment.deleteMany({ where: { operationId: { in: opIds } } });
  await prisma.commandSeat.deleteMany({ where: { operationId: { in: opIds } } });
  await prisma.commandOperationWaitlist.deleteMany({ where: { operationId: { in: opIds } } });
  await prisma.commandSignup.deleteMany({ where: { operationId: { in: opIds } } });
  await prisma.commandOperationPlan.deleteMany({ where: { operationId: { in: opIds } } });
  await prisma.commandDelivery.deleteMany({ where: { operationId: { in: opIds } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: ids } }, { targetId: { in: opIds } }] } });
  await prisma.siteSetting.deleteMany({ where: { key: { startsWith: `command:${guildId}:` } } });
  await prisma.commandOperation.deleteMany({ where: { guildId } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } }); await prisma.$disconnect();
});

test("Discord-only Interested members can be assigned and released with history and no website login", async () => {
  const op = await operation(), position = await seat(op), id = await interested(op);
  assert.equal(await prisma.user.count({ where: { discordId: id } }), 0, "Pulling interest creates no account");
  assert.equal(await prisma.commandSignup.count({ where: { operationId: op.id } }), 0, "Pulling interest creates no commitment");
  assert.ok((await crew.view(officer, op.id)).candidates.some(person => person.userId === `discord:${id}` && person.source === "DISCORD_INTERESTED"));
  await change(op, "assign", { seatId: position.id, userId: `discord:${id}`, reason: "Manager confirms Discord Interested medic" });
  const identity = await prisma.user.findUnique({ where: { discordId: id } });
  assert.equal(identity.lastLoginAt, null);
  assert.equal(await prisma.account.count({ where: { userId: identity.id } }), 0);
  assert.equal(await prisma.session.count({ where: { userId: identity.id } }), 0);
  assert.equal((await prisma.commandSignup.findUnique({ where: { operationId_userId: { operationId: op.id, userId: identity.id } } })).source, "DISCORD_INTERESTED");
  const assignment = await prisma.commandCrewAssignment.findFirst({ where: { operationId: op.id, userId: identity.id, releasedAt: null } });
  assert.ok(assignment);
  await change(op, "release", { assignmentId: assignment.id, reason: "Did not show up" });
  const history = await prisma.commandCrewAssignment.findUnique({ where: { id: assignment.id } });
  assert.ok(history.releasedAt); assert.equal(history.releaseReason, "Did not show up");
  const login = await createDiscordOAuthUser(prisma, { discordId: id, discordUsername: "RenamedWolf", discordDisplayName: "Wolf" });
  assert.equal(login.id, identity.id, "Later OAuth uses the same crew identity");
  await operations.signup(identity.id, op.id, "COMMITTED", "MEDIC");
  assert.equal((await prisma.commandSignup.findUnique({ where: { operationId_userId: { operationId: op.id, userId: identity.id } } })).source, "WEBSITE");
});
test("only managers can pull the linked roster; ordinary members cannot see Discord candidates", async () => {
  const op = await operation(), id = await interested(op), start = reads;
  await assert.rejects(interests.refresh(member, op.id), error => error.status === 403);
  assert.equal(reads, start);
  assert.ok(!(await crew.view(member, op.id)).candidates.some(person => person.userId === `discord:${id}`));
  const otherOfficer = await prisma.user.create({ data: { discordId: snow(), discordUsername: "OtherInterestedOfficer" } });
  people.set(otherOfficer.discordId, { username: "OtherOfficer", roles: [PERSONNEL_ROLES.lieutenant] });
  await assert.rejects(interests.refresh(otherOfficer.id, op.id), error => error.code === "MANAGER_REQUIRED");
});
test("interest removal, suspended identities and website withdrawal cannot be bypassed by forged choices", async () => {
  for (const kind of ["removed", "suspended", "withdrawn"]) {
    const op = await operation(), position = await seat(op), id = await interested(op);
    if (kind === "removed") rosters.set(op.nativeEventId, []);
    else { const user = await prisma.user.create({ data: { discordId: id, discordUsername: kind, isActive: kind !== "suspended" } }); if (kind === "withdrawn") await operations.signup(user.id, op.id, "WITHDRAWN", "Cannot attend"); }
    await assert.rejects(change(op, "assign", { seatId: position.id, userId: `discord:${id}`, reason: "Must reject" }));
    assert.equal(await prisma.commandCrewAssignment.count({ where: { operationId: op.id } }), 0);
  }
});
test("Interested assignment obeys qualifications, capacity and FIFO and rolls back provisional identities", async () => {
  for (const kind of ["qualification", "capacity", "waitlist"]) {
    const op = await operation(), position = await seat(op, kind === "qualification" ? "MEDIC" : ""), id = await interested(op);
    if (kind !== "qualification") {
      await prisma.commandOperationPlan.create({ data: { operationId: op.id, capacity: kind === "capacity" ? 1 : 2, updatedById: officer } });
      await operations.signup(member, op.id, "COMMITTED", "GROUND");
      if (kind === "waitlist") { await operations.signup(officer, op.id, "RESERVE", "GROUND"); await prisma.commandOperationWaitlist.create({ data: { operationId: op.id, userId: officer } }); }
    }
    await assert.rejects(change(op, "assign", { seatId: position.id, userId: `discord:${id}`, reason: "Cannot bypass eligibility" }), error => error.code === { qualification: "QUALIFICATION_REQUIRED", capacity: "CAPACITY_FULL", waitlist: "WAITLIST_ORDER" }[kind]);
    assert.equal(await prisma.user.count({ where: { discordId: id } }), 0);
    assert.equal(await prisma.commandCrewAssignment.count({ where: { operationId: op.id } }), 0);
  }
});
test("roster pulls are throttled; provider failure preserves the last roster and honors retry delay", async () => {
  const op = await operation(), id = await interested(op), start = reads;
  assert.equal((await interests.refresh(officer, op.id)).cached, true);
  assert.equal(reads, start);
  const settingKey = `command:${guildId}:interested:${op.id}`, saved = await prisma.siteSetting.findUnique({ where: { key: settingKey } });
  await prisma.siteSetting.update({ where: { key: settingKey }, data: { value: { ...saved.value, nextRefreshAt: "2000-01-01T00:00:00Z" } } });
  upstreamError = Object.assign(new CommandError(503, "DISCORD_RATE_LIMITED", "Limited"), { retryAfter: 120 });
  const began = Date.now();
  try { await assert.rejects(interests.refresh(officer, op.id), error => error.code === "DISCORD_RATE_LIMITED"); } finally { upstreamError = null; }
  const retained = await prisma.siteSetting.findUnique({ where: { key: settingKey } });
  assert.ok(retained.value.members.some(person => person.discordId === id));
  assert.ok(Date.parse(retained.value.nextRefreshAt) >= began + 120000);
});
