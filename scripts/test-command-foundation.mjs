import assert from "node:assert/strict";
import { test } from "node:test";
import { CommandError, createAuthorizer, isOfficer, mayManageOperation, assertMutationOrigin } from "../lib/command/access.js";
import { OFFICER_ROLE_IDS, PERSONNEL_ROLES } from "../lib/personnel/policy.js";
import { createSettingsService, defaultCommandSettings, validateCommandSettings } from "../lib/command/settings.js";
import { effectiveChannelPermissions, validateTextDestination } from "../lib/command/channels.js";

const account = { id: "account", discordId: "discord-user", isActive: true };
function fixture(overrides = {}) {
  return createAuthorizer({ guildId: "guild", loadAccount: async () => account,
    loadMember: async () => ({ guildId: "guild", userId: "discord-user", roleIds: [PERSONNEL_ROLES.lieutenant] }), ...overrides });
}
const denied = (status) => (error) => error instanceof CommandError && error.status === status;

test("anonymous and suspended/missing accounts fail before provider access", async () => {
  const authorize = fixture({ loadAccount: async () => null, loadMember: () => assert.fail("unexpected provider call") });
  await assert.rejects(authorize(null, { officer: true }), denied(401));
  await assert.rejects(authorize("account", { officer: true }), denied(403));
  await assert.rejects(fixture({ loadAccount: async () => ({ ...account, isActive: false }) })("account", { officer: true }), denied(403));
});
for (const role of OFFICER_ROLE_IDS) test(`immutable allowed officer ID ${role} qualifies`, async () => {
  const actor = await fixture({ loadMember: async () => ({ guildId: "guild", userId: "discord-user", roleIds: [role] }) })("account", { officer: true });
  assert.equal(actor.roleIds[0], role);
});
for (const role of [PERSONNEL_ROLES.visitor, "buyer", PERSONNEL_ROLES.member, PERSONNEL_ROLES.foundling, PERSONNEL_ROLES.fieldMarshal, PERSONNEL_ROLES.platoonSergeant, "SITE_ADMIN", "MARKETPLACE_ADMIN", "Administrator", "guild-owner", "Lieutenant", "TACOPS - Command"]) test(`nonofficer ${role} cannot use display names, admin or claims to bypass`, async () => {
  await assert.rejects(fixture({ loadMember: async () => ({ guildId: "guild", userId: "discord-user", roleIds: [role], permissions: ["SITE_ADMIN"] }) })("account", { officer: true }), denied(403));
});
test("wrong guild, mismatched identity and removed membership fail closed", async () => {
  for (const member of [null, { guildId: "other", userId: "discord-user", roleIds: OFFICER_ROLE_IDS }, { guildId: "guild", userId: "another", roleIds: OFFICER_ROLE_IDS }])
    await assert.rejects(fixture({ loadMember: async () => member })("account", { officer: true }), denied(403));
});
test("provider outage/malformed responses produce retryable 503 rather than cached allow", async () => {
  await assert.rejects(fixture({ loadMember: async () => { throw new Error("provider failure"); } })("account", { officer: true }), denied(503));
  await assert.rejects(fixture({ loadMember: async () => ({ guildId: "guild", userId: "discord-user", roleIds: null }) })("account", { officer: true }), denied(503));
});
test("revocation and suspension after login take effect on the next fresh check", async () => {
  let active = true, roles = [PERSONNEL_ROLES.lieutenant];
  const authorize = fixture({ loadAccount: async () => ({ ...account, isActive: active }), loadMember: async () => ({ guildId: "guild", userId: "discord-user", roleIds: roles }) });
  await authorize("account", { officer: true });
  roles = [PERSONNEL_ROLES.fieldMarshal];
  await assert.rejects(authorize("account", { officer: true }), denied(403));
  roles = [PERSONNEL_ROLES.lieutenant]; active = false;
  await assert.rejects(authorize("account", { officer: true }), denied(403));
});
test("creator/co-manager policy never lets another officer or partner edit", () => {
  const operation = { guildId: "guild", creatorId: "creator", managerIds: ["manager"] };
  for (const id of ["creator", "manager"]) assert.equal(mayManageOperation({ id, guildId: "guild", roleIds: [PERSONNEL_ROLES.lieutenant] }, operation), true);
  assert.equal(mayManageOperation({ id: "other", guildId: "guild", roleIds: [PERSONNEL_ROLES.captain] }, operation), false);
  assert.equal(mayManageOperation({ id: "other", guildId: "guild", roleIds: [PERSONNEL_ROLES.warlord] }, operation), true);
  assert.equal(mayManageOperation({ id: "creator", guildId: "other", roleIds: [PERSONNEL_ROLES.warlord] }, operation), false);
  assert.equal(isOfficer([PERSONNEL_ROLES.fieldMarshal]), false);
});
test("same-origin write protection rejects missing, forged and cross-site origins", () => {
  const request = (origin, site = "same-origin") => new Request("https://housewolf.test/api/command/settings", { headers: { ...(origin ? { origin } : {}), "sec-fetch-site": site } });
  assertMutationOrigin(request("https://housewolf.test"), "https://housewolf.test");
  for (const r of [request(null), request("https://evil.test"), request("https://housewolf.test", "cross-site")]) assert.throws(() => assertMutationOrigin(r, "https://housewolf.test"), denied(403));
});
test("settings validate bounds, exact keys and no security/enablement label bypass", () => {
  assert.deepEqual(validateCommandSettings(defaultCommandSettings()), defaultCommandSettings());
  for (const input of [{ ...defaultCommandSettings(), enabled: true }, { ...defaultCommandSettings(), skillWeight: 101 }, { ...defaultCommandSettings(), revision: -1 }, { ...defaultCommandSettings(), channels: { events: "officers" } }, { ...defaultCommandSettings(), skillWeight: 0, preferenceWeight: 0 }]) assert.throws(() => validateCommandSettings(input), denied(422));
});
test("settings service rechecks before repository commit; revoked work never commits", async () => {
  let checks = 0, commits = 0;
  const service = createSettingsService({ authorize: async () => { if (++checks > 1) throw new CommandError(403, "REVOKED", "Revoked"); return { id: "actor", guildId: "guild" }; }, validateChannel: async () => assert.fail("unset destinations must not fetch"), repository: { save: async (_g, _v, _a, recheck) => { await recheck(); commits++; } } });
  await assert.rejects(service.save("actor", defaultCommandSettings()), denied(403));
  assert.equal(commits, 0);
});
test("settings persist through the same service and require validated destinations", async () => {
  let stored = defaultCommandSettings(); const verified = [];
  const service = createSettingsService({ authorize: fixture(), validateChannel: async (...args) => verified.push(args), repository: { read: async () => stored, save: async (_g, value, _a, recheck) => { if (stored.revision !== value.revision) throw new CommandError(409, "STALE", "Stale"); await recheck(); return stored = { ...value, revision: value.revision + 1 }; } } });
  const value = { ...defaultCommandSettings(), channels: { ...stored.channels, events: "100000000000000001" } };
  await service.save("account", value);
  assert.equal((await service.read("account")).revision, 1);
  assert.deepEqual(verified[0], ["guild", "100000000000000001", "text"]);
  await assert.rejects(service.save("account", value), denied(409));
});
test("channel preflight enforces guild/type/effective bot permissions without messages", async () => {
  const guildId = "guild", channelId = "text"; const permissions = String((1n << 10n) | (1n << 11n) | (1n << 14n));
  const values = { "/channels/text": { guild_id: guildId, type: 0, permission_overwrites: [] }, "/guilds/guild/roles": [{ id: guildId, permissions }], "/users/@me": { id: "bot" }, "/guilds/guild/members/bot": { user: { id: "bot" }, roles: [] } };
  const discord = async (path) => { assert.ok(path in values); return values[path]; };
  assert.equal((await validateTextDestination({ guildId, channelId, discord })).verified, true);
  values["/channels/text"].guild_id = "other";
  await assert.rejects(validateTextDestination({ guildId, channelId, discord }), denied(422));
  values["/channels/text"].guild_id = guildId;
  values["/channels/text"].permission_overwrites = [{ type: 1, id: "bot", deny: String(1n << 11n), allow: "0" }];
  await assert.rejects(validateTextDestination({ guildId, channelId, discord }), denied(422));
  assert.equal(effectiveChannelPermissions({ guildId, roles: [{ id: guildId, permissions: "8" }], member: { roles: [], user: { id: "bot" } }, channel: {} }) > 0n, true);
});
