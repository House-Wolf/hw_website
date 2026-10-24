import assert from "node:assert/strict";
import { test } from "node:test";
import { createFleetService } from "../lib/command/fleetService.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";

const ownerId = "00000000-0000-4000-8000-000000000001";
function fixture(officer = true) {
  const members = Array.from({ length: 250 }, (_, i) => ({ id: `member-${i}`, discordUsername: `Member ${i}` }));
  members.push({ id: ownerId, discordUsername: "Owner without ships" });
  const queries = [];
  const prisma = {
    user: { findMany: async (query) => { assert.deepEqual(query.where, { isActive: true }); assert.equal(query.take, undefined); return members; } },
    commandShip: { findMany: async (query) => { queries.push(query); return []; } },
    commandQualification: { findMany: async () => [] },
  };
  const service = createFleetService({ prisma, authorize: async () => ({ id: ownerId, guildId: "guild", roleIds: [officer ? PERSONNEL_ROLES.lieutenant : PERSONNEL_ROLES.member] }) });
  return { service, queries };
}

test("fleet owner dropdown includes all active members, including members with no registered ships", async () => {
  const f = fixture();
  const result = await f.service.list(ownerId);
  assert.equal(result.owners.length, 251);
  assert.ok(result.owners.some((owner) => owner.name === "Owner without ships"));
  assert.deepEqual(result.ships, []);
  assert.equal(f.queries.length, 0);
});

test("selecting an owner loads that owner's full ship inventory in the authorized guild", async () => {
  const f = fixture();
  const result = await f.service.list(ownerId, ownerId);
  assert.equal(result.selectedOwnerId, ownerId);
  assert.deepEqual(f.queries[0].where, { guildId: "guild", ownerId });
  assert.equal(f.queries[0].take, undefined);
});

test("owner filtering preserves ordinary member ship visibility restrictions", async () => {
  const f = fixture(false);
  await f.service.list(ownerId, ownerId);
  assert.deepEqual(f.queries[0].where.OR, [{ ownerId }, { verifiedAt: { not: null } }]);
});

test("malformed owner IDs cannot reach the ship query", async () => {
  const f = fixture();
  await assert.rejects(f.service.list(ownerId, "invalid"), (error) => error.code === "INVALID_OWNER");
  assert.equal(f.queries.length, 0);
});
