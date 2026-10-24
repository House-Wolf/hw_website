import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
import { isOfficer, CommandError } from "../lib/command/access.js";
import { createAuthorizer } from "../lib/command/access.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";
import { createOperationService } from "../lib/command/operations.js";
import { editableInput } from "../lib/command/eventInput.js";
import { createCrewService } from "../lib/command/crewService.js";
import { createOperationsManagement } from "../lib/command/operationsManagement.js";
import { assertReserveSchedule, createCommitmentPolicy, scheduleReminders } from "../lib/command/planningPolicy.js";
import { createOperationReminderWorker } from "../bot/operationReminders.js";

const database = process.env.COMMAND_TEST_DATABASE_URL;
const url = new URL(database || "https://refuse.invalid");
if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.pathname !== "/housewolf_command_test") throw new Error("Use only the named disposable loopback database.");
const prisma = new PrismaClient({ datasourceUrl: database });
const guildId = `planning-${randomUUID()}`;
const [officer, otherOfficer, member, second, third, visitor] = Array.from({ length: 6 }, () => randomUUID());
const users = [officer, otherOfficer, member, second, third, visitor];
const roles = new Map(users.map((id) => [id, [id === officer || id === otherOfficer ? PERSONNEL_ROLES.lieutenant : id === visitor ? PERSONNEL_ROLES.visitor : PERSONNEL_ROLES.member]]));
const authorize = createAuthorizer({ guildId, loadAccount: (id) => prisma.user.findUnique({ where: { id } }), async loadMember(guild, discordId) {
  const user = await prisma.user.findUnique({ where: { discordId } });
  return user ? { guildId: guild, userId: discordId, roleIds: roles.get(user.id) || [] } : null;
} });
const operations = createOperationService({ prisma, authorize, preflight: async () => true, baseUrl: "https://example.test", staffingEnabled: true, commitmentPolicy: createCommitmentPolicy({ authorize }), operationChanged: scheduleReminders, reserveScheduleCheck: assertReserveSchedule });
const crew = createCrewService({ prisma, authorize, advanced: true });
const planning = createOperationsManagement({ prisma, authorize, crewService: crew, reminderChannel: "test-reminders" });
const input = { title: "Test planning", description: "Mock-only operation", entityType: "EXTERNAL", location: "Fixture", timezone: "UTC", startLocal: "2099-08-01T10:00", endLocal: "2099-08-01T12:00", visibility: "GUILD", recurrence: "NONE", imageData: null };
let scheduleIndex = 0;
async function operation(published = true, sameTime = null) {
  const shift = ++scheduleIndex * 86400000;
  const startLocal = sameTime ? sameTime.start.slice(0, 16) : new Date(Date.parse(`${input.startLocal}:00Z`) + shift).toISOString().slice(0, 16);
  const endLocal = sameTime ? sameTime.end.slice(0, 16) : new Date(Date.parse(`${input.endLocal}:00Z`) + shift).toISOString().slice(0, 16);
  const row = await operations.create(officer, { ...input, startLocal, endLocal }, randomUUID()); return published ? operations.mutate(officer, row.id, "publish", row.revision) : row; }
const getOperation = (id) => prisma.commandOperation.findUnique({ where: { id } });
async function plan(id, action, raw = {}, actor = officer) { const current = await planning.view(actor, id); return planning.mutate(actor, id, action, current.revision, raw); }
async function crewChange(id, action, raw = {}) { const current = await getOperation(id); return crew.mutate(officer, id, action, current.crewRevision, raw); }
async function seat(id, role = "PILOT", requiredCode = "") {
  const label = `Seat-${randomUUID()}`; await crewChange(id, "addSeat", { label, role, requiredCode });
  return prisma.commandSeat.findUnique({ where: { operationId_label: { operationId: id, label } } });
}
before(async () => { await prisma.user.createMany({ data: users.map((id) => ({ id, discordId: `planning-${id}`, discordUsername: id })) }); });
after(async () => {
  const ops = await prisma.commandOperation.findMany({ where: { guildId }, select: { id: true } }); const ids = ops.map((row) => row.id);
  await prisma.commandWingSeat.deleteMany({ where: { operationId: { in: ids } } });
  await prisma.commandReserveCrew.deleteMany({ where: { operationId: { in: ids } } });
  await prisma.commandWing.deleteMany({ where: { operationId: { in: ids } } });
  await prisma.commandOperationWaitlist.deleteMany({ where: { operationId: { in: ids } } });
  await prisma.commandSeriesOccurrence.deleteMany({ where: { seriesId: { in: ids } } });
  await prisma.commandOperationReminder.deleteMany({ where: { operationId: { in: ids } } });
  await prisma.commandOperationPlan.deleteMany({ where: { operationId: { in: ids } } });
  await prisma.commandOperationTemplate.deleteMany({ where: { guildId } });
  await prisma.commandCrewAssignment.deleteMany({ where: { operationId: { in: ids } } });
  await prisma.commandSeat.deleteMany({ where: { operationId: { in: ids } } });
  await prisma.commandOperationShip.deleteMany({ where: { operationId: { in: ids } } });
  await prisma.commandQualification.deleteMany({ where: { guildId } });
  await prisma.commandDelivery.deleteMany({ where: { operationId: { in: ids } } });
  await prisma.commandSignup.deleteMany({ where: { operationId: { in: ids } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: users } }, { targetId: { in: ids } }] } });
  await prisma.commandOperation.deleteMany({ where: { guildId } });
  await prisma.user.deleteMany({ where: { id: { in: users } } }); await prisma.$disconnect();
});

test("planning denies nonmanagers and stale versions; templates omit dates/covers and retain owner authority", async () => {
  const op = await operation(false);
  await assert.rejects(planning.mutate(otherOfficer, op.id, "savePlan", 0, { capacity: 2, waitlistEnabled: true, reminderMinutes: [] }), (error) => error.code === "MANAGER_REQUIRED");
  await plan(op.id, "savePlan", { capacity: 2, waitlistEnabled: true, reminderMinutes: [] });
  await assert.rejects(planning.mutate(officer, op.id, "savePlan", 0, { capacity: 3, waitlistEnabled: true, reminderMinutes: [] }), (error) => error.code === "STALE_PLAN");
  const { templateId } = await plan(op.id, "saveTemplate", { name: `Template-${randomUUID()}` });
  const template = (await planning.templates(officer)).find((row) => row.id === templateId);
  assert.equal(template.input.title, input.title);
  assert.ok(!("startLocal" in template.input)); assert.ok(!("imageData" in template.input));
  await assert.rejects(planning.templates(member), (error) => error.status === 403);
  await assert.rejects(planning.deleteTemplate(otherOfficer, templateId, 1), (error) => error.status === 403);
  await planning.deleteTemplate(officer, templateId, 1);
});

test("simultaneous last-place signups cannot overbook; waitlist is FIFO and promotion is atomic", async () => {
  const op = await operation();
  await plan(op.id, "savePlan", { capacity: 1, waitlistEnabled: true, reminderMinutes: [] });
  const results = await Promise.all([member, second].map((id) => operations.signup(id, op.id, "COMMITTED", "PILOT")));
  assert.deepEqual(results.map((row) => row.status).sort(), ["COMMITTED", "RESERVE"]);
  const committed = await prisma.commandSignup.findFirst({ where: { operationId: op.id, status: "COMMITTED" } });
  const queued = await prisma.commandOperationWaitlist.findFirst({ where: { operationId: op.id } });
  await operations.signup(third, op.id, "COMMITTED", "MEDIC");
  const timestamp = queued.queuedAt.getTime();
  await operations.signup(queued.userId, op.id, "COMMITTED", "Updated preference");
  assert.equal((await prisma.commandOperationWaitlist.findUnique({ where: { operationId_userId: { operationId: op.id, userId: queued.userId } } })).queuedAt.getTime(), timestamp);
  await operations.signup(committed.userId, op.id, "WITHDRAWN", "");
  assert.equal((await prisma.commandSignup.findUnique({ where: { operationId_userId: { operationId: op.id, userId: queued.userId } } })).status, "COMMITTED");
  assert.equal(await prisma.commandSignup.count({ where: { operationId: op.id, status: "COMMITTED" } }), 1);
  assert.equal((await planning.view(third, op.id)).waitlistPosition, 1);
  await assert.rejects(operations.signup(visitor, op.id, "COMMITTED", ""), (error) => error.code === "MEMBER_REQUIRED");
});

test("voluntary reserves do not consume capacity; closed waitlists reject overflow and invalid capacity reductions", async () => {
  const op = await operation();
  await plan(op.id, "savePlan", { capacity: 1, waitlistEnabled: false, reminderMinutes: [] });
  await operations.signup(member, op.id, "RESERVE", "Standby");
  await operations.signup(second, op.id, "COMMITTED", "Pilot");
  assert.equal(await prisma.commandOperationWaitlist.count({ where: { operationId: op.id } }), 0);
  await assert.rejects(operations.signup(third, op.id, "COMMITTED", ""), (error) => error.code === "CAPACITY_FULL");
  await plan(op.id, "savePlan", { capacity: 2, waitlistEnabled: true, reminderMinutes: [] });
  await operations.signup(third, op.id, "COMMITTED", "");
  await assert.rejects(plan(op.id, "savePlan", { capacity: 1, waitlistEnabled: true, reminderMinutes: [] }), (error) => error.code === "BELOW_COMMITTED");
});

test("repeat drafts have independent IDs, times, plans and staffing; published events cannot be silently expanded", async () => {
  const op = await operation(false);
  await plan(op.id, "savePlan", { capacity: 3, waitlistEnabled: true, reminderMinutes: [] });
  const { occurrences } = await plan(op.id, "createSeries", { count: 3, intervalDays: 7 });
  assert.equal(occurrences.length, 3);
  const children = await prisma.commandOperation.findMany({ where: { id: { in: occurrences } }, orderBy: { input: "asc" } });
  assert.ok(children.every((row) => row.state === "DRAFT" && row.input.recurrence === "NONE"));
  assert.equal(new Set(children.map((row) => row.input.start)).size, 3);
  assert.equal(await prisma.commandOperationPlan.count({ where: { operationId: { in: occurrences }, capacity: 3 } }), 3);
  assert.equal(await prisma.commandDelivery.count({ where: { operationId: { in: occurrences } } }), 0);
  const live = await operation();
  await assert.rejects(plan(live.id, "createSeries", { count: 3, intervalDays: 7 }), (error) => error.code === "SERIES_DRAFT_REQUIRED");
});

test("reserves respect occupancy, credentials and overlap; activation/transfer are atomic and retain history", async () => {
  const op = await operation(), a = await seat(op.id), b = await seat(op.id), medical = await seat(op.id, "MEDIC", "MEDIC");
  await operations.signup(member, op.id, "RESERVE", "Pilot standby");
  await operations.signup(second, op.id, "COMMITTED", "Pilot");
  const wing = await plan(op.id, "createWing", { name: "Alpha" });
  await plan(op.id, "linkWingSeat", { seatId: a.id, wingId: wing.id });
  await assert.rejects(plan(op.id, "addReserve", { userId: member, seatId: medical.id, wingId: wing.id, reason: "Backup medic" }), (error) => error.code === "QUALIFICATION_REQUIRED");
  const reserve = await plan(op.id, "addReserve", { userId: member, seatId: a.id, wingId: wing.id, reason: "Backup pilot" });
  await crewChange(op.id, "assign", { seatId: a.id, userId: second, reason: "Primary pilot" });
  await assert.rejects(crewChange(op.id, "activateReserve", { reserveId: reserve.id, seatId: a.id, reason: "Test occupied seat" }), (error) => error.code === "SEAT_OCCUPIED");
  assert.equal((await prisma.commandReserveCrew.findUnique({ where: { id: reserve.id } })).releasedAt, null);
  const elsewhere = await operation(true, op.input); await operations.signup(member, elsewhere.id, "COMMITTED", "Pilot");
  await assert.rejects(plan(elsewhere.id, "addReserve", { userId: member, reason: "Conflicting reserve" }), (error) => error.code === "RESERVE_OVERLAP");
  await crewChange(op.id, "activateReserve", { reserveId: reserve.id, seatId: b.id, reason: "Activate second pilot" });
  assert.ok((await prisma.commandReserveCrew.findUnique({ where: { id: reserve.id } })).releasedAt);
  const active = await prisma.commandCrewAssignment.findFirst({ where: { operationId: op.id, userId: member, releasedAt: null } });
  await assert.rejects(crewChange(op.id, "transfer", { assignmentId: active.id, seatId: medical.id, reason: "Unqualified transfer" }), (error) => error.code === "QUALIFICATION_REQUIRED");
  assert.equal((await prisma.commandCrewAssignment.findUnique({ where: { id: active.id } })).releasedAt, null);
  const destination = await seat(op.id);
  await crewChange(op.id, "transfer", { assignmentId: active.id, seatId: destination.id, reason: "Move to replacement pilot seat" });
  assert.ok((await prisma.commandCrewAssignment.findUnique({ where: { id: active.id } })).releasedAt);
  assert.equal((await prisma.commandCrewAssignment.findFirst({ where: { operationId: op.id, userId: member, releasedAt: null } })).seatId, destination.id);
});

test("rescheduling cannot extend reserve duty past its verified qualification expiry", async () => {
  const op = await operation(), medical = await seat(op.id, "MEDIC", "MEDIC");
  await prisma.commandQualification.create({ data: { guildId, userId: third, issuerId: officer, code: "MEDIC", evidence: "Disposable test certificate", expiresAt: new Date(Date.parse(op.input.end) + 3600000) } });
  await operations.signup(third, op.id, "RESERVE", "MEDIC");
  await plan(op.id, "addReserve", { userId: third, seatId: medical.id, reason: "Qualified medical backup" });
  await assert.rejects(operations.mutate(officer, op.id, "save", op.revision, { ...editableInput(op.input), endLocal: new Date(Date.parse(op.input.end) + 7200000).toISOString().slice(0, 16) }), error => error.code === "QUALIFICATION_REQUIRED");
  assert.equal((await getOperation(op.id)).revision, op.revision);
});

test("manager-approved assignment previews preserve manual locks and reject stale snapshots", async () => {
  const op = await operation(), a = await seat(op.id), b = await seat(op.id), c = await seat(op.id, "MEDIC");
  for (const id of [member, second, third]) await operations.signup(id, op.id, "COMMITTED", id === third ? "MEDIC" : "PILOT");
  await crewChange(op.id, "assign", { seatId: a.id, userId: member, reason: "Commander locked pilot" });
  const preview = await plan(op.id, "previewAssignments");
  assert.equal(preview.lockedCount, 1); assert.equal(preview.assignments.length, 2);
  assert.ok(preview.assignments.every((row) => row.seatId !== a.id && row.userId !== member));
  await plan(op.id, "createWing", { name: "Changed plan" });
  await assert.rejects(crewChange(op.id, "assignMany", { fingerprint: preview.fingerprint, reason: "Approve old preview" }), (error) => error.code === "STALE_PREVIEW");
  const fresh = await plan(op.id, "previewAssignments");
  const revoked = createCrewService({ prisma, advanced: true, authorize: async (id, options) => id === third ? { ...(await authorize(id, options)), roleIds: [PERSONNEL_ROLES.visitor] } : authorize(id, options) });
  const snapshot = await getOperation(op.id);
  await assert.rejects(revoked.mutate(officer, op.id, "assignMany", snapshot.crewRevision, { fingerprint: fresh.fingerprint, reason: "Provider revocation during approval" }), (error) => error.code === "MEMBER_INELIGIBLE");
  assert.equal(await prisma.commandCrewAssignment.count({ where: { operationId: op.id, releasedAt: null } }), 1);
  await crewChange(op.id, "assignMany", { fingerprint: fresh.fingerprint, reason: "Reviewed all proposed assignments" });
  assert.equal(await prisma.commandCrewAssignment.count({ where: { operationId: op.id, releasedAt: null } }), 3);
  assert.equal((await prisma.commandCrewAssignment.findFirst({ where: { operationId: op.id, seatId: a.id, releasedAt: null } })).userId, member);
  assert.ok([b.id, c.id].every((id) => fresh.assignments.some((row) => row.seatId === id)));
});

test("reminder plans are repeat-safe, follow revisions and cancel without creating Discord messages", async () => {
  const op = await operation();
  await plan(op.id, "savePlan", { capacity: null, waitlistEnabled: true, reminderMinutes: [60, 15] });
  await plan(op.id, "savePlan", { capacity: null, waitlistEnabled: true, reminderMinutes: [60, 15] });
  assert.equal(await prisma.commandOperationReminder.count({ where: { operationId: op.id, status: "PENDING" } }), 2);
  await operations.mutate(officer, op.id, "cancel", op.revision);
  assert.equal(await prisma.commandOperationReminder.count({ where: { operationId: op.id, status: "PENDING" } }), 0);
});

test("concurrent reminder workers lease one due job and post it only once", async () => {
  const op = await operation();
  await plan(op.id, "savePlan", { capacity: null, waitlistEnabled: true, reminderMinutes: [60] });
  await prisma.commandOperationReminder.updateMany({ where: { operationId: op.id }, data: { dueAt: new Date(Date.now() - 1000) } });
  let posts = 0;
  const discord = { get: async (path) => path.startsWith("/channels/") ? { guild_id: guildId, type: 0 } : path.endsWith("/roles") ? [{ id: guildId, permissions: "19456" }] : path === "/users/@me" ? { id: "bot" } : { user: { id: "bot" }, roles: [guildId] }, post: async () => { posts++; return { id: "mock-reminder" }; } };
  const worker = () => createOperationReminderWorker({ prisma, authorize, discord, guildId, env: { NEXTAUTH_URL: "https://example.test", DISCORD_OPERATION_REMINDERS_CHANNEL_ID: "channel" } });
  const one = worker(), two = worker();
  const claims = await Promise.all([one.claim(), two.claim()]);
  assert.equal(claims.filter(Boolean).length, 1);
  await one.processJob(claims.find(Boolean));
  assert.equal(posts, 1);
  await two.processJob(claims.find(Boolean));
  assert.equal(posts, 1);
});


test("operation search paginates actual records and filters drafts/private data by current guild authority", async () => {
  const token = randomUUID();
  const saved = [];
  for (let i = 0; i < 14; i++) {
    const draft = await operations.create(officer, { ...input, title: `Search ${token} 100% ${i}` }, randomUUID());
    saved.push(i % 2 ? draft : await operations.mutate(officer, draft.id, "publish", draft.revision));
  }
  await operations.create(officer, { ...input, title: `Search ${token} 100% private`, visibility: "OFFICERS" }, randomUUID());
  const require = createRequire(import.meta.url);
  const dependencies = { "server-only": {}, "@/lib/prisma": { prisma }, "./server": { authorize }, "./channels.js": {}, "./staffingServer": { crewService: crew }, "./operationsManagement.js": { createOperationsManagement }, "./access.js": { CommandError, isOfficer } };
  const loaded = { exports: {} };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../lib/command/planningServer.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    module: loaded, exports: loaded.exports, process: { env: { COMMAND_ADVANCED_OPERATIONS_ENABLED: "true", COMMAND_STAFFING_ENABLED: "true" } },
    require(name) { if (name in dependencies) return dependencies[name]; return require(name); },
  });
  const browse = loaded.exports.browseOperations;
  const publicRows = await browse(member, new URLSearchParams({ q: token, page: "1", pageSize: "12" }));
  assert.equal(publicRows.total, 7);
  assert.ok(publicRows.items.every((row) => row.state !== "DRAFT" && row.input.visibility === "GUILD" && !("imageData" in row.input)));
  const officers = await browse(officer, new URLSearchParams({ q: token, page: "2", pageSize: "12" }));
  assert.equal(officers.total, 15); assert.equal(officers.items.length, 3);
  assert.equal((await browse(member, new URLSearchParams({ q: token, state: "DRAFT" }))).total, 0);
  assert.equal((await browse(officer, new URLSearchParams({ q: `Search ${token} 100%` }))).total, 15);
  await assert.rejects(browse(officer, new URLSearchParams({ page: "0" })), (error) => error.code === "INVALID_FILTER");
  assert.equal(saved.length, 14);
});
