import assert from "node:assert/strict";
import { test } from "node:test";
import { readInterested } from "../lib/command/discordInterestService.js";
import { createDiscordOAuthUser } from "../lib/authDiscordIdentity.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";

const op = { guildId: "guild", nativeEventId: "900000000000000001", state: "PUBLISHED", input: { visibility: "GUILD" } };
const row = index => ({ guild_scheduled_event_id: op.nativeEventId, user: { id: String(800000000000000000n + BigInt(index)), username: `wolf${index}` }, member: { roles: [PERSONNEL_ROLES.member], nick: `Wolf ${index}` } });

test("Interested pagination reads every page, keeps stable identities and excludes bots/nonmembers", async () => {
  const paths = [];
  const members = await readInterested(async path => {
    paths.push(path);
    if (!path.includes("/users?")) return { id: op.nativeEventId, guild_id: op.guildId, status: 1 };
    if (!path.includes("&after=")) return Array.from({ length: 100 }, (_, i) => row(i));
    return [row(100), { ...row(101), user: { ...row(101).user, bot: true } }, { ...row(102), member: null }];
  }, op);
  assert.equal(members.length, 101);
  assert.ok(paths.at(-1).endsWith(`&after=${row(99).user.id}`));
  assert.deepEqual(members[100], { discordId: row(100).user.id, username: "wolf100", name: "Wolf 100" });
});

test("Interested reads reject mismatched events, inconsistent pagination and partial upstream failures", async () => {
  for (const kind of ["event", "page", "repeat", "failure"]) await assert.rejects(readInterested(async path => {
    if (!path.includes("/users?")) return { id: kind === "event" ? "other" : op.nativeEventId, guild_id: op.guildId, status: 1 };
    if (kind === "page") return [{ ...row(0), guild_scheduled_event_id: "other" }];
    if (path.includes("&after=") && kind === "failure") throw new Error("Later page offline");
    return Array.from({ length: 100 }, (_, i) => row(i));
  }, op));
  await assert.rejects(readInterested(async () => { throw new Error("Should not read"); }, { ...op, input: { visibility: "OFFICERS" } }), error => error.code === "DISCORD_EVENT_REQUIRED");
});

test("first Discord OAuth login reuses the crew identity without changing access fields", async () => {
  const user = { id: "existing-uuid", isActive: true }, calls = [];
  const result = await createDiscordOAuthUser({ user: { upsert: async query => { calls.push(query); return user; } } }, { id: "untrusted-id", discordId: row(0).user.id, discordUsername: "Wolf", isActive: true, lastLoginAt: new Date(), roles: ["admin"] });
  assert.equal(result.id, user.id);
  assert.deepEqual(calls[0].where, { discordId: row(0).user.id });
  for (const field of ["id", "isActive", "lastLoginAt", "roles", "accounts", "sessions"]) assert.ok(!(field in calls[0].update));
  await assert.rejects(createDiscordOAuthUser({ user: { upsert: async () => ({ ...user, isActive: false }) } }, { discordId: row(0).user.id, discordUsername: "Wolf" }), /suspended/);
});
