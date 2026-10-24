import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { attachActivityInteractions, historyCommandDefinition, HISTORY_ROLE_IDS, registerHistoryCommand } from "../bot/activityCommands.js";
import { addActivityMembership } from "../bot/activityMembership.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";

test("history is hidden by default and registration preserves unrelated commands", async () => {
  assert.equal(historyCommandDefinition().name, "history");
  assert.equal(historyCommandDefinition().default_member_permissions, "0");
  const edits = [], permissions = [];
  const guild = { commands: {
    fetch: async () => [{ id: "existing", name: "history" }, { id: "other", name: "personnel" }],
    edit: async (id, definition) => { edits.push([id, definition]); return { id }; },
    create: async () => { throw new Error("Should edit only the existing history command"); },
    permissions: { set: async options => permissions.push(options) },
  } };
  await registerHistoryCommand({ guilds: { fetch: async () => guild } }, "guild", "fake-admin-token");
  assert.deepEqual(edits.map(([id]) => id), ["existing"]);
  assert.deepEqual(HISTORY_ROLE_IDS, ["1119791005382750288", "1119837295097434263"]);
  assert.deepEqual(permissions[0].permissions.map(({ id, permission }) => [id, permission]), [
    ["guild", false], [PERSONNEL_ROLES.warlord, true], [PERSONNEL_ROLES.hand, true],
  ]);
});

function interaction(overrides = {}) {
  const replies = [];
  return { replies, commandName: "history", guildId: "guild", user: { id: "commander" }, createdTimestamp: Date.parse("2026-11-01"),
    isChatInputCommand: () => true,
    async deferReply(options) { replies.push(options); this.deferred = true; },
    async editReply(options) { replies.push(options); }, ...overrides };
}

test("history privately acknowledges actual delivery and pending DMs", async () => {
  const client = new EventEmitter();
  const calls = [];
  const stop = attachActivityInteractions(client, { requestReport: async options => {
    calls.push(options); return { pendingRecipientIds: ["371697279704236043"], nextReportAt: "2027-01-23" };
  } }, { guildId: "guild" });
  const command = interaction();
  await client.listeners("interactionCreate")[0](command);
  assert.equal(command.replies[0].flags, 64);
  assert.equal(calls[0].actorId, "commander");
  const reply = command.replies[1];
  assert.match(reply.embeds[0].description, /CutterWolf.*DM delivered/);
  assert.match(reply.embeds[0].description, /Sentinel_Wolf.*Delivery queued/);
  assert.deepEqual(reply.allowedMentions, { parse: [] });
  stop(); assert.equal(client.listenerCount("interactionCreate"), 0);
});

test("history rejects another guild and ignores unrelated commands", async () => {
  const client = new EventEmitter(); let called = false;
  attachActivityInteractions(client, { requestReport: async () => { called = true; } }, { guildId: "guild", logger: { error() {} } });
  const handler = client.listeners("interactionCreate")[0];
  const foreign = interaction({ guildId: "other" }); await handler(foreign);
  assert.equal(called, false); assert.match(foreign.replies[1].content, /restricted/);
  const unrelated = interaction({ commandName: "personnel" }); await handler(unrelated);
  assert.equal(unrelated.replies.length, 0);
});

test("RSI reports classify new provider results without mutating membership or roles", async () => {
  const people = new Map(["confirmed", "other", "stale", "failed", "missing"].map(id => [id, { id, displayName: id, user: { username: id, bot: false } }]));
  const report = { members: [...people.keys()].map(discordId => ({ discordId })) };
  const calls = [];
  const result = await addActivityMembership(report, people, {
    guildId: "guild", apiKey: "fake-key", prisma: { personnelMember: { findMany: async () => [] } },
    lookup: async handle => {
      calls.push(handle);
      if (handle === "failed") throw new Error("unavailable");
      return { confirmed: handle === "confirmed", reason: handle === "other" ? "PRIMARY_ORGANIZATION_MISMATCH" : handle === "stale" ? "UNVERIFIED_OR_STALE_RESPONSE" : "RSI_HANDLE_NOT_FOUND" };
    },
  });
  const status = id => result.members.find(member => member.discordId === id).rsiMembership;
  assert.equal(status("confirmed").status, "Confirmed CUTTERWOLF");
  assert.equal(status("other").status, "Other/no primary organization");
  for (const id of ["stale", "failed", "missing"]) assert.equal(status(id).status, "Needs verification");
  assert.equal(status("failed").reason, "LOOKUP_FAILED");
  assert.equal(calls.length, 5);
  assert.equal(report.members[0].rsiMembership, undefined);
});

test("ambiguous RSI identities and missing API configuration do not make provider calls", async () => {
  const people = new Map(["one", "two"].map(id => [id, { id, displayName: "SameWolf", user: { bot: false } }]));
  const report = { members: [...people.keys()].map(discordId => ({ discordId })) };
  for (const apiKey of [undefined, "fake-key"]) {
    const result = await addActivityMembership(report, people, { guildId: "guild", apiKey,
      prisma: { personnelMember: { findMany: async () => [] } }, lookup: async () => { throw new Error("Must not look up ambiguous names"); } });
    assert.ok(result.members.every(member => member.rsiMembership.status === "Needs verification"));
    assert.ok(result.members.every(member => member.rsiMembership.reason === (apiKey ? "NO_UNIQUE_RSI_HANDLE" : "API_NOT_CONFIGURED")));
  }
});
