import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { createAttendanceService } from "../lib/command/attendanceService.js";
import { createAuthorizer, CommandError } from "../lib/command/access.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";

const url = new URL(process.env.COMMAND_TEST_DATABASE_URL || "https://refuse.invalid");
if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.pathname !== "/housewolf_command_test") throw new Error("Use only the named disposable loopback database.");
const require = createRequire(import.meta.url);
const { PrismaClient } = require(process.env.ATTENDANCE_PRISMA_CLIENT || "@prisma/client");
const prisma = new PrismaClient({ datasourceUrl: url.toString() });
const guildId = `attendance-${randomUUID()}`;
const [manager, reviewer, member, other] = Array.from({ length: 4 }, () => randomUUID());
const users = [manager, reviewer, member, other];
const roles = new Map(users.map((id) => [id, [id === manager || id === reviewer ? PERSONNEL_ROLES.lieutenant : PERSONNEL_ROLES.member]]));
const authorize = createAuthorizer({ guildId, loadAccount: (id) => prisma.user.findUnique({ where: { id } }), loadMember: async (guild, discordId) => {
  const user = await prisma.user.findUnique({ where: { discordId } });
  return user ? { guildId: guild, userId: discordId, roleIds: roles.get(user.id) || [] } : null;
} });
const service = createAttendanceService({ prisma, authorize });
async function operation(state = "COMPLETED", visibility = "GUILD", recurrence = "NONE", guild = guildId) {
  const op = await prisma.commandOperation.create({ data: { guildId: guild, creatorId: manager, requestKey: randomUUID(), state, input: { title: "Disposable attendance", visibility, recurrence, start: "2026-01-01T10:00:00Z", end: "2026-01-01T12:00:00Z" } } });
  await prisma.commandSignup.create({ data: { operationId: op.id, userId: member, status: "COMMITTED" } });
  return op;
}
const entry = (status = "PRESENT", userId = member) => ({ userId, status, note: "Private attendance evidence" });
async function mutate(op, action, input, actor = manager) {
  const row = await service.view(actor, op.id);
  return service.mutate(actor, op.id, action, row.revision, { reason: "Disposable acceptance", ...input });
}
before(async () => { await prisma.user.createMany({ data: users.map((id) => ({ id, discordId: `attendance-${id}`, discordUsername: id })) }); });
after(async () => {
  const ops = await prisma.commandOperation.findMany({ where: { guildId: { in: [guildId, `${guildId}-foreign`] } }, select: { id: true } }); const ids = ops.map((op) => op.id);
  for (const table of ["commandDebriefRevision", "commandAttendance", "commandDebrief", "commandSignup"]) await prisma[table].deleteMany({ where: { operationId: { in: ids } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: users } } });
  await prisma.commandOperation.deleteMany({ where: { id: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect();
});
test("signups are unmarked candidates; drafts count only after explicit finalization", async () => {
  const op = await operation(); const view = await service.view(manager, op.id);
  assert.equal(view.candidates.length, 1); assert.equal(view.entries.length, 0);
  await mutate(op, "saveAttendance", { entries: [entry()] });
  assert.equal((await service.view(member, op.id)).entries.length, 0);
  assert.equal((await service.statistics(member)).operations, 0);
  await mutate(op, "finalizeAttendance", { entries: [entry()] });
  assert.equal((await service.statistics(member)).value, 100);
  const own = await service.view(member, op.id);
  assert.equal(own.entries[0].status, "PRESENT"); assert.equal("note" in own.entries[0], false);
  assert.equal("privateNotes" in own, false); assert.equal("history" in own, false);
});
test("corrections retain snapshots, require reasons and update finalized totals", async () => {
  const op = await operation(); await mutate(op, "finalizeAttendance", { entries: [entry("ABSENT")] });
  await assert.rejects(mutate(op, "saveAttendance", { entries: [entry()], reason: "" }), (e) => e.code === "INVALID_INPUT");
  await mutate(op, "saveAttendance", { entries: [entry("EXCUSED")] });
  const view = await service.view(manager, op.id);
  assert.equal(view.history.length, 2); assert.equal(view.history[1].snapshot.entries[0].status, "ABSENT");
  assert.equal(view.history[0].snapshot.entries[0].status, "EXCUSED"); assert.equal(view.totals.value, null); assert.ok(view.finalizedAt);
  assert.equal((await service.view(other, op.id)).entries.length, 0);
});
test("every expected participant is marked before finalization and corrections cannot drop records", async () => {
  const op = await operation();
  await assert.rejects(mutate(op, "finalizeAttendance", { entries: [] }), (e) => e.code === "ATTENDANCE_INCOMPLETE");
  await mutate(op, "finalizeAttendance", { entries: [entry(), entry("PRESENT", other)] });
  await assert.rejects(mutate(op, "saveAttendance", { entries: [entry()] }), (e) => e.code === "ATTENDANCE_INCOMPLETE");
});
test("authors can approve their own reports; only the summary is published and edits withdraw publication", async () => {
  const op = await operation(); await mutate(op, "saveReport", { summary: "Member summary\nSecond paragraph", privateNotes: "Officer secret\nPrivate follow-up" });
  assert.equal((await service.view(member, op.id)).summary, "");
  assert.equal((await service.view(manager, op.id)).canReview, true);
  await assert.rejects(mutate(op, "reviewReport", {}, member), (e) => e.status === 403);
  await mutate(op, "reviewReport", {}, manager);
  const approved = await prisma.commandDebrief.findUnique({ where: { operationId: op.id } });
  assert.equal(approved.authorId, manager); assert.equal(approved.reviewerId, manager); assert.ok(approved.reviewedAt);
  const published = await service.view(member, op.id);
  assert.equal(published.summary, "Member summary\nSecond paragraph"); assert.ok(!JSON.stringify(published).includes("Officer secret"));
  await mutate(op, "saveReport", { summary: "Revised summary", privateNotes: "Still private" });
  assert.equal((await service.view(member, op.id)).summary, ""); assert.equal((await service.view(reviewer, op.id)).history.length, 3);
});
test("member, nonmanager, private, foreign-guild, incomplete and recurring operations are denied", async () => {
  const op = await operation();
  await assert.rejects(mutate(op, "saveAttendance", { entries: [entry()] }, member), (e) => e.status === 403);
  await assert.rejects(mutate(op, "saveAttendance", { entries: [entry()] }, reviewer), (e) => e.code === "MANAGER_REQUIRED");
  for (const state of ["DRAFT", "PUBLISHED", "CANCELLED", "ARCHIVED"]) await assert.rejects(mutate(await operation(state), "saveAttendance", { entries: [entry()] }), (e) => e.code === "OPERATION_NOT_COMPLETED");
  await assert.rejects(mutate(await operation("COMPLETED", "GUILD", "WEEKLY"), "saveAttendance", { entries: [entry()] }), (e) => e.code === "OCCURRENCE_REQUIRED");
  await assert.rejects(service.view(member, (await operation("COMPLETED", "PRIVATE")).id), (e) => e.status === 404);
  await assert.rejects(service.view(manager, (await operation("COMPLETED", "GUILD", "NONE", `${guildId}-foreign`)).id), (e) => e.status === 404);
});

test("database still requires an author, approver, approval time and summary for approved reports", async () => {
  const op = await operation();
  await mutate(op, "saveReport", { summary: "Approved summary", privateNotes: "Private" });
  await mutate(op, "reviewReport", {}, manager);
  for (const data of [{ authorId: null }, { reviewerId: null }, { reviewedAt: null }, { summary: "  " }]) {
    await assert.rejects(prisma.commandDebrief.update({ where: { operationId: op.id }, data }), /reviewed_report_requires_approval/);
  }
});

test("walk-ins persist during an active operation without a signup and count only after completion and finalization", async () => {
  const op = await operation("ACTIVE");
  assert.equal((await service.view(manager, op.id)).editable, true);
  assert.equal((await service.view(manager, op.id)).canFinalize, false);
  await mutate(op, "saveAttendance", { entries: [entry("PRESENT", other)] });
  assert.equal(await prisma.commandSignup.count({ where: { operationId: op.id, userId: other } }), 0);
  assert.equal((await service.view(manager, op.id)).entries.find((row) => row.userId === other).status, "PRESENT");
  assert.equal((await service.view(other, op.id)).entries.length, 0);
  const before = (await service.statistics(other)).operations;
  for (const action of ["finalizeAttendance", "saveReport", "reviewReport"]) await assert.rejects(mutate(op, action, { entries: [entry(), entry("PRESENT", other)], summary: "Too early" }), (e) => e.code === "OPERATION_NOT_COMPLETED");
  await prisma.commandOperation.update({ where: { id: op.id }, data: { state: "COMPLETED" } });
  assert.equal((await service.statistics(other)).operations, before);
  await mutate(op, "finalizeAttendance", { entries: [entry(), entry("PRESENT", other)] });
  assert.equal((await service.statistics(other)).operations, before + 1);
  assert.equal((await service.view(other, op.id)).entries[0].status, "PRESENT");
});

test("walk-in search is scoped to the operation manager and independent of fleet staffing", async () => {
  const op = await operation("ACTIVE");
  assert.ok((await service.directory(manager, op.id, other)).some((person) => person.id === other));
  await assert.rejects(service.directory(member, op.id, ""), (e) => e.status === 403);
  await assert.rejects(service.directory(reviewer, op.id, ""), (e) => e.code === "MANAGER_REQUIRED");
  await assert.rejects(service.directory(manager, (await operation("ACTIVE", "GUILD", "NONE", `${guildId}-foreign`)).id, ""), (e) => e.status === 404);
  await assert.rejects(service.directory(manager, op.id, "x".repeat(81)), (e) => e.code === "INVALID_INPUT");
});
test("concurrent finalization creates one snapshot and rejects the stale second writer", async () => {
  const op = await operation();
  const results = await Promise.allSettled([0, 1].map(() => service.mutate(manager, op.id, "finalizeAttendance", 0, { reason: "Concurrent finalize", entries: [entry()] })));
  assert.equal(results.filter((row) => row.status === "fulfilled").length, 1);
  assert.equal(await prisma.commandDebriefRevision.count({ where: { operationId: op.id } }), 1);
});
test("authority revoked at commit rolls back attendance and history", async () => {
  const op = await operation(); let calls = 0;
  const revoked = createAttendanceService({ prisma, authorize: async (...args) => { if (++calls === 2) throw new CommandError(403, "REVOKED", "Revoked"); return authorize(...args); } });
  await assert.rejects(revoked.mutate(manager, op.id, "finalizeAttendance", 0, { reason: "Revocation test", entries: [entry()] }), (e) => e.code === "REVOKED");
  assert.equal(await prisma.commandDebrief.count({ where: { operationId: op.id } }), 0);
  assert.equal(await prisma.commandAttendance.count({ where: { operationId: op.id } }), 0);
});
