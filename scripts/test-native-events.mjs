import assert from "node:assert/strict";
import { test } from "node:test";
import { validateEventInput, localInstant, nativePayload, transition, editableInput } from "../lib/command/eventInput.js";
import { nativePreflight } from "../lib/command/nativePreflight.js";
import { deliverNative, reconcileNative } from "../lib/command/nativeDelivery.js";
import { createAuthorizer, CommandError } from "../lib/command/access.js";
import { OFFICER_ROLE_IDS, PERSONNEL_ROLES } from "../lib/personnel/policy.js";
export const rawEvent = { title: "Test operation", description: "Safe briefing", entityType: "EXTERNAL", location: "Test system", channelId: "", timezone: "UTC", startLocal: "2099-06-01T18:00", endLocal: "2099-06-01T20:00", visibility: "GUILD", recurrence: "NONE", imageData: null };
const guildId = "900000000000000001", voiceId = "900000000000000002";
function fixture(overrides = {}) {
  const op = { id: "00000000-0000-4000-8000-000000000001", guildId, creatorId: "actor", managerIds: [], state: "PUBLISHED", input: validateEventInput(rawEvent), syncState: "CLEAN", nativeEventId: null, ...overrides };
  const calls = [], remote = [];
  const authorize = createAuthorizer({ guildId, loadAccount: async () => ({ id: "actor", discordId: "user", isActive: true }), loadMember: async () => ({ guildId, userId: "user", roleIds: [PERSONNEL_ROLES.lieutenant] }) });
  const discord = { get: async (path) => path.endsWith("scheduled-events") ? remote : remote.find((event) => path.endsWith(event.id)) || null,
    post: async (path, payload) => { calls.push(["POST", path, payload]); const event = { ...payload, id: "900000000000000003", guild_id: guildId, status: 1, image: null }; remote.push(event); return event; },
    patch: async (path, payload) => { calls.push(["PATCH", path, payload]); Object.assign(remote[0], payload); return remote[0]; } };
  return { operation: op, job: { actorId: "actor" }, authorize, discord, preflight: async () => true, baseUrl: "https://housewolf.example", calls, remote };
}
test("external native creation requires no events text-channel ID and contains explicit signup link", async () => {
  const f = fixture(); const result = await deliverNative(f);
  assert.equal(result.nativeEventId, f.remote[0].id); assert.equal(f.calls.length, 1);
  const payload = f.calls[0][2]; assert.equal(payload.entity_type, 3); assert.equal(payload.channel_id, undefined); assert.equal(payload.privacy_level, 2);
  assert.deepEqual(payload.entity_metadata, { location: "Test system" }); assert.ok(payload.scheduled_end_time);
  assert.match(payload.description, /dashboard\/operations\//); assert.match(payload.description, /Interested is not/); assert.equal(payload.components, undefined);
});
test("voice native creation uses selected immutable channel ID", async () => {
  const f = fixture({ input: validateEventInput({ ...rawEvent, entityType: "VOICE", channelId: voiceId, endLocal: "" }) }); await deliverNative(f);
  assert.equal(f.calls[0][2].entity_type, 2); assert.equal(f.calls[0][2].channel_id, voiceId); assert.equal(f.calls[0][2].entity_metadata, undefined); assert.equal(f.calls[0][2].scheduled_end_time, undefined);
});
for (const role of OFFICER_ROLE_IDS) test(`native dispatch accepts current officer ${role}`, async () => {
  const f = fixture(); f.authorize = createAuthorizer({ guildId, loadAccount: async () => ({ id: "actor", discordId: "user", isActive: true }), loadMember: async () => ({ guildId, userId: "user", roleIds: [role] }) }); await deliverNative(f); assert.equal(f.calls.length, 1);
});
for (const role of [PERSONNEL_ROLES.fieldMarshal, PERSONNEL_ROLES.member, "Administrator", "SITE_ADMIN"]) test(`native dispatch denies ${role} without any send`, async () => {
  const f = fixture(); f.authorize = createAuthorizer({ guildId, loadAccount: async () => ({ id: "actor", discordId: "user", isActive: true }), loadMember: async () => ({ guildId, userId: "user", roleIds: [role] }) }); await assert.rejects(deliverNative(f), (e) => e.status === 403); assert.equal(f.calls.length, 0);
});
test("role revocation on final pre-send check blocks dispatch", async () => {
  const f = fixture(); const original = f.authorize; let checks = 0;
  f.authorize = async (...args) => { if (++checks > 1) throw new CommandError(403, "REVOKED", "Revoked"); return original(...args); };
  await assert.rejects(deliverNative(f), (e) => e.status === 403); assert.equal(f.calls.length, 0);
});
test("mapped update, repeat click, and cancellation edit one existing event", async () => {
  const f = fixture(); Object.assign(f.operation, await deliverNative(f));
  f.operation.input.title = "Revised"; Object.assign(f.operation, await deliverNative(f));
  assert.equal(f.calls.filter(([method]) => method === "POST").length, 1); assert.equal(f.remote[0].name, "Revised");
  const count = f.calls.length; await deliverNative(f); assert.equal(f.calls.length, count);
  f.operation.state = "CANCELLED"; await deliverNative(f); assert.equal(f.remote[0].status, 4);
});
test("crash after native POST reconciles marker without creating twice", async () => {
  const f = fixture(); await deliverNative(f); f.job.recoveredSending = true;
  const result = await deliverNative(f); assert.equal(result.nativeEventId, f.remote[0].id); assert.equal(f.calls.filter(([m]) => m === "POST").length, 1);
});
test("ambiguous outcome with no marker blocks automatic recreation", async () => {
  const f = fixture(); f.job.recoveredSending = true; await assert.rejects(deliverNative(f), (e) => e.code === "AMBIGUOUS"); assert.equal(f.calls.length, 0);
});
test("external deletion is a tombstone, never automatic recreation", async () => {
  const f = fixture(); Object.assign(f.operation, await deliverNative(f)); f.remote.length = 0;
  assert.deepEqual(await reconcileNative(f.operation, f.discord), { syncState: "DELETED" }); assert.deepEqual(await deliverNative(f), { syncState: "DELETED" }); assert.equal(f.calls.length, 1);
});
test("direct Discord edits conflict instead of silently overwriting; Interested is ignored", async () => {
  const f = fixture(); Object.assign(f.operation, await deliverNative(f)); f.remote[0].user_count = 999;
  assert.equal(await reconcileNative(f.operation, f.discord), null);
  f.remote[0].name = "Edited in Discord";
  assert.equal((await reconcileNative(f.operation, f.discord)).syncState, "CONFLICT"); assert.equal((await deliverNative(f)).syncState, "CONFLICT"); assert.equal(f.calls.length, 1);
});
test("restricted native event cannot leak its brief", async () => {
  const f = fixture({ input: validateEventInput({ ...rawEvent, visibility: "OFFICERS" }) }); await assert.rejects(deliverNative(f), (e) => e.code === "PRIVATE_NATIVE_UNSUPPORTED"); assert.equal(f.calls.length, 0);
});
test("timezone conversion rejects nonexistent and ambiguous DST times", () => {
  assert.throws(() => localInstant("2027-03-14T02:30", "America/New_York"), /does not exist/);
  assert.throws(() => localInstant("2027-11-07T01:30", "America/New_York"), /occurs twice/);
  assert.equal(localInstant("2027-11-07T01:30", "America/New_York", "earlier"), "2027-11-07T05:30:00.000Z");
  assert.equal(localInstant("2027-11-07T01:30", "America/New_York", "later"), "2027-11-07T06:30:00.000Z");
  assert.throws(() => localInstant("2099-02-30T10:00", "UTC")); assert.throws(() => localInstant("2099-06-01T10:00", "Mars/Test"));
});
test("native recurrence validates supported subset and authoritative enum", () => {
  for (const recurrence of ["WEEKLY", "FORTNIGHTLY"]) {
    const input = validateEventInput({ ...rawEvent, recurrence }); const payload = nativePayload({ id: "test", input }, "https://example.test");
    assert.equal(payload.recurrence_rule.frequency, 2); assert.equal(payload.recurrence_rule.interval, recurrence === "WEEKLY" ? 1 : 2); assert.equal(payload.recurrence_rule.by_weekday.length, 1);
    assert.equal(payload.recurrence_rule.count, undefined);
  }
  assert.throws(() => validateEventInput({ ...rawEvent, recurrence: "CUSTOM" }));
  assert.throws(() => validateEventInput({ ...rawEvent, recurrence: "WEEKLY", timezone: "America/New_York" }));
  assert.throws(() => validateEventInput({ ...rawEvent, recurrence: { count: 3 } }));
});
test("input limits, external end and state transitions are authoritative", () => {
  for (const input of [{ ...rawEvent, endLocal: "" }, { ...rawEvent, endLocal: "2099-06-01T10:00" }, { ...rawEvent, title: "x".repeat(101) }, { ...rawEvent, imageData: "http://127.0.0.1/private" }]) assert.throws(() => validateEventInput(input));
  assert.equal(transition("DRAFT", "publish"), "PUBLISHED"); assert.throws(() => transition("DRAFT", "complete")); assert.throws(() => transition("ARCHIVED", "publish"));
  assert.deepEqual(validateEventInput(editableInput(validateEventInput(rawEvent))), validateEventInput(rawEvent));
});
test("native preflight checks effective voice/guild permissions and real channel types", async () => {
  let permissions = ((1n << 44n) | (1n << 10n) | (1n << 20n)).toString();
  let channel = { id: voiceId, guild_id: guildId, type: 2 };
  const read = async (path) => path.endsWith("/roles") ? [{ id: guildId, permissions }] : path === "/users/@me" ? { id: "bot" } : path.includes("/members/") ? { user: { id: "bot" }, roles: [] } : path.startsWith("/channels/") ? channel : { id: guildId };
  await nativePreflight(guildId, validateEventInput(rawEvent), read);
  const voice = validateEventInput({ ...rawEvent, entityType: "VOICE", channelId: voiceId }); await nativePreflight(guildId, voice, read);
  channel = { ...channel, guild_id: "wrong" }; await assert.rejects(nativePreflight(guildId, voice, read), (e) => e.code === "INVALID_VOICE_CHANNEL");
  channel = { ...channel, guild_id: guildId, type: 0 }; await assert.rejects(nativePreflight(guildId, voice, read));
  permissions = "0"; await assert.rejects(nativePreflight(guildId, validateEventInput(rawEvent), read), (e) => e.code === "BOT_EVENT_PERMISSIONS");
});
test("cover removal is explicit and native mentions cannot mass ping", async () => {
  const f = fixture(); Object.assign(f.operation, await deliverNative(f));
  f.remote[0].image = "existing-cover-hash";
  f.operation.nativeSnapshot = (await import("../lib/command/eventInput.js")).nativeSnapshot(f.remote[0]);
  f.operation.input.imageBehavior = "REMOVE";
  await deliverNative(f); assert.equal(f.remote[0].image, null);
  const payload = nativePayload({ ...f.operation, input: { ...f.operation.input, description: "@everyone @here <@&123>" } }, f.baseUrl);
  assert.doesNotMatch(payload.description, /@everyone|@here|<@&/);
});
