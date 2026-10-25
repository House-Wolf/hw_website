import assert from "node:assert/strict";
import { test } from "node:test";
import { attendanceTotals, validateAttendance, createAttendanceService } from "../lib/command/attendanceService.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";
const id = "00000000-0000-4000-8000-000000000001";

test("reliability excludes excused absences, draft intent and empty denominators", () => {
  assert.equal(attendanceTotals([]).value, null);
  assert.equal(attendanceTotals([{ status: "EXCUSED" }]).value, null);
  assert.deepEqual(attendanceTotals(["PRESENT", "ABSENT", "EXCUSED", "COMMITTED"].map(status => ({ status }))), { present: 1, absent: 1, excused: 1, expected: 2, value: 50 });
});
test("attendance rejects implicit statuses, duplicates, malformed IDs and oversized notes", () => {
  for (const entries of [[{ userId: id, status: "COMMITTED" }], [{ userId: id, status: "PRESENT" }, { userId: id, status: "ABSENT" }], [{ userId: "invalid", status: "PRESENT" }], [{ userId: id, status: "PRESENT", note: "x".repeat(1001) }]]) assert.throws(() => validateAttendance(entries));
  assert.deepEqual(validateAttendance([{ userId: id, status: "EXCUSED" }]), [{ userId: id, status: "EXCUSED", note: "" }]);
});
test("member views query only their finalized attendance and never select private fields or history", async () => {
  const queries = [];
  const service = createAttendanceService({ authorize: async () => ({ id, guildId: "guild", roleIds: [PERSONNEL_ROLES.member] }), prisma: {
    commandOperation: { findFirst: async () => ({ state: "COMPLETED", guildId: "guild", input: { visibility: "GUILD" }, managerIds: [] }) },
    commandDebrief: { findUnique: async (query) => { queries.push(query); return { revision: 2, finalizedAt: new Date(), reportState: "DRAFT" }; } },
    commandAttendance: { findMany: async (query) => { queries.push(query); return []; } },
  } });
  const result = await service.view(id, id);
  assert.equal(result.summary, ""); assert.equal("privateNotes" in result, false); assert.equal("history" in result, false);
  assert.equal("reportContext" in result, false);
  assert.equal("privateNotes" in queries[0].select, false); assert.equal("summary" in queries[0].select, false);
  assert.equal(queries[1].where.userId, id); assert.equal("note" in queries[1].select, false);
});
test("statistics scope finalized records to the configured guild and completed operations", async () => {
  let query;
  const service = createAttendanceService({ authorize: async () => ({ id, guildId: "guild", roleIds: [PERSONNEL_ROLES.member] }), prisma: { commandAttendance: { findMany: async (raw) => { query = raw; return [{ operationId: "op", userId: id, status: "PRESENT" }]; } } } });
  const result = await service.statistics(id);
  assert.equal(query.where.userId, id); assert.equal(query.where.debrief.operation.guildId, "guild");
  assert.deepEqual(query.where.debrief.operation.state.in, ["COMPLETED", "ARCHIVED"]);
  assert.deepEqual(query.where.debrief.finalizedAt, { not: null }); assert.equal(result.operations, 1); assert.equal(result.value, 100);
});
