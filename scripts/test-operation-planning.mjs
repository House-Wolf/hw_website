import assert from "node:assert/strict";
import { test } from "node:test";
import { assignmentPreview, expandOccurrences, templateInput, validatePlan } from "../lib/command/planningPolicy.js";
import { commitmentComponents } from "../lib/command/commitmentComponents.js";
import { createOperationCommitmentHandler } from "../bot/operationCommitments.js";
import { createOperationReminderWorker } from "../bot/operationReminders.js";
import { CommandError } from "../lib/command/access.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";

test("capacity/reminders and repeat series are bounded; templates cannot carry dates, cover or grants", () => {
  assert.deepEqual(validatePlan({ capacity: 12, waitlistEnabled: true, reminderMinutes: [15, 60, 15] }), { capacity: 12, waitlistEnabled: true, reminderMinutes: [60, 15] });
  for (const capacity of [0, -1, 501, "12"]) assert.throws(() => validatePlan({ capacity, waitlistEnabled: true, reminderMinutes: [] }));
  assert.throws(() => validatePlan({ capacity: null, waitlistEnabled: true, reminderMinutes: [0] }));
  const input = { title: "Patrol", timezone: "UTC", start: "2099-01-01T10:00:00.000Z", end: "2099-01-01T12:00:00.000Z", recurrence: "WEEKLY", imageData: "secret cover", roleIds: ["forged"] };
  const items = expandOccurrences(input, 3, 7);
  assert.equal(items[1].start, "2099-01-08T10:00:00.000Z");
  assert.equal(items[2].recurrence, "NONE");
  for (const count of [1, 13, 2.5]) assert.throws(() => expandOccurrences(input, count, 7));
  assert.throws(() => expandOccurrences({ ...input, timezone: "America/New_York" }, 3, 7));
  const template = templateInput(input);
  for (const field of ["start", "end", "startLocal", "imageData", "roleIds"]) assert.ok(!(field in template));
});

function oracle(seats, people, skillWeight, preferenceWeight) {
  function search(index, used) {
    if (index === seats.length) return 0;
    let best = search(index + 1, used);
    for (const candidate of people) {
      if (used.has(candidate.userId) || !candidate.eligibleSeatIds.includes(seats[index].id)) continue;
      const score = 100000 + (candidate.preferences.includes(seats[index].role) ? preferenceWeight : 0) + (candidate.qualificationCodes.includes(seats[index].role) ? skillWeight : 0);
      best = Math.max(best, score + search(index + 1, new Set([...used, candidate.userId])));
    }
    return best;
  }
  return search(0, new Set());
}
test("assignment matching agrees with a brute-force oracle and is stable under input reordering", () => {
  for (let example = 0; example < 32; example++) {
    const seats = Array.from({ length: 3 }, (_, i) => ({ id: `seat-${i}`, role: i % 2 ? "MEDIC" : "PILOT" }));
    const people = Array.from({ length: 4 }, (_, i) => ({ userId: `member-${i}`, preferences: (example + i) % 2 ? "PILOT" : "MEDIC", qualificationCodes: i % 2 ? ["MEDIC"] : ["PILOT"], eligibleSeatIds: seats.filter((_, j) => (example + i * 3 + j) % 4 !== 0).map((s) => s.id) }));
    const result = assignmentPreview(seats, people, 60, 40);
    assert.equal(result.assignments.reduce((sum, row) => sum + 100000 + row.score, 0), oracle(seats, people, 60, 40));
    assert.deepEqual(result, assignmentPreview([...seats].reverse(), [...people].reverse(), 60, 40));
    assert.equal(new Set(result.assignments.map((row) => row.userId)).size, result.assignments.length);
  }
  assert.deepEqual(assignmentPreview([{ id: "unqualified", role: "MEDIC" }], [{ userId: "member", eligibleSeatIds: [] }]).unfilledSeatIds, ["unqualified"]);
});

const operationId = "00000000-0000-4000-8000-000000000001";
const op = { id: operationId, guildId: "guild", creatorId: "officer", managerIds: [], revision: 3, state: "PUBLISHED", announcementId: "message", announcementChannelId: "channel", input: { title: "Patrol @everyone", start: new Date(Date.now() + 3600000).toISOString(), visibility: "GUILD" } };
test("mapped Discord controls are bounded and disappear for closed/private operations", () => {
  const [row] = commitmentComponents(op, "https://housewolf.example");
  assert.equal(row.components.length, 5);
  assert.ok(row.components.slice(0, 4).every((item) => item.custom_id.length < 100));
  assert.deepEqual(commitmentComponents({ ...op, state: "CANCELLED" }, "https://housewolf.example"), []);
  assert.deepEqual(commitmentComponents({ ...op, input: { ...op.input, visibility: "OFFICERS" } }, "https://housewolf.example"), []);
  for (const baseUrl of [undefined, "not a URL", "ftp://localhost", "https://user:password@example.test"]) assert.throws(() => commitmentComponents(op, baseUrl), error => error.code === "WEBSITE_UNCONFIGURED");
});
test("Discord commitments reject forged message/guild/revision and preserve authored preferences", async () => {
  const writes = [], replies = [];
  const handler = createOperationCommitmentHandler({ guildId: "guild", prisma: {
    commandOperation: { findFirst: async () => op }, user: { findUnique: async () => ({ id: "member", isActive: true }) },
    commandSignup: { findUnique: async () => ({ preferences: "Pilot preferred" }) },
  }, operations: { signup: async (...args) => { writes.push(args); return { status: "COMMITTED" }; } } });
  const interaction = { isButton: () => true, customId: `hwop:${operationId}:3:COMMITTED`, guildId: "guild", channelId: "channel", message: { id: "message" }, user: { id: "discord" }, deferReply: async () => {}, editReply: async (body) => replies.push(body) };
  for (const change of [{ guildId: "other" }, { channelId: "other" }, { message: { id: "forged" } }, { customId: `hwop:${operationId}:2:COMMITTED` }]) await handler({ ...interaction, ...change });
  assert.equal(writes.length, 0);
  await handler(interaction);
  assert.deepEqual(writes[0], ["member", operationId, "COMMITTED", "Pilot preferred"]);
  assert.deepEqual(replies.at(-1).allowedMentions, { parse: [] });
});

function reminderFixture({ source = op, resumed = false, fail = null, revoke = false } = {}) {
  const record = { id: "00000000-0000-4000-8000-000000000099", operationId, actorId: "officer", revision: 3, minutes: 60, attempts: 1, status: "PROCESSING", leaseToken: "lease", sendingAt: resumed ? new Date() : null };
  const sent = [], audit = [];
  let checks = 0;
  const reminder = { findUnique: async () => record, update: async ({ data }) => Object.assign(record, data), updateMany: async ({ data }) => { Object.assign(record, data); return { count: 1 }; } };
  const tx = { $queryRaw: async () => [], commandOperation: { findFirst: async () => source }, commandOperationReminder: reminder, siteSetting: { findUnique: async () => ({ value: { channels: { reminders: "channel" } } }) }, auditLog: { create: async (row) => audit.push(row) } };
  const prisma = { commandOperationReminder: reminder, $transaction: async (callback) => callback(tx) };
  const discord = { get: async (path) => path.startsWith("/channels/") ? { id: "channel", guild_id: "guild", type: 0 } : path.endsWith("/roles") ? [{ id: "guild", permissions: "19456" }] : path === "/users/@me" ? { id: "bot" } : { user: { id: "bot" }, roles: ["guild"] }, post: async (path, body) => { sent.push({ path, body }); if (fail) throw fail; return { id: "sent-message" }; } };
  const authorize = async () => { checks++; if (revoke && checks > 1) throw new CommandError(403, "OFFICER_REQUIRED", "Revoked"); return { id: "officer", guildId: "guild", roleIds: [PERSONNEL_ROLES.lieutenant] }; };
  return { record, sent, audit, worker: createOperationReminderWorker({ prisma, authorize, discord, guildId: "guild", env: { NEXTAUTH_URL: "https://housewolf.example" } }) };
}
test("reminders honor cancellation, stale revisions and final role revocation before sending", async () => {
  for (const option of [{ source: { ...op, state: "CANCELLED" } }, { source: { ...op, revision: 4 } }, { revoke: true }]) {
    const f = reminderFixture(option); await f.worker.processJob({ ...f.record }); assert.equal(f.sent.length, 0);
  }
});
test("reminders use mapped nonce/no mentions, honor 429, and block ambiguous crash/network retries", async () => {
  const success = reminderFixture(); await success.worker.processJob({ ...success.record });
  assert.equal(success.record.status, "POSTED");
  assert.deepEqual(success.sent[0].body.allowed_mentions, { parse: [] });
  assert.equal(success.sent[0].body.enforce_nonce, true);
  assert.ok(!success.sent[0].body.content.includes("@everyone"));
  const limited = reminderFixture({ fail: Object.assign(new Error("Limited"), { status: 429, retry_after: 120 }) });
  const started = Date.now(); await limited.worker.processJob({ ...limited.record });
  assert.equal(limited.record.status, "PENDING"); assert.ok(limited.record.availableAt.getTime() >= started + 120000);
  const crash = reminderFixture({ resumed: true }); await crash.worker.processJob({ ...crash.record }); assert.equal(crash.record.status, "AMBIGUOUS"); assert.equal(crash.sent.length, 0);
  const network = reminderFixture({ fail: new Error("Unknown POST outcome") }); await network.worker.processJob({ ...network.record }); assert.equal(network.record.status, "AMBIGUOUS");
});
