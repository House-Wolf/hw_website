import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
const source = ts.transpileModule(readFileSync(new URL("../lib/fleetyards/normalization.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loaded = { exports: {} }; vm.runInNewContext(source, { module: loaded, exports: loaded.exports });
const { normalizeFleetVehicles, fleetStatistics, loadPublicFleet } = loaded.exports;
const vehicle = (id, modelId = "model") => ({ id, model: { id: modelId, name: modelId, manufacturer: { name: "Maker" }, classification: "transport" } });

test("registry owners survive normalization in either provider naming format", () => {
  for (const fields of [{ username: "wolf", userDisplayName: "Wolf", userRsiHandle: "RSIWolf" }, { username: "wolf", user_display_name: "Wolf", user_rsi_handle: "RSIWolf" }]) {
    const [ship] = normalizeFleetVehicles([{ ...vehicle("owner-ship"), ...fields, privateEmail: "not-for-public-cards" }]);
    assert.equal(ship.owner.username, "wolf");
    assert.equal(ship.owner.displayName, "Wolf");
    assert.equal(ship.owner.rsiHandle, "RSIWolf");
    assert.ok(!JSON.stringify(ship).includes("not-for-public-cards"));
  }
});
test("hidden or absent registry owners stay anonymous and loaners remain identifiable", () => {
  for (const hidden of [{ hide_owner: true }, { hideOwner: true }]) {
    assert.equal(normalizeFleetVehicles([{ ...vehicle("hidden"), username: "wolf", userRsiHandle: "Wolf", ...hidden }])[0].owner, null);
  }
  const [ship] = normalizeFleetVehicles([{ ...vehicle("private"), loaner: true }]);
  assert.equal(ship.owner, null); assert.equal(ship.loaner, true);
});

test("arrays and nested provider envelopes normalize without inventing metadata rows", () => {
  for (const input of [[vehicle("one")], { vehicles: [vehicle("one")] }, { data: { results: [vehicle("one")] } }, { items: [null, vehicle("one")] }]) assert.equal(normalizeFleetVehicles(input).length, 1);
  for (const input of [null, {}, { total: 12, meta: { size: 30 } }, { model: { name: "metadata" } }]) assert.equal(normalizeFleetVehicles(input).length, 0);
});
test("ship instances and stable distinct model identities are counted separately", () => {
  const stats = fleetStatistics(normalizeFleetVehicles([vehicle("a", "one"), vehicle("b", "one"), vehicle("c", "two"), { id: "d", model: null }]));
  assert.equal(stats.totalVehicles, 4); assert.equal(stats.uniqueModels, 2); assert.equal(stats.unidentifiedModels, 1);
  assert.equal(stats.manufacturers, 1); assert.equal(fleetStatistics([]).uniqueModels, 0);
});
test("size uses source-provided labels and never invents dimensions from numeric categories", () => {
  const [known, missing, nested] = normalizeFleetVehicles([{ id: "1", model: { size: 4 } }, { id: "2", model: { name: "No size" } }, { id: "3", model: { size: { label: "Medium" } } }]);
  assert.equal(known.model.size, null); assert.equal(missing.model.size, null); assert.equal(nested.model.sizeLabel, "Medium");
  const [official] = normalizeFleetVehicles([{ id: "provider", model: { metrics: { size: "large", sizeLabel: "Large" } } }]);
  assert.equal(official.model.sizeLabel, "Large");
});
test("pagination deduplicates instances without collapsing different owners' same-model ships", async () => {
  let calls = 0; const pages = [[vehicle("a"), vehicle("b")], [vehicle("b"), vehicle("c")], []];
  const data = await loadPublicFleet("test", async () => pages[calls++], 2);
  assert.equal(data.vehicles.length, 3); assert.equal(data.sourceStatus, "complete"); assert.equal(calls, 3);
  assert.equal(data.modelCounts.length, 1); assert.equal(data.modelCounts[0].count, 3);
});
test("partial failures and repeated pages report incomplete statistics", async () => {
  let calls = 0;
  const data = await loadPublicFleet("test", async () => { if (calls++) throw new Error("HTTP 503"); return [vehicle("a"), vehicle("b")]; }, 2);
  assert.equal(data.sourceStatus, "partial"); assert.equal(data.vehicles.length, 2);
  const repeated = await loadPublicFleet("test", async () => [vehicle("a"), vehicle("b")], 2);
  assert.equal(repeated.sourceStatus, "partial"); assert.equal(repeated.vehicles.length, 2);
});
test("empty successful fleet differs from non-OK/null/malformed source", async () => {
  assert.equal((await loadPublicFleet("test", async () => [])).sourceStatus, "complete");
  for (const read of [async () => null, async () => ({ meta: { total: 20 } }), async () => { throw new Error("HTTP 404"); }]) assert.equal((await loadPublicFleet("test", read)).sourceStatus, "unavailable");
});
