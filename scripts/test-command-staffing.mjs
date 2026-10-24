import assert from "node:assert/strict";
import { test } from "node:test";
import { crewMember, CREW_ROLES, overlaps, staffingWindow, shipReady, validCredential, credentialCode } from "../lib/command/staffingPolicy.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";
import { createCrewService } from "../lib/command/crewService.js";

function crewViewFixture(manager = true) {
  const queries = [];
  const actor = { id: "manager", guildId: "guild", roleIds: [manager ? PERSONNEL_ROLES.lieutenant : PERSONNEL_ROLES.member] };
  const prisma = {
    commandOperation: { findFirst: async () => ({ creatorId: "manager", managerIds: [], guildId: "guild", state: "PUBLISHED", input: { visibility: "GUILD" }, crewRevision: 1 }) },
    commandOperationShip: { findMany: async () => [] }, commandSeat: { findMany: async () => [] },
    commandCrewAssignment: { findMany: async () => [] }, commandSignup: { findMany: async () => [] },
    commandQualification: { findMany: async () => [] }, auditLog: { findMany: async () => [] },
    commandShip: {
      findMany: async (query) => { queries.push(query); return [{ id: "verified-ship", name: "Wolf", model: "Cutlass", verifiedAt: new Date(), productionState: "FLIGHT_READY", availability: "AVAILABLE", readiness: "READY", owner: { name: "Pilot" } }]; },
      count: async (query) => { queries.push(query); return 3; },
    },
  };
  return { service: createCrewService({ prisma, authorize: async () => actor }), queries };
}

test("operation managers see ships pending verification separately from attachable ships", async () => {
  const { service, queries } = crewViewFixture();
  const result = await service.view("manager", "00000000-0000-4000-8000-000000000001");
  assert.equal(result.pendingVerification, 3);
  assert.equal(result.availableShips.length, 1);
  assert.equal(result.availableShips[0].ready, true);
  assert.deepEqual(queries.map((q) => q.where), [
    { guildId: "guild", verifiedAt: { not: null }, owner: { isActive: true } },
    { guildId: "guild", verifiedAt: null, owner: { isActive: true } },
  ]);
});

test("ordinary crew viewers do not query or receive the manager's fleet inventory", async () => {
  const { service, queries } = crewViewFixture(false);
  const result = await service.view("manager", "00000000-0000-4000-8000-000000000001");
  assert.equal(result.canManage, false);
  assert.equal(result.pendingVerification, 0);
  assert.deepEqual(result.availableShips, []);
  assert.equal(queries.length, 0);
});
test("operational roles never substitute for security/member roles", () => {
  assert.ok(CREW_ROLES.includes("PILOT"));
  assert.equal(crewMember({ roleIds: ["PILOT", "Administrator", "SITE_ADMIN"] }), false);
  assert.equal(crewMember({ roleIds: [PERSONNEL_ROLES.member] }), true);
  assert.equal(crewMember({ roleIds: [PERSONNEL_ROLES.lieutenant] }), true);
  assert.throws(() => credentialCode("medic")); assert.equal(credentialCode("MEDIC_1"), "MEDIC_1");
});
test("model production, verified ownership, availability and attestation are independent requirements", () => {
  const ship = { verifiedAt: new Date(), productionState: "FLIGHT_READY", availability: "AVAILABLE", readiness: "READY" };
  assert.equal(shipReady(ship), true);
  for (const override of [{ verifiedAt: null }, { productionState: "CONCEPT" }, { productionState: "UNKNOWN" }, { availability: "UNAVAILABLE" }, { readiness: "MAINTENANCE" }]) assert.equal(shipReady({ ...ship, ...override }), false);
});
test("staffing windows reject unknown end/recurrence and adjacent intervals do not overlap", () => {
  const input = { start: "2099-01-01T10:00:00Z", end: "2099-01-01T12:00:00Z", recurrence: "NONE" };
  const window = staffingWindow(input);
  assert.equal(overlaps(window, staffingWindow({ ...input, start: input.end, end: "2099-01-01T13:00:00Z" })), false);
  assert.equal(overlaps(window, staffingWindow({ ...input, start: "2099-01-01T11:00:00Z" })), true);
  assert.throws(() => staffingWindow({ ...input, end: null }), (e) => e.code === "STAFFING_END_REQUIRED");
  assert.throws(() => staffingWindow({ ...input, recurrence: "WEEKLY" }), (e) => e.code === "OCCURRENCE_REQUIRED");
});
test("credentials must be verified, unrevoked and valid for the whole operation", () => {
  const end = Date.parse("2099-01-01T12:00:00Z");
  const q = { code: "MEDIC", revokedAt: null, expiresAt: "2099-01-01T13:00:00Z" };
  assert.equal(validCredential(q, "MEDIC", end), true);
  assert.equal(validCredential({ ...q, expiresAt: "2099-01-01T11:00:00Z" }, "MEDIC", end), false);
  assert.equal(validCredential({ ...q, revokedAt: new Date() }, "MEDIC", end), false);
  assert.equal(validCredential(q, "PILOT", end), false);
});
