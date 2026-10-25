import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createAuthorizer, CommandError } from "../lib/command/access.js";
import { createAttendanceMembers } from "../lib/command/attendanceMembers.js";
import { createAttendanceService } from "../lib/command/attendanceService.js";
import { createDiscordOAuthUser } from "../lib/authDiscordIdentity.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";

const database = new URL(process.env.COMMAND_TEST_DATABASE_URL || "https://refuse.invalid");
if (!["127.0.0.1", "localhost", "[::1]"].includes(database.hostname) || database.pathname !== "/housewolf_command_test") throw new Error("Use only the named disposable loopback database.");
const prisma = new PrismaClient({ datasourceUrl: database.toString() });
const guildId = `discord-attendance-${randomUUID()}`, manager = randomUUID(), observer = randomUUID();
const people = new Map(), reads = [];
let providerFailure = null, revokedId = null, revokedReads = 0;
const snow = () => String(800000000000000000n + BigInt(`0x${randomUUID().replaceAll("-", "").slice(0, 12)}`));
function person(overrides = {}) {
  const id = snow();
  people.set(id, { user: { id, username: `wolf-${id}` }, nick: "Walk-in Wolf", roles: [PERSONNEL_ROLES.member], ...overrides });
  return id;
}
const managerDiscord = person({ roles: [PERSONNEL_ROLES.lieutenant] }), observerDiscord = person({ roles: [PERSONNEL_ROLES.lieutenant] });
async function discord(path) {
  reads.push(path);
  if (!path.startsWith(`/guilds/${guildId}/members/`)) return null;
  if (providerFailure && path.includes("/search?")) throw providerFailure;
  if (path.includes("/search?")) {
    const query = new URL(`https://fixture.invalid${path}`).searchParams.get("query").toLowerCase();
    return [...people.values()].filter(row => row.user.username.toLowerCase().startsWith(query) || row.nick?.toLowerCase().startsWith(query)).slice(0, 30);
  }
  const id = path.split("/members/")[1];
  if (id === revokedId && ++revokedReads > 1) return null;
  return people.get(id) || null;
}
const authorize = createAuthorizer({ guildId, loadAccount: id => prisma.user.findUnique({ where: { id } }), loadMember: async (guild, id) => {
  const row = await discord(`/guilds/${guild}/members/${id}`);
  return row ? { guildId: guild, userId: row.user.id, roleIds: row.roles } : null;
} });
const members = createAttendanceMembers({ prisma, discord });
const service = createAttendanceService({ prisma, authorize, members });
const entry = id => ({ userId: `discord:${id}`, status: "PRESENT" });
async function operation(state = "ACTIVE", guild = guildId) {
  return prisma.commandOperation.create({ data: { guildId: guild, creatorId: manager, requestKey: randomUUID(), state, input: { visibility: "GUILD", recurrence: "NONE" } } });
}
async function save(op, entries, revision = 0, action = "saveAttendance") {
  return service.mutate(manager, op.id, action, revision, { reason: "Observed walk-in participation", entries });
}
before(async () => { await prisma.user.createMany({ data: [{ id: manager, discordId: managerDiscord, discordUsername: "Manager" }, { id: observer, discordId: observerDiscord, discordUsername: "Observer" }] }); });
after(async () => {
  const ops = await prisma.commandOperation.findMany({ where: { guildId: { in: [guildId, `${guildId}-foreign`] } }, select: { id: true } }), ids = ops.map(op => op.id);
  for (const table of ["commandDebriefRevision", "commandAttendance", "commandDebrief"]) await prisma[table].deleteMany({ where: { operationId: { in: ids } } });
  await prisma.auditLog.deleteMany({ where: { targetId: { in: ids } } });
  await prisma.commandOperation.deleteMany({ where: { id: { in: ids } } });
  await prisma.user.deleteMany({ where: { discordId: { in: [...people.keys()] } } });
  await prisma.$disconnect();
});

test("Discord search finds unregistered members and excludes bots, ineligible and suspended identities without creating users", async () => {
  const op = await operation(), id = person();
  person({ user: { id: snow(), username: "bot", bot: true } });
  person({ roles: [] }); person({ pending: true });
  const suspended = person(); await prisma.user.create({ data: { discordId: suspended, discordUsername: "Suspended", isActive: false } });
  const scope = { discordId: { in: [...people.keys()] } };
  const before = await prisma.user.count({ where: scope });
  const results = await service.directory(manager, op.id, "Walk-in");
  assert.ok(results.some(row => row.id === `discord:${id}` && row.name === "Walk-in Wolf" && row.username === people.get(id).user.username));
  assert.ok(!results.some(row => row.id === `discord:${suspended}`));
  assert.equal(results.filter(row => row.id.startsWith("discord:")).length, 1);
  assert.equal(await prisma.user.count({ where: scope }), before);
  assert.ok(reads.some(path => path.includes("/members/search?query=Walk-in&limit=30")));
  assert.equal((await service.directory(manager, op.id, `<@${id}>`))[0].id, `discord:${id}`);
  await assert.rejects(service.directory(observer, op.id, "Walk-in"), error => error.code === "MANAGER_REQUIRED");
  await assert.rejects(service.directory(manager, (await operation("ACTIVE", `${guildId}-foreign`)).id, "Walk-in"), error => error.status === 404);
  await assert.rejects(service.directory(manager, op.id, ""));
});

test("Discord-only attendance saves without signup or login and survives later OAuth registration", async () => {
  const op = await operation(), id = person();
  await save(op, [entry(id)]);
  const identity = await prisma.user.findUnique({ where: { discordId: id } });
  assert.equal(identity.lastLoginAt, null);
  assert.equal(await prisma.account.count({ where: { userId: identity.id } }), 0);
  assert.equal(await prisma.commandSignup.count({ where: { operationId: op.id } }), 0);
  assert.equal((await service.view(manager, op.id)).entries[0].userId, identity.id);
  assert.equal((await service.statistics(identity.id)).operations, 0);
  await prisma.commandOperation.update({ where: { id: op.id }, data: { state: "COMPLETED" } });
  await save(op, [{ userId: identity.id, status: "PRESENT" }], 1, "finalizeAttendance");
  const loggedIn = await createDiscordOAuthUser(prisma, { discordId: id, discordUsername: "RenamedWolf" });
  assert.equal(loggedIn.id, identity.id);
  assert.equal((await service.statistics(loggedIn.id)).present, 1);
  assert.equal((await service.view(loggedIn.id, op.id)).entries[0].status, "PRESENT");
  assert.equal((await service.view(manager, op.id)).history.length, 2);
});

test("forged, departed, bot, nonmember and suspended Discord choices cannot record attendance", async () => {
  const suspended = person(); await prisma.user.create({ data: { discordId: suspended, discordUsername: "Suspended", isActive: false } });
  const bot = person(); people.get(bot).user.bot = true;
  for (const id of [snow(), bot, person({ roles: [] }), person({ pending: true }), suspended]) {
    const op = await operation();
    await assert.rejects(save(op, [entry(id)]));
    assert.equal(await prisma.commandDebrief.count({ where: { operationId: op.id } }), 0);
  }
});

test("the same person submitted by UUID and Discord ID is rejected and keeps the previous roster", async () => {
  const op = await operation(), id = person();
  await save(op, [entry(id)]);
  const identity = await prisma.user.findUnique({ where: { discordId: id } });
  await assert.rejects(save(op, [entry(id), { userId: identity.id, status: "ABSENT" }], 1), error => error.code === "INVALID_ATTENDANCE");
  assert.equal((await service.view(manager, op.id)).revision, 1);
  assert.equal((await service.view(manager, op.id)).entries[0].status, "PRESENT");
});

test("revocation before commit rolls back new identity, attendance and history", async () => {
  const op = await operation(), id = person(); revokedId = id; revokedReads = 0;
  try { await assert.rejects(save(op, [entry(id)]), error => error.code === "INVALID_PARTICIPANT"); }
  finally { revokedId = null; }
  assert.equal(await prisma.user.count({ where: { discordId: id } }), 0);
  assert.equal(await prisma.commandDebrief.count({ where: { operationId: op.id } }), 0);
  assert.equal(await prisma.commandDebriefRevision.count({ where: { operationId: op.id } }), 0);
});

test("provider failure preserves prior attendance and exposes a retryable error", async () => {
  const op = await operation(), id = person(); await save(op, [entry(id)]);
  providerFailure = new CommandError(503, "DISCORD_RATE_LIMITED", "Discord limited");
  try { await assert.rejects(service.directory(manager, op.id, "Walk-in"), error => error.code === "DISCORD_RATE_LIMITED"); }
  finally { providerFailure = null; }
  assert.equal((await service.view(manager, op.id)).revision, 1);
});
