import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, after, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { createOperationService } from "../lib/command/operations.js";
import { createCommandWorker } from "../bot/commandOperations.js";
import { createAuthorizer, CommandError } from "../lib/command/access.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";

const database = process.env.COMMAND_TEST_DATABASE_URL;
const url = new URL(database || "https://refuse.invalid");
if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.pathname !== "/housewolf_command_test") throw new Error("Use the named disposable loopback database only. Environment files are never loaded.");
const prisma = new PrismaClient({ datasources: { db: { url: database } } });
const guildId = `test-${randomUUID()}`, actorId = randomUUID(), memberId = randomUUID();
const roles = new Map([[actorId, [PERSONNEL_ROLES.lieutenant]], [memberId, [PERSONNEL_ROLES.member]]]);
let authFailure = false, remoteFailure = null;
let nextRemoteId = 1n, textAvailable = true;
const messages = new Map(), textChannelId = "900000000000000005";
const remote = [], sends = [], baseUrl = "https://command.example.test";
const input = { title: "Disposable operation", description: "Mock-only integration", entityType: "EXTERNAL", channelId: "", location: "Test system", timezone: "UTC", startLocal: "2099-01-01T18:00", endLocal: "2099-01-01T20:00", recurrence: "NONE", visibility: "GUILD", imageData: null };
const authorize = createAuthorizer({ guildId,
  loadAccount: (id) => prisma.user.findUnique({ where: { id } }),
  async loadMember(guild, discordId) { if (authFailure) throw new Error("Mock outage"); const user = await prisma.user.findUnique({ where: { discordId } }); return user ? { guildId: guild, userId: discordId, roleIds: roles.get(user.id) || [] } : null; },
});
const service = createOperationService({ prisma, authorize, preflight: async () => true, baseUrl, announcementChannel: "", readNative: async () => remote });
const rest = {
  async get(path) {
    if (path.endsWith("/scheduled-events")) return remote;
    if (path.includes("/scheduled-events/")) { const event = remote.find((e) => path.endsWith(e.id)); if (!event) throw Object.assign(new Error("Not found"), { status: 404 }); return event; }
    if (path === "/users/@me") return { id: "mock-bot" };
    if (path.endsWith("/roles")) return [{ id: guildId, permissions: ((1n << 44n) | (1n << 10n) | (1n << 11n) | (1n << 14n)).toString() }];
    if (path === `/channels/${textChannelId}`) return textAvailable ? { id: textChannelId, guild_id: guildId, type: 0 } : null;
    if (path.endsWith("/members/mock-bot")) return { user: { id: "mock-bot" }, roles: [] };
    if (path.includes("/members/")) { const discordId = path.split("/").at(-1); const user = await prisma.user.findUnique({ where: { discordId } }); return { user: { id: discordId }, roles: roles.get(user.id) || [] }; }
    return { id: guildId };
  },
  async post(path, { body }) {
    if (remoteFailure) throw remoteFailure;
    sends.push(["POST", path]);
    if (path.startsWith("/channels/")) { const message = { ...body, id: `mock-message-${messages.size}` }; messages.set(message.id, message); return message; }
    const event = { ...structuredClone(body), id: String(900000000000000000n + nextRemoteId++), guild_id: guildId, status: 1, image: null }; remote.push(event); return event;
  },
  async patch(path, { body }) { if (remoteFailure) throw remoteFailure; sends.push(["PATCH", path]); const event = path.startsWith("/channels/") ? messages.get(path.split("/").at(-1)) : remote.find((e) => path.endsWith(e.id)); Object.assign(event, structuredClone(body)); return event; },
};
const makeWorker = () => createCommandWorker({ prisma, client: { rest }, env: { DISCORD_GUILD_ID: guildId, NEXTAUTH_URL: baseUrl } });
const newDraft = () => service.create(actorId, input, randomUUID());
const publish = (op) => service.mutate(actorId, op.id, "publish", op.revision);
const latestJob = (op) => prisma.commandDelivery.findUnique({ where: { operationId_revision_kind: { operationId: op.id, revision: op.revision, kind: "NATIVE" } } });
before(async () => {
  await prisma.user.createMany({ data: [{ id: actorId, discordId: `test-${actorId}`, discordUsername: "Disposable officer" }, { id: memberId, discordId: `test-${memberId}`, discordUsername: "Disposable member" }] });
});
test("optional text announcement is independent and missing channel leaves native event posted", async () => {
  const announced = createOperationService({ prisma, authorize, preflight: async () => true, baseUrl, announcementChannel: textChannelId });
  const op = await announced.mutate(actorId, (await newDraft()).id, "publish", 1);
  await makeWorker().tick();
  let saved = await prisma.commandOperation.findUnique({ where: { id: op.id } });
  assert.ok(saved.nativeEventId); assert.ok(saved.announcementId); assert.deepEqual(messages.get(saved.announcementId).allowed_mentions, { parse: [] });
  await announced.mutate(actorId, op.id, "save", op.revision, { ...input, title: "Revised announcement" }); await makeWorker().tick();
  assert.match(messages.get(saved.announcementId).content, /Revised announcement/); assert.equal(messages.size, 1);
  const next = await announced.mutate(actorId, (await newDraft()).id, "publish", 1);
  textAvailable = false; await makeWorker().tick(); textAvailable = true;
  saved = await prisma.commandOperation.findUnique({ where: { id: next.id } }); assert.ok(saved.nativeEventId); assert.equal(saved.announcementId, null);
  const jobs = await prisma.commandDelivery.findMany({ where: { operationId: next.id } });
  assert.equal(jobs.find((j) => j.kind === "NATIVE").status, "POSTED"); assert.equal(jobs.find((j) => j.kind === "ANNOUNCEMENT").status, "BLOCKED");
});
after(async () => {
  const operations = await prisma.commandOperation.findMany({ where: { guildId }, select: { id: true } });
  const ids = operations.map((row) => row.id);
  await prisma.commandSignup.deleteMany({ where: { operationId: { in: ids } } });
  await prisma.commandDelivery.deleteMany({ where: { operationId: { in: ids } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: [actorId, memberId] } }, { targetId: { in: ids } }] } });
  await prisma.commandOperation.deleteMany({ where: { guildId } });
  await prisma.user.deleteMany({ where: { id: { in: [actorId, memberId] } } });
  await prisma.$disconnect();
});
test("lower rank and provider outage create neither draft nor outbox", async () => {
  const before = await prisma.commandOperation.count({ where: { guildId } });
  await assert.rejects(service.create(memberId, input, randomUUID()), (e) => e.status === 403);
  authFailure = true; await assert.rejects(newDraft(), (e) => e.status === 503); authFailure = false;
  assert.equal(await prisma.commandOperation.count({ where: { guildId } }), before);
});
test("concurrent repeated create and publish clicks commit exactly one draft and native job", async () => {
  const key = randomUUID(); const [a, b] = await Promise.all([service.create(actorId, input, key), service.create(actorId, input, key)]);
  assert.equal(a.id, b.id);
  const outcomes = await Promise.allSettled([publish(a), publish(a)]);
  assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1); assert.equal(outcomes.find((r) => r.status === "rejected").reason.status, 409);
  assert.equal(await prisma.commandDelivery.count({ where: { operationId: a.id } }), 1);
  await makeWorker().tick();
  const op = await prisma.commandOperation.findUnique({ where: { id: a.id } });
  assert.ok(op.nativeEventId); assert.equal((await latestJob(op)).status, "POSTED"); assert.equal(op.announcementId, null);
});
test("live role revocation before commit rolls back operation and audit", async () => {
  let checks = 0;
  const guarded = createOperationService({ prisma, baseUrl, preflight: async () => true, authorize: async (...args) => { if (++checks === 2) throw new CommandError(403, "REVOKED", "Revoked"); return authorize(...args); } });
  const key = randomUUID(); await assert.rejects(guarded.create(actorId, input, key), (e) => e.status === 403);
  assert.equal(await prisma.commandOperation.count({ where: { requestKey: key } }), 0);
});
test("worker rechecks officer and blocks revoked pending native publication", async () => {
  const op = await publish(await newDraft()); roles.set(actorId, []);
  await makeWorker().tick(); assert.equal((await latestJob(op)).status, "BLOCKED");
  assert.equal((await prisma.commandOperation.findUnique({ where: { id: op.id } })).nativeEventId, null);
  roles.set(actorId, [PERSONNEL_ROLES.lieutenant]); await service.mutate(actorId, op.id, "retry", op.revision); await makeWorker().tick();
  assert.equal((await latestJob(op)).status, "POSTED");
});
test("two restarted workers claim one expired lease and reconcile POST-before-record crash", async () => {
  const op = await publish(await newDraft()); const job = await latestJob(op);
  const { nativePayload } = await import("../lib/command/eventInput.js");
  await rest.post(`/guilds/${guildId}/scheduled-events`, { body: nativePayload(op, baseUrl) });
  const before = sends.filter(([verb]) => verb === "POST").length;
  await prisma.commandDelivery.update({ where: { id: job.id }, data: { status: "PROCESSING", sendingAt: new Date(), leaseUntil: new Date(0), leaseToken: "crashed-worker" } });
  await Promise.all([makeWorker().tick(), makeWorker().tick()]);
  assert.equal(sends.filter(([verb]) => verb === "POST").length, before); assert.equal((await latestJob(op)).status, "POSTED");
});
test("dashboard edits update mapping, remote edits require explicit adoption, deletion requires recreate", async () => {
  let op = await publish(await newDraft()); await makeWorker().tick(); op = await prisma.commandOperation.findUnique({ where: { id: op.id } });
  op = await service.mutate(actorId, op.id, "save", op.revision, { ...input, title: "Updated dashboard title" });
  await makeWorker().tick(); op = await prisma.commandOperation.findUnique({ where: { id: op.id } });
  const event = remote.find((r) => r.id === op.nativeEventId); assert.equal(event.name, "Updated dashboard title");
  event.name = "Updated in Discord"; await makeWorker().reconcile(); op = await prisma.commandOperation.findUnique({ where: { id: op.id } });
  assert.equal(op.syncState, "CONFLICT"); op = await service.mutate(actorId, op.id, "adopt", op.revision); assert.equal(op.input.title, "Updated in Discord"); assert.equal(op.syncState, "CLEAN");
  event.name = "Another direct edit"; await makeWorker().reconcile(); op = await prisma.commandOperation.findUnique({ where: { id: op.id } });
  op = await service.mutate(actorId, op.id, "reapply", op.revision); await makeWorker().tick();
  assert.equal(event.name, "Updated in Discord"); op = await prisma.commandOperation.findUnique({ where: { id: op.id } }); assert.equal(op.syncState, "CLEAN");
  const jobs = await prisma.commandDelivery.count({ where: { operationId: op.id } }); await makeWorker().tick(); assert.equal(await prisma.commandDelivery.count({ where: { operationId: op.id } }), jobs);
  remote.splice(remote.indexOf(event), 1); await makeWorker().reconcile(); op = await prisma.commandOperation.findUnique({ where: { id: op.id } }); assert.equal(op.syncState, "DELETED");
  const posts = sends.filter(([verb]) => verb === "POST").length; await makeWorker().tick(); assert.equal(sends.filter(([verb]) => verb === "POST").length, posts);
  op = await service.mutate(actorId, op.id, "recreate", op.revision); await makeWorker().tick(); op = await prisma.commandOperation.findUnique({ where: { id: op.id } }); assert.ok(op.nativeEventId);
  op = await service.mutate(actorId, op.id, "cancel", op.revision); await makeWorker().tick(); assert.equal(remote.find((r) => r.id === op.nativeEventId).status, 4);
});
test("Interested never creates signups; explicit member preferences upsert one effective commitment", async () => {
  let op = await publish(await newDraft()); await makeWorker().tick(); op = await prisma.commandOperation.findUnique({ where: { id: op.id } }); remote.find((e) => e.id === op.nativeEventId).user_count = 99;
  await makeWorker().reconcile(); assert.equal(await prisma.commandSignup.count({ where: { operationId: op.id } }), 0);
  await Promise.all([service.signup(memberId, op.id, "COMMITTED", "Pilot"), service.signup(memberId, op.id, "TENTATIVE", "Medic")]);
  assert.equal(await prisma.commandSignup.count({ where: { operationId: op.id } }), 1);
});
test("network failure updating a known native ID is safely retried without creating another event", async () => {
  let op = await publish(await newDraft()); await makeWorker().tick();
  op = await service.mutate(actorId, op.id, "save", op.revision, { ...input, title: "Retry mapped PATCH" });
  const before = sends.filter(([verb, path]) => verb === "POST" && path.includes("scheduled-events")).length;
  remoteFailure = new Error("Mock disconnected PATCH"); await makeWorker().tick(); remoteFailure = null;
  const job = await latestJob(op); assert.equal(job.status, "PENDING");
  await prisma.commandDelivery.update({ where: { id: job.id }, data: { availableAt: new Date(0) } }); await makeWorker().tick();
  assert.equal((await latestJob(op)).status, "POSTED"); assert.equal(sends.filter(([verb, path]) => verb === "POST" && path.includes("scheduled-events")).length, before);
});
test("member cannot read drafts or restricted briefs and other guild cannot mutate records", async () => {
  const draft = await newDraft(); await assert.rejects(service.detail(memberId, draft.id), (e) => e.status === 404);
  const restricted = await service.create(actorId, { ...input, visibility: "OFFICERS" }, randomUUID());
  await assert.rejects(publish(restricted), (e) => e.code === "PRIVATE_NATIVE_UNSUPPORTED");
  await assert.rejects(service.detail(memberId, restricted.id), (e) => e.status === 404);
  const rows = await service.list(memberId); assert.ok(rows.every((row) => row.state !== "DRAFT" && row.input.visibility === "GUILD"));
  const partnerService = createOperationService({ prisma, baseUrl, preflight: async () => true, authorize: async () => ({ id: actorId, guildId: "other-guild", roleIds: [PERSONNEL_ROLES.lieutenant] }) });
  await assert.rejects(partnerService.mutate(actorId, draft.id, "publish", draft.revision), (e) => e.status === 404);
});
test("429 honors retry delay and 5xx does not blindly duplicate native POST", async () => {
  const op = await publish(await newDraft()); remoteFailure = Object.assign(new Error("Mock rate limit"), { status: 429, retry_after: 30 }); await makeWorker().tick();
  let job = await latestJob(op); assert.equal(job.status, "PENDING"); assert.ok(job.availableAt.getTime() > Date.now() + 25000); assert.equal(job.sendingAt, null);
  await prisma.commandDelivery.update({ where: { id: job.id }, data: { availableAt: new Date(0) } }); remoteFailure = Object.assign(new Error("Mock failure"), { status: 500 }); await makeWorker().tick();
  job = await latestJob(op); assert.equal(job.status, "PENDING");
  await prisma.commandDelivery.update({ where: { id: job.id }, data: { availableAt: new Date(0) } }); remoteFailure = null; await makeWorker().tick(); assert.equal((await latestJob(op)).status, "AMBIGUOUS");
  await assert.rejects(service.mutate(actorId, op.id, "save", op.revision, input), (e) => e.code === "AMBIGUOUS");
  await assert.rejects(service.mutate(actorId, op.id, "reconcile", op.revision), (e) => e.code === "AMBIGUOUS");
  const { nativePayload } = await import("../lib/command/eventInput.js");
  await rest.post(`/guilds/${guildId}/scheduled-events`, { body: nativePayload(op, baseUrl) });
  const reconciled = await service.mutate(actorId, op.id, "reconcile", op.revision);
  assert.ok(reconciled.nativeEventId); assert.equal(reconciled.syncState, "CONFLICT");
  assert.equal(await prisma.commandDelivery.count({ where: { operationId: op.id, revision: reconciled.revision } }), 0);
});
