import assert from "node:assert/strict";
import { test } from "node:test";
import { createRsiMembershipSync, rsiSyncInterval } from "../bot/rsiMembershipSync.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";

function fixture(options = {}) {
  let time = new Date("2026-10-23T01:00:00Z");
  const records = options.records || [], calls = [], reconciled = [], audits = [], logs = [];
  const member = (id, username, roles = []) => ({ id, displayName: username, user: { username, bot: false }, roles: { cache: new Map(roles.map(role => [role, {}])) } });
  const people = options.people || [member("talon", "Talon_Graves")];
  const roster = new Map(people.map(person => [person.id, person]));
  const db = {
    personnelMember: {
      findMany: async () => structuredClone(records),
      findUnique: async ({ where }) => structuredClone(records.find(record => record.discordId === where.guildId_discordId.discordId)),
      upsert: async ({ where, create, update }) => {
        let record = records.find(record => record.discordId === where.guildId_discordId.discordId);
        if (!record) { record = { id: `record-${records.length}`, ...create }; records.push(record); }
        else Object.assign(record, update);
        return structuredClone(record);
      },
      update: async ({ where, data }) => { const record = records.find(record => record.id === where.id); Object.assign(record, data); return structuredClone(record); },
    },
    personnelAudit: { create: async ({ data }) => audits.push(data) },
    $queryRaw: async () => [{ locked: 1 }],
    $transaction: async fn => fn(db),
  };
  const create = () => createRsiMembershipSync({
    client: { guilds: { fetch: async () => ({ members: { fetch: async () => roster } }) } }, prisma: db,
    config: { guildId: "guild", buyerRoleId: "buyer", rsiApiKey: options.noKey ? undefined : "test-key", rsiCheckIntervalMs: options.interval },
    membershipLookup: async handle => { calls.push(handle); return options.lookup ? options.lookup(handle) : { confirmed: true, evidence: `https://robertsspaceindustries.com/en/citizens/${handle}`, verifiedAt: time }; },
    reconcile: async record => { if (options.repairFailure) throw new Error("Discord unavailable"); reconciled.push(record); },
    now: () => time, logger: { log: text => logs.push(text), error: text => logs.push(text) },
  });
  return { member, records, people, calls, reconciled, audits, logs, create, worker: create(), advance: ms => { time = new Date(time.getTime() + ms); } };
}

test("an RSI-approved same-name member is discovered without any website or application record", async () => {
  const state = fixture(); await state.worker.poll();
  assert.deepEqual(state.calls, ["talon_graves"]);
  assert.equal(state.records[0].rsiHandle, "talon_graves");
  assert.ok(state.records[0].membershipConfirmedAt);
  assert.ok(state.records[0].applicationAcceptedAt);
  assert.equal(state.records[0].membershipVerifiedBy, "RSI_PUBLIC_NAME_MATCH");
  assert.equal(state.audits[0].details.acceptanceSource, "OBSERVED_CUTTERWOLF_MEMBERSHIP");
  assert.equal(state.reconciled.length, 1);
});
test("no API key means no enrollment or provider requests", async () => {
  const state = fixture({ noKey: true }); await state.worker.poll();
  assert.equal(state.records.length, 0); assert.equal(state.calls.length, 0);
});
test("unconfirmed public membership never enrolls a member", async () => {
  const state = fixture({ lookup: async () => ({ confirmed: false }) }); await state.worker.poll();
  assert.equal(state.records[0].applicationAcceptedAt, undefined); assert.equal(state.reconciled.length, 0);
});
test("provider failures never count as approval", async () => {
  const state = fixture({ lookup: async () => { throw new Error("503"); } }); await state.worker.poll();
  assert.equal(state.records[0].membershipConfirmedAt, undefined); assert.equal(state.reconciled.length, 0);
});
test("cooldown persists across a worker restart and then permits another lookup", async () => {
  const state = fixture({ interval: 900000, lookup: async () => ({ confirmed: false }) });
  await state.worker.poll(); await state.create().poll(); assert.equal(state.calls.length, 1);
  state.advance(900000); await state.create().poll(); assert.equal(state.calls.length, 2);
});
test("duplicate Discord display names cannot claim the same RSI account", async () => {
  const state = fixture(); state.people.push(state.member("other", "Talon_Graves"));
  // Build a fresh fixture so its fetched roster includes the duplicate.
  const duplicate = fixture({ people: state.people }); await duplicate.worker.poll();
  assert.equal(duplicate.calls.length, 0); assert.equal(duplicate.reconciled.length, 0);
});
test("multiple RSI accounts matching different exact Discord names require officer verification", async () => {
  const state = fixture(); state.people[0].user.username = "Other_Handle";
  await state.worker.poll(); assert.equal(state.calls.length, 2); assert.equal(state.reconciled.length, 0);
});
test("a failed secondary lookup cannot hide an ambiguous RSI identity", async () => {
  const state = fixture({ lookup: async handle => {
    if (handle === "other_handle") throw new Error("Provider unavailable");
    return { confirmed: true, evidence: "evidence", verifiedAt: new Date() };
  } });
  state.people[0].user.username = "Other_Handle"; await state.worker.poll();
  assert.equal(state.reconciled.length, 0);
});
test("a handle already linked to somebody else is never automatically claimed", async () => {
  const state = fixture({ records: [{ id: "existing", guildId: "guild", discordId: "other", rsiHandle: "talon_graves" }] });
  await state.worker.poll(); assert.equal(state.calls.length, 0); assert.equal(state.reconciled.length, 0);
});
test("an existing verified higher rank is recorded without inventing service tenure", async () => {
  const state = fixture(); state.people[0].roles.cache.set(PERSONNEL_ROLES.rallyMaster, {});
  await state.worker.poll(); assert.equal(state.records[0].currentRankRoleId, PERSONNEL_ROLES.rallyMaster);
  assert.equal(state.records[0].rankSince, undefined);
});
test("confirmed members with missing membership roles are retried without another RSI request", async () => {
  const state = fixture({ records: [{ id: "existing", guildId: "guild", discordId: "talon", rsiHandle: "talon_graves", membershipConfirmedAt: new Date(), applicationAcceptedAt: new Date(), membershipVerifiedBy: "OFFICER", currentRankRoleId: PERSONNEL_ROLES.foundling }] });
  await state.worker.poll(); assert.equal(state.calls.length, 0); assert.equal(state.reconciled.length, 1);
});
test("one member's Discord failure cannot prevent the rest of the discovery pass", async () => {
  const state = fixture({ repairFailure: true }); await state.worker.poll();
  assert.ok(state.records[0].membershipConfirmedAt); assert.ok(state.logs.some(log => log.includes("discovery pending")));
  await state.worker.poll(); assert.ok(state.logs.some(log => log.includes("role reconciliation pending")));
});
test("each pass checks at most ten members and advances past previously checked people", async () => {
  const seed = fixture();
  const state = fixture({ people: Array.from({ length: 12 }, (_, i) => seed.member(`id-${i}`, `wolf_${i}`)), lookup: async () => ({ confirmed: false }) });
  await state.worker.poll(); assert.equal(state.calls.length, 10);
  await state.worker.poll(); assert.equal(state.calls.length, 12);
});
test("bots and invalid RSI names do not generate lookup calls", async () => {
  const state = fixture(); state.people[0].user.bot = true; await state.worker.poll();
  assert.equal(state.records.length, 0); assert.equal(state.calls.length, 0);
  const invalid = fixture(); invalid.people[0].displayName = "[HW] Talon Graves"; invalid.people[0].user.username = "invalid.name";
  await invalid.worker.poll(); assert.equal(invalid.calls.length, 0); assert.equal(invalid.reconciled.length, 0);
});
test("an officer's link changed during lookup is not overwritten", async () => {
  const state = fixture({ lookup: async () => {
    state.records[0].rsiHandle = "officer_linked_handle";
    return { confirmed: true, evidence: "evidence", verifiedAt: new Date() };
  } });
  await state.worker.poll();
  assert.equal(state.records[0].rsiHandle, "officer_linked_handle");
  assert.equal(state.reconciled.length, 0);
});
test("periodic reconciliation retries after roles were applied but website synchronization failed", async () => {
  const seed = fixture();
  const roles = [PERSONNEL_ROLES.foundling, PERSONNEL_ROLES.member, PERSONNEL_ROLES.houseWolf];
  const state = fixture({ people: [seed.member("talon", "Talon_Graves", roles)], records: [{ id: "existing", guildId: "guild", discordId: "talon", rsiHandle: "talon_graves", membershipConfirmedAt: new Date(), applicationAcceptedAt: new Date(), membershipVerifiedBy: "OFFICER", currentRankRoleId: PERSONNEL_ROLES.foundling }] });
  await state.worker.poll(); assert.equal(state.reconciled.length, 1);
  await state.worker.poll(); assert.equal(state.reconciled.length, 1);
  state.advance(900000); await state.create().poll(); assert.equal(state.reconciled.length, 2);
  assert.equal(state.calls.length, 0);
});
test("invalid intervals cannot create a rapid API polling loop", () => {
  for (const value of [0, 1, -1, "abc", "Infinity", 60000.1]) assert.throws(() => rsiSyncInterval(value));
  assert.equal(rsiSyncInterval(undefined), 900000); assert.equal(rsiSyncInterval("60000"), 900000); assert.equal(rsiSyncInterval("21600000"), 21600000);
});
