import assert from "node:assert/strict";
import { test } from "node:test";
import { createFleetProductionService, registryProductionState } from "../lib/command/fleetProductionService.js";

test("only explicit FleetYards release statuses establish flight readiness", () => {
  assert.equal(registryProductionState({ productionStatus: "flight-ready" }), "FLIGHT_READY");
  for (const productionStatus of ["in-concept", "in-production", "concept"]) assert.equal(registryProductionState({ productionStatus }), "CONCEPT");
  for (const model of [null, {}, { inGame: true }, { productionStatusLabel: "Flight Ready" }, { productionStatus: "future-status" }]) assert.equal(registryProductionState(model), null);
});

function fixture() {
  const ship = { id: "ship", guildId: "guild", model: "100i", externalRef: "fleetyards:vehicle", productionState: "CONCEPT", verifiedAt: new Date(), verifiedById: "officer", availability: "UNAVAILABLE", readiness: "MAINTENANCE", capacity: 3, revision: 1 };
  const fleet = { sourceStatus: "complete", vehicles: [{ id: "vehicle", model: { name: "100i", productionStatus: "flight-ready" } }] };
  const audits = [], releases = [], queries = [];
  let calls = 0, failed = false;
  const tx = {
    $queryRaw: async () => [],
    commandShip: {
      findMany: async (query) => { queries.push(query); return [ship]; },
      update: async ({ data }) => { Object.assign(ship, { ...data, revision: ship.revision + data.revision.increment }); return ship; },
    },
    commandCrewAssignment: { findMany: async (query) => { releases.push(query); return []; } },
    auditLog: { create: async ({ data }) => audits.push(data) },
  };
  const refresh = createFleetProductionService({ prisma: { $transaction: async (fn) => { calls++; return fn(tx); } }, loadFleet: async () => { if (failed) throw new Error("offline"); return fleet; } });
  return { ship, fleet, audits, releases, queries, refresh: () => refresh({ id: "member", guildId: "guild" }), fail: () => { failed = true; }, calls: () => calls };
}

test("a concept release updates every linked record without altering owner declarations, verification or capacity", async () => {
  const f = fixture();
  const verifiedAt = f.ship.verifiedAt;
  assert.deepEqual(await f.refresh(), { status: "complete", updated: 1 });
  assert.equal(f.ship.productionState, "FLIGHT_READY");
  assert.equal(f.ship.revision, 2);
  assert.equal(f.ship.readiness, "MAINTENANCE");
  assert.equal(f.ship.availability, "UNAVAILABLE");
  assert.equal(f.ship.verifiedAt, verifiedAt);
  assert.equal(f.ship.verifiedById, "officer");
  assert.equal(f.ship.capacity, 3);
  assert.equal(f.queries[0].where.guildId, "guild");
  assert.equal(f.audits[0].metadata.previous, "CONCEPT");
  assert.equal((await f.refresh()).updated, 0);
  assert.equal(f.ship.revision, 2);
  assert.equal(f.audits.length, 1);
});

test("upstream failures and partial data preserve the last known model state", async () => {
  for (const fail of [false, true]) {
    const f = fixture();
    if (fail) f.fail(); else f.fleet.sourceStatus = "partial";
    assert.equal((await f.refresh()).status, "unavailable");
    assert.equal(f.ship.productionState, "CONCEPT");
    assert.equal(f.calls(), 0);
  }
});

test("missing, loaner, ambiguous, mismatched and unrecognized models cannot mark a ship ready", async () => {
  for (const kind of ["missing", "loaner", "duplicate", "mismatch", "unknown", "reference"]) {
    const f = fixture();
    if (kind === "missing") f.fleet.vehicles = [];
    if (kind === "loaner") f.fleet.vehicles[0].loaner = true;
    if (kind === "duplicate") f.fleet.vehicles.push({ ...f.fleet.vehicles[0] });
    if (kind === "mismatch") f.fleet.vehicles[0].model.name = "Different model";
    if (kind === "unknown") f.fleet.vehicles[0].model.productionStatus = "unknown";
    if (kind === "reference") f.ship.externalRef = "manual-reference";
    assert.equal((await f.refresh()).updated, 0, kind);
    assert.equal(f.ship.productionState, "CONCEPT", kind);
  }
});

test("a model returned to concept releases its current crew assignments", async () => {
  const f = fixture();
  f.ship.productionState = "FLIGHT_READY";
  f.fleet.vehicles[0].model.productionStatus = "in-concept";
  await f.refresh();
  assert.equal(f.ship.productionState, "CONCEPT");
  assert.equal(f.releases.length, 1);
  assert.equal(f.releases[0].where.seat.operationShip.shipId, "ship");
});
