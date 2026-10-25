import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createAuthorizer } from "../lib/command/access.js";
import { createAttendanceService } from "../lib/command/attendanceService.js";
import { createOperationAarWorker } from "../bot/operationAar.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";

const database = new URL(process.env.COMMAND_TEST_DATABASE_URL || "https://refuse.invalid");
if (!["127.0.0.1", "localhost", "[::1]"].includes(database.hostname) || database.pathname !== "/housewolf_command_test") throw new Error("Use only the named disposable loopback database.");
const prisma = new PrismaClient({ datasourceUrl: database.toString() });
const guildId = `aar-${randomUUID()}`, manager = randomUUID(), reviewer = randomUUID(), member = randomUUID();
const users = [manager, reviewer, member], roles = new Map(users.map(id => [id, [id === member ? PERSONNEL_ROLES.member : PERSONNEL_ROLES.lieutenant]]));
const authorize = createAuthorizer({ guildId, loadAccount: id => prisma.user.findUnique({ where: { id } }), loadMember: async (guild, discordId) => {
  const user = await prisma.user.findUnique({ where: { discordId } });
  return user ? { guildId: guild, userId: discordId, roleIds: roles.get(user.id) || [] } : null;
} });
const service = createAttendanceService({ prisma, authorize, aarEnabled: true });
const channel = "900000000000000001", remote = [], calls = [];
let postFailure = null, acceptThenFail = false;
const discord = {
  get: async path => path.includes("/messages?") ? remote : path.startsWith("/channels/") ? { guild_id: guildId, type: 0 }
    : path.endsWith("/roles") ? [{ id: guildId, permissions: "84992" }] : path === "/users/@me" ? { id: "bot" } : { user: { id: "bot" }, roles: [guildId] },
  async post(path, body) {
    calls.push(["POST", path, body]);
    if (postFailure && !acceptThenFail) throw postFailure;
    const message = { id: String(900000000000000010n + BigInt(remote.length)), author: { id: "bot" }, ...body }; remote.push(message);
    if (postFailure) throw postFailure;
    return message;
  },
  async patch(path, body) {
    calls.push(["PATCH", path, body]);
    const message = remote.find(row => path.endsWith(`/${row.id}`));
    if (!message) throw Object.assign(new Error("Missing message"), { status: 404 });
    Object.assign(message, body); return message;
  },
};
const env = { NEXTAUTH_URL: "https://fixture.invalid", DISCORD_AAR_CHANNEL_ID: channel, COMMAND_AAR_DELIVERY_ENABLED: "true", COMMAND_ATTENDANCE_ENABLED: "true", COMMAND_DASHBOARD_ENABLED: "true", COMMAND_DISCORD_DELIVERY_ENABLED: "true" };
const worker = (overrides = {}) => createOperationAarWorker({ prisma, authorize, discord, guildId, env: { ...env, ...overrides } });
async function operation(visibility = "GUILD") { return prisma.commandOperation.create({ data: { guildId, creatorId: manager, requestKey: randomUUID(), state: "COMPLETED", input: { title: "Fixture @everyone", visibility, recurrence: "NONE" } } }); }
async function mutate(op, action, input = {}, actor = manager, source = service) {
  const report = await prisma.commandDebrief.findUnique({ where: { operationId: op.id } });
  return source.mutate(actor, op.id, action, report?.revision || 0, { reason: "AAR delivery fixture", ...input });
}
async function approve(op, summary = "Approved summary") {
  await mutate(op, "saveReport", { summary, privateNotes: "PRIVATE OFFICER EVIDENCE" });
  await mutate(op, "reviewReport", {}, reviewer);
}
async function deliver(op, w = worker()) {
  // Isolate a job from other fixtures, without bypassing row lease behavior.
  await prisma.commandAarDelivery.updateMany({ where: { operationId: { not: op.id }, status: "PENDING" }, data: { availableAt: new Date("2099-01-01") } });
  const job = await w.claim(); assert.equal(job.operationId, op.id); await w.processJob(job);
  return prisma.commandAarDelivery.findUnique({ where: { operationId: op.id } });
}
before(async () => { await prisma.user.createMany({ data: users.map(id => ({ id, discordId: `aar-${id}`, discordUsername: id })) }); });
after(async () => {
  const ops = await prisma.commandOperation.findMany({ where: { guildId }, select: { id: true } }), ids = ops.map(op => op.id);
  await prisma.commandAarDelivery.deleteMany({ where: { operationId: { in: ids } } });
  await prisma.commandDebriefRevision.deleteMany({ where: { operationId: { in: ids } } });
  await prisma.commandDebrief.deleteMany({ where: { operationId: { in: ids } } });
  await prisma.auditLog.deleteMany({ where: { targetId: { in: ids } } });
  await prisma.siteSetting.deleteMany({ where: { key: `command:${guildId}:settings` } });
  await prisma.commandOperation.deleteMany({ where: { id: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect();
});

test("author approval queues one AAR; only the approved summary reaches the configured channel", async () => {
  const op = await operation(), start = calls.length;
  await mutate(op, "saveReport", { summary: "Approved @everyone summary", privateNotes: "PRIVATE OFFICER EVIDENCE" });
  assert.equal(await prisma.commandAarDelivery.count({ where: { operationId: op.id } }), 0);
  assert.equal((await service.view(manager, op.id)).canReview, true);
  await assert.rejects(mutate(op, "reviewReport", {}, member), error => error.status === 403);
  await mutate(op, "reviewReport");
  const result = await deliver(op);
  assert.equal(result.status, "POSTED"); assert.equal(calls.length, start + 1);
  assert.equal(calls.at(-1)[1], `/channels/${channel}/messages`);
  assert.ok(!JSON.stringify(calls.at(-1)).includes("PRIVATE OFFICER EVIDENCE"));
  assert.deepEqual(calls.at(-1)[2].allowed_mentions, { parse: [] });
  assert.match(calls.at(-1)[2].embeds[0].url, new RegExp(op.id));
  await mutate(op, "sendReport");
  assert.equal((await prisma.commandAarDelivery.findUnique({ where: { operationId: op.id } })).status, "POSTED");
  assert.equal(calls.length, start + 1);
});

test("competing worker leases and repeated processing cannot post duplicate messages", async () => {
  const op = await operation(); await approve(op);
  await prisma.commandAarDelivery.updateMany({ where: { operationId: { not: op.id }, status: "PENDING" }, data: { availableAt: new Date("2099-01-01") } });
  const one = worker(), two = worker(), start = calls.length;
  const claims = await Promise.all([one.claim(), two.claim()]); assert.equal(claims.filter(Boolean).length, 1);
  const job = claims.find(Boolean); await one.processJob(job); await two.processJob(job);
  assert.equal(calls.length, start + 1);
});

test("self-approved reports cannot post after the author's officer authority is revoked", async () => {
  const op = await operation();
  await mutate(op, "saveReport", { summary: "Self-approved summary", privateNotes: "Private" });
  await mutate(op, "reviewReport");
  const start = calls.length;
  roles.set(manager, [PERSONNEL_ROLES.member]);
  try { assert.equal((await deliver(op)).status, "BLOCKED"); }
  finally { roles.set(manager, [PERSONNEL_ROLES.lieutenant]); }
  assert.equal(calls.length, start);
});

test("unreviewed edits suppress pending delivery, and reapproval updates the same Discord message", async () => {
  const op = await operation(); await approve(op); const first = await deliver(op), start = calls.length;
  await mutate(op, "saveReport", { summary: "Unreviewed replacement", privateNotes: "SECRET REPLACEMENT" });
  assert.equal(calls.length, start);
  await mutate(op, "reviewReport", {}, reviewer); const updated = await deliver(op);
  assert.equal(updated.messageId, first.messageId); assert.equal(calls.at(-1)[0], "PATCH");
  assert.equal(calls.at(-1)[2].embeds[0].description, "Unreviewed replacement");
  const pending = await operation(); await approve(pending);
  await mutate(pending, "saveReport", { summary: "New draft", privateNotes: "Secret" });
  assert.equal((await prisma.commandAarDelivery.findUnique({ where: { operationId: pending.id } })).status, "SUPERSEDED");
});

test("private reports, unapproved sends and revoked reviewer authority cannot post", async () => {
  const privateOp = await operation("PRIVATE"); await approve(privateOp);
  assert.equal((await prisma.commandAarDelivery.findUnique({ where: { operationId: privateOp.id } })).errorCode, "PRIVATE_REPORT");
  const draft = await operation(); await mutate(draft, "saveReport", { summary: "Draft", privateNotes: "" });
  await assert.rejects(mutate(draft, "sendReport"), error => error.code === "REPORT_NOT_REVIEWED");
  const op = await operation(); await approve(op); roles.set(reviewer, [PERSONNEL_ROLES.member]);
  try { assert.equal((await deliver(op)).status, "BLOCKED"); } finally { roles.set(reviewer, [PERSONNEL_ROLES.lieutenant]); }
});

test("missing AAR configuration is visible and a manager can retry after correcting it", async () => {
  const op = await operation(); await approve(op);
  const blocked = await deliver(op, worker({ DISCORD_AAR_CHANNEL_ID: "" }));
  assert.equal(blocked.status, "BLOCKED"); assert.equal(blocked.errorCode, "AAR_CHANNEL_REQUIRED");
  assert.equal((await service.view(manager, op.id)).reportDelivery.status, "BLOCKED");
  await mutate(op, "sendReport"); assert.equal((await deliver(op)).status, "POSTED");
  await assert.rejects(mutate(op, "sendReport", {}, member), error => error.status === 403);
  assert.equal("reportDelivery" in await service.view(member, op.id), false);
});

test("Discord rate limits delay retry without claiming success", async () => {
  const op = await operation(); await approve(op);
  postFailure = Object.assign(new Error("Limited"), { status: 429, retry_after: 120 });
  try {
    const began = Date.now(), job = await deliver(op);
    assert.equal(job.status, "PENDING"); assert.equal(job.sendingAt, null);
    assert.ok(job.availableAt.getTime() >= began + 120000);
  } finally { postFailure = null; }
});

test("an accepted POST with a lost response is reconciled from the bot's own message, never reposted", async () => {
  const op = await operation(); await approve(op); const start = calls.length;
  postFailure = Object.assign(new Error("Lost response"), { status: 503 }); acceptThenFail = true;
  try { assert.equal((await deliver(op)).status, "AMBIGUOUS"); } finally { postFailure = null; acceptThenFail = false; }
  await assert.rejects(mutate(op, "sendReport"), error => error.code === "AAR_AMBIGUOUS");
  await mutate(op, "reconcileReport"); assert.equal((await deliver(op)).status, "POSTED");
  assert.deepEqual(calls.slice(start).map(call => call[0]), ["POST", "PATCH"]);
});

test("previously approved reports can be explicitly queued and organization AAR settings override the fallback", async () => {
  const op = await operation(), legacy = createAttendanceService({ prisma, authorize });
  await mutate(op, "saveReport", { summary: "Existing approved report", privateNotes: "" }, manager, legacy);
  await mutate(op, "reviewReport", {}, reviewer, legacy);
  assert.equal(await prisma.commandAarDelivery.count({ where: { operationId: op.id } }), 0);
  const configured = "900000000000000002";
  await prisma.siteSetting.upsert({ where: { key: `command:${guildId}:settings` }, create: { key: `command:${guildId}:settings`, value: { channels: { aar: configured } } }, update: { value: { channels: { aar: configured } } } });
  await mutate(op, "sendReport"); const posted = await deliver(op); assert.equal(posted.channelId, configured);
});
