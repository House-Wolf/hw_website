import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { matchRegistryOwners, createFleetRegistryService } from "../lib/command/fleetRegistryService.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";
import { CommandError } from "../lib/command/access.js";
const id = "00000000-0000-4000-8000-000000000001";
const vehicle = { id, model: { name: "100i" }, owner: { username: "fleetwolf", displayName: "Fleet Wolf", rsiHandle: "RSIWolf" } };
const personnel = [{ discordId: "discord", rsiHandle: "rsiwolf", membershipConfirmedAt: new Date() }];
const users = [{ id: "member", discordId: "discord", isActive: true }];
test("owner matching uses confirmed RSI identity, never Discord or FleetYards display names", () => {
  assert.equal(matchRegistryOwners([vehicle], personnel, users)[0].ownerId, "member");
  assert.equal(matchRegistryOwners([{ ...vehicle, owner: { username: "RSIWolf", displayName: "RSIWolf" } }], personnel, users)[0].ownerId, null);
  assert.equal(matchRegistryOwners([vehicle], [{ ...personnel[0], membershipConfirmedAt: null }], users)[0].ownerId, null);
  assert.equal(matchRegistryOwners([vehicle], personnel, [{ ...users[0], isActive: false }])[0].ownerId, null);
});
test("ambiguous identities and hidden owners cannot assign a ship; loaners and duplicates are skipped", () => {
  assert.equal(matchRegistryOwners([vehicle], [...personnel, { ...personnel[0], discordId: "another" }], users)[0].ownerId, null);
  assert.equal(matchRegistryOwners([{ ...vehicle, owner: null }], personnel, users)[0].ownerId, null);
  assert.equal(matchRegistryOwners([{ ...vehicle, loaner: true }], personnel, users).length, 0);
  assert.equal(matchRegistryOwners([vehicle, vehicle], personnel, users).length, 1);
});
function fixture({ officer = false, sourceStatus = "complete", accountId = "member", priorOwner = null, priorShip = null, deny = false, identityChanged = false } = {}) {
  const ships = priorShip ? [{ id: "prior-ship", guildId: "guild", externalRef: `fleetyards:${id}`, ownerId: "member", model: "100i", revision: 1, ...priorShip }] : priorOwner ? [{ guildId: "guild", externalRef: `fleetyards:${id}`, ownerId: priorOwner }] : [];
  const audit = [], calls = [];
  const actor = { id: accountId, guildId: "guild", roleIds: [officer ? PERSONNEL_ROLES.lieutenant : PERSONNEL_ROLES.member] };
  const tx = { $queryRaw: async () => [], commandShip: {
    findUnique: async ({ where }) => ships.find(s => s.guildId === where.guildId_externalRef.guildId && s.externalRef === where.guildId_externalRef.externalRef),
    create: async ({ data }) => { const ship = { id: "new-ship", ...data }; ships.push(ship); return ship; },
    update: async ({ where, data }) => { const ship = ships.find((row) => row.id === where.id); Object.assign(ship, { ...data, revision: ship.revision + data.revision.increment }); return ship; },
  }, auditLog: { create: async row => audit.push(row) } };
  tx.personnelMember = { findMany: async () => identityChanged ? [] : personnel };
  tx.user = { findMany: async () => users };
  const prisma = { personnelMember: { findMany: async () => personnel }, user: { findMany: async () => users }, $transaction: async fn => fn(tx) };
  const service = createFleetRegistryService({ prisma, authorize: async user => { if (deny) throw new CommandError(403, "DENIED", "Denied"); return { ...actor, id: user }; }, loadFleet: async () => { calls.push("fleet"); return { vehicles: [vehicle], sourceStatus }; } });
  return { service, ships, audit, calls };
}
test("a matching FleetYards listing verifies ownership without declaring model readiness or consent", async () => {
  const f = fixture();
  assert.equal((await f.service.sync("member")).imported, 1);
  assert.equal(f.ships[0].ownerId, "member");
  assert.equal(f.ships[0].model, "100i");
  assert.ok(f.ships[0].verifiedAt instanceof Date);
  assert.equal(f.ships[0].verifiedById, null);
  assert.match(f.ships[0].evidence, /FleetYards ownership:.*RSI handle: RSIWolf/);
  assert.equal(f.ships[0].availability, undefined);
  assert.equal(f.ships[0].readiness, undefined);
  assert.equal(f.ships[0].productionState, undefined);
  assert.equal(f.ships[0].capacity, undefined);
  assert.equal(f.audit[0].data.metadata.verification, "FLEETYARDS");
  assert.equal((await f.service.sync("member")).existing, 1);
  assert.equal(f.ships.length, 1);
});

test("existing pending imports gain FleetYards ownership verification and invalidate stale form revisions", async () => {
  const f = fixture({ priorShip: { verifiedAt: null, availability: "UNAVAILABLE", readiness: "UNKNOWN", productionState: "UNKNOWN", capacity: 1 } });
  const result = await f.service.sync("member");
  assert.equal(result.verified, 1);
  assert.equal(result.existing, 1);
  assert.equal(f.ships[0].revision, 2);
  assert.ok(f.ships[0].verifiedAt instanceof Date);
  assert.equal(f.ships[0].availability, "UNAVAILABLE");
  assert.equal(f.ships[0].readiness, "UNKNOWN");
  assert.equal(f.ships[0].productionState, "UNKNOWN");
  assert.equal(f.audit[0].data.action, "COMMAND_FLEET_REGISTRY_VERIFIED");
  assert.equal((await f.service.sync("member")).verified, 0);
  assert.equal(f.ships[0].revision, 2);
});

test("registry sync preserves prior officer verification and does not verify mismatched models", async () => {
  const verifiedAt = new Date("2026-10-24T12:00:00Z");
  const reviewed = fixture({ priorShip: { verifiedAt, verifiedById: "officer", evidence: "Reviewed model", capacity: 3 } });
  assert.equal((await reviewed.service.sync("member")).verified, 0);
  assert.equal(reviewed.ships[0].verifiedAt, verifiedAt);
  assert.equal(reviewed.ships[0].verifiedById, "officer");
  assert.equal(reviewed.ships[0].capacity, 3);
  assert.equal(reviewed.audit.length, 0);
  const mismatch = fixture({ priorShip: { verifiedAt: null, model: "Different model" } });
  assert.equal((await mismatch.service.sync("member")).conflicts, 1);
  assert.equal(mismatch.ships[0].verifiedAt, null);
});
test("members import only their own ships while officers can import matched member ships", async () => {
  const member = fixture({ accountId: "other" });
  assert.equal((await member.service.sync("other")).imported, 0);
  const officer = fixture({ officer: true, accountId: "officer" });
  assert.equal((await officer.service.sync("officer")).imported, 1);
  assert.equal(officer.ships[0].ownerId, "member");
});
test("existing ownership conflicts are reported without reassigning ships", async () => {
  const f = fixture({ officer: true, priorOwner: "different-owner" });
  assert.equal((await f.service.sync("officer")).conflicts, 1);
  assert.equal(f.ships[0].ownerId, "different-owner");
  assert.equal(f.audit.length, 0);
});
test("an identity change during import cannot attach a ship to the previous member match", async () => {
  const f = fixture({ identityChanged: true });
  await assert.rejects(f.service.sync("member"), e => e.code === "OWNER_IDENTITY_CHANGED");
  assert.equal(f.ships.length, 0);
});
test("incomplete upstream data and denied requests cannot create declarations", async () => {
  const partial = fixture({ sourceStatus: "partial" });
  await assert.rejects(partial.service.sync("member"), e => e.code === "FLEET_UNAVAILABLE");
  assert.equal(partial.ships.length, 0);
  const denied = fixture({ deny: true });
  await assert.rejects(denied.service.sync("member"), e => e.status === 403);
  assert.equal(denied.calls.length, 0);
});
const require = createRequire(import.meta.url);
const loaded = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../components/fleet/FleetShipCard.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
  exports: loaded.exports, module: loaded, require(name) { assert.equal(name, "react/jsx-runtime"); return require(name); },
});
test("public fleet cards show registry owner information and an anonymous fallback", () => {
  const render = ship => renderToStaticMarkup(React.createElement(loaded.exports.default, { vehicle: ship }));
  assert.match(render(vehicle), /Registry owner:.*Fleet Wolf/);
  assert.match(render(vehicle), /RSI: RSIWolf/);
  assert.match(render({ ...vehicle, owner: null }), /Not publicly shared/);
  assert.match(render({ ...vehicle, loaner: true }), /Loaner/);
});
