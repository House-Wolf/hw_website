import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { ACTIVITY_RECIPIENTS, activityPeriod, activityReportMessage, activitySnapshot, createDiscordActivityService } from "../bot/discordActivity.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";

const clone = value => structuredClone(value);
function matches(record, where) {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return value.some(part => matches(record, part));
    if (value === null) return record[key] == null;
    if (value && typeof value === "object" && !(value instanceof Date)) {
      if ("lt" in value) return record[key] != null && new Date(record[key]) < new Date(value.lt);
      if ("lte" in value) return record[key] != null && new Date(record[key]) <= new Date(value.lte);
    }
    if (value instanceof Date) return new Date(record[key]).getTime() === value.getTime();
    return record[key] === value;
  });
}
function fixture(options = {}) {
  let clock = new Date("2026-10-23T00:00:00Z"), settings;
  const activity = [], deliveries = [], sent = [], errors = [], failures = new Map();
  const people = new Map();
  const addMember = (id, roles = [PERSONNEL_ROLES.member], extra = {}) => {
    const member = { id, displayName: id, user: { bot: false }, joinedTimestamp: Date.parse("2026-01-01"), roles: { cache: new Map(roles.map(role => [role, {}])) }, ...extra };
    people.set(id, member); return member;
  };
  addMember("active"); addMember("inactive");
  const server = { afkChannelId: "afk", members: { fetch: async options => options?.user ? people.get(options.user) : people }, voiceStates: { cache: new Map() } };
  const client = new EventEmitter(); client.isReady = () => true;
  client.guilds = { fetch: async () => server };
  client.users = { fetch: async id => ({ send: async payload => {
    if (failures.has(id)) throw failures.get(id);
    sent.push({ id, payload }); return { id: `message-${sent.length}` };
  } }) };
  const db = {
    $queryRaw: async () => [{ locked: 1 }],
    personnelMember: { findMany: async () => options.records || [] },
    discordActivityState: {
      upsert: async ({ create }) => { settings ||= clone(create); return clone(settings); },
      findUnique: async () => clone(settings),
      update: async ({ data }) => { Object.assign(settings, clone(data)); return clone(settings); },
    },
    discordMemberActivity: {
      upsert: async ({ where, create }) => { let row = activity.find(row => matches(row, where.guildId_discordId_periodStartedAt)); if (!row) { row = clone(create); activity.push(row); } return clone(row); },
      updateMany: async ({ where, data }) => { let count = 0; for (const row of activity) if (matches(row, where)) { Object.assign(row, clone(data)); count++; } return { count }; },
      findMany: async ({ where }) => clone(activity.filter(row => matches(row, where))),
    },
    discordActivityDelivery: {
      upsert: async ({ where, create }) => { let row = deliveries.find(row => matches(row, where.guildId_recipientId_periodEndedAt)); if (!row) { row = { id: `delivery-${deliveries.length}`, ...clone(create) }; deliveries.push(row); } return clone(row); },
      updateMany: async ({ where, data }) => { let count = 0; for (const row of deliveries) if (matches(row, where)) { Object.assign(row, clone(data)); count++; } return { count }; },
      findMany: async ({ where, take }) => clone(deliveries.filter(row => matches(row, where)).slice(0, take)),
    },
  };
  let transaction = Promise.resolve();
  db.$transaction = fn => { const next = transaction.then(() => fn(db)); transaction = next.catch(() => {}); return next; };
  const create = () => createDiscordActivityService({ client, prisma: db, guildId: "guild", rsiApiKey: options.rsiApiKey, membershipLookup: options.lookup, now: () => clock, logger: { log() {}, error: (...args) => errors.push(args) } });
  return { client, db, create, worker: create(), server, people, addMember, activity, deliveries, sent, errors, failures, settings: () => settings,
    setTime: value => { clock = new Date(value); }, time: () => clock };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test("first report waits three calendar months, then both specified recipients get the same roster", async () => {
  const state = fixture(); await state.worker.poll();
  assert.equal(state.settings().nextReportAt.toISOString(), "2027-01-23T00:00:00.000Z");
  state.setTime("2026-11-01"); await state.worker.record("active", "MESSAGE");
  state.setTime("2027-01-22T23:59:59Z"); await state.worker.poll(); assert.equal(state.sent.length, 0);
  state.setTime("2027-01-23"); await state.worker.poll();
  assert.deepEqual(state.sent.map(item => item.id), ACTIVITY_RECIPIENTS);
  assert.equal(state.deliveries.length, 2); assert.ok(state.deliveries.every(row => row.sentAt));
  assert.deepEqual(state.deliveries[0].report, state.deliveries[1].report);
  assert.equal(state.deliveries[0].report.members.find(member => member.discordId === "inactive").inactive, true);
  assert.equal(state.deliveries[0].report.members.find(member => member.discordId === "active").inactive, false);
  assert.equal(state.settings().nextReportAt.toISOString(), "2027-04-23T00:00:00.000Z");
});
test("restart preserves schedule and cannot resend successfully delivered reports", async () => {
  const state = fixture(); await state.worker.poll(); state.setTime("2027-01-23"); await state.worker.poll();
  await state.create().poll(); assert.equal(state.sent.length, 2); assert.equal(state.deliveries.length, 2);
});
test("concurrent workers prepare and deliver one report per recipient", async () => {
  const state = fixture(); await state.worker.poll(); state.setTime("2027-01-23");
  await Promise.all([state.worker.poll(), state.create().poll()]);
  assert.equal(state.deliveries.length, 2); assert.equal(state.sent.length, 2);
});
test("closed DMs retry independently after a day without resending the other recipient's report", async () => {
  const state = fixture(); await state.worker.poll(); state.failures.set(ACTIVITY_RECIPIENTS[0], Object.assign(new Error("DMs closed"), { code: 50007 }));
  state.setTime("2027-01-23"); await state.worker.poll(); assert.equal(state.sent.length, 1);
  state.failures.clear(); state.setTime("2027-01-23T01:00:00Z"); await state.create().poll(); assert.equal(state.sent.length, 1);
  state.setTime("2027-01-24"); await state.create().poll(); assert.equal(state.sent.length, 2);
});
test("a transient delivery error remains queued and retries with the same deduplication nonce", async () => {
  const state = fixture(); await state.worker.poll(); state.failures.set(ACTIVITY_RECIPIENTS[0], new Error("503"));
  state.setTime("2027-01-23"); await state.worker.poll(); const nonce = activityReportMessage(state.deliveries[0]).nonce;
  state.failures.clear(); state.setTime("2027-01-23T01:00:00Z"); await state.create().poll();
  assert.equal(state.sent.find(item => item.id === ACTIVITY_RECIPIENTS[0]).payload.nonce, nonce);
});
test("later-quarter activity never hides the last activity in a report that is delivered late", async () => {
  const state = fixture(); await state.worker.poll();
  state.setTime("2026-12-01"); await state.worker.record("active", "MESSAGE");
  state.setTime("2027-01-24"); await state.worker.record("active", "VOICE"); await state.worker.poll();
  const member = state.deliveries[0].report.members.find(member => member.discordId === "active");
  assert.equal(member.lastActiveAt, "2026-12-01T00:00:00.000Z"); assert.equal(member.inactive, false);
  assert.equal(state.activity.length, 2);
});
test("late and duplicate events cannot move last activity backwards or create counts", async () => {
  const state = fixture(); await state.worker.poll(); state.setTime("2026-11-01");
  await state.worker.record("active", "MESSAGE"); await state.worker.record("active", "VOICE", new Date("2026-10-25"));
  assert.equal(state.activity.length, 1); assert.equal(state.activity[0].lastActiveAt.toISOString(), "2026-11-01T00:00:00.000Z");
  assert.deepEqual(Object.keys(state.activity[0]).sort(), ["discordId", "guildId", "lastActiveAt", "periodStartedAt", "source"]);
});
test("calendar periods handle month ends and leap years", () => {
  const result = activityPeriod(new Date("2028-04-30"), new Date("2028-01-31"));
  assert.equal(result.start.toISOString(), "2028-04-30T00:00:00.000Z");
  assert.equal(result.end.toISOString(), "2028-07-30T00:00:00.000Z");
});
test("only current House Wolf members enter the report; bots, visitors and later joiners are excluded", async () => {
  const state = fixture(); await state.worker.poll();
  state.addMember("visitor", [PERSONNEL_ROLES.visitor]); state.addMember("bot", [PERSONNEL_ROLES.member], { user: { bot: true } });
  state.addMember("later", [PERSONNEL_ROLES.member], { joinedTimestamp: Date.parse("2027-02-01") });
  state.addMember("officer", [PERSONNEL_ROLES.captain]);
  const report = activitySnapshot(state.settings(), state.people, [], new Date("2027-01-23"));
  assert.deepEqual(report.members.map(member => member.discordId).sort(), ["active", "inactive", "officer"]);
});
test("server messages, interactions and voice events record last activity without private DMs or content", async () => {
  const state = fixture(); state.worker.start(); await flush(); state.setTime("2026-11-01");
  const message = { guildId: "guild", author: { id: "active", bot: false }, createdTimestamp: state.time().getTime(), content: "Never store this" };
  state.client.emit("messageCreate", { ...message, guildId: null });
  state.client.emit("messageCreate", { ...message, author: { id: "bot", bot: true } });
  state.client.emit("messageCreate", { ...message, webhookId: "webhook" }); await flush(); assert.equal(state.activity.length, 0);
  state.client.emit("messageCreate", message); await flush(); assert.equal(state.activity[0].source, "MESSAGE");
  state.setTime("2026-11-02"); state.client.emit("interactionCreate", { guildId: "guild", user: { id: "active", bot: false }, isChatInputCommand: () => true });
  await flush(); assert.equal(state.activity[0].source, "INTERACTION");
  state.setTime("2026-11-03"); state.client.emit("voiceStateUpdate", { channelId: null }, { guild: { id: "guild", afkChannelId: "afk" }, id: "active", channelId: "general", member: state.people.get("active") });
  await flush(); assert.equal(state.activity[0].source, "VOICE");
  assert.equal(JSON.stringify(state.activity).includes("Never store this"), false);
  state.worker.stop(); assert.equal(state.client.listenerCount("messageCreate"), 0);
});
test("occupied voice counts as observed participation while AFK channels and bots do not", async () => {
  const state = fixture(); await state.worker.poll(); state.setTime("2026-11-01");
  state.server.voiceStates.cache.set("active", { id: "active", channelId: "general", member: state.people.get("active") });
  state.server.voiceStates.cache.set("inactive", { id: "inactive", channelId: "afk", member: state.people.get("inactive") });
  await state.worker.poll(); assert.deepEqual(state.activity.map(record => record.discordId), ["active"]);
});
test("CSV output escapes formulas and includes every member without mentions or message contents", async () => {
  const state = fixture(); await state.worker.poll(); state.people.get("active").displayName = '=HYPERLINK("bad")';
  state.setTime("2027-01-23"); await state.worker.poll();
  const payload = state.sent[0].payload, csv = payload.files[0].attachment.toString("utf8");
  assert.ok(csv.includes("'=HYPERLINK")); assert.ok(csv.includes("inactive")); assert.deepEqual(payload.allowedMentions.parse, []);
  assert.equal(payload.embeds[0].color, 0x114e62); assert.ok(payload.embeds[0].footer.text.includes("Strength, Honor, Death"));
});


test("on-demand history checks both allowed roles, sends both DMs and preserves the quarterly schedule", async () => {
  for (const role of [PERSONNEL_ROLES.warlord, PERSONNEL_ROLES.hand]) {
    const state = fixture({ rsiApiKey: "test-key", records: [{ discordId: "active", rsiHandle: "ActiveWolf" }],
      lookup: async () => ({ confirmed: true, reason: "PUBLIC_PRIMARY_ORGANIZATION", primaryOrganizationSid: "CUTTERWOLF", verifiedAt: new Date("2026-11-01"), evidence: "https://example.com/profile" }) });
    state.addMember("commander", [role]);
    await state.worker.poll();
    const next = state.settings().nextReportAt.toISOString();
    state.setTime("2026-11-01");
    await state.worker.record("active", "MESSAGE", new Date("2026-10-31"));
    const result = await state.worker.requestReport({ actorId: "commander" });
    assert.deepEqual(result.pendingRecipientIds, []);
    assert.deepEqual(state.sent.map(item => item.id), ACTIVITY_RECIPIENTS);
    assert.equal(state.settings().nextReportAt.toISOString(), next);
    const report = state.deliveries[0].report;
    assert.equal(report.mode, "ON_DEMAND");
    assert.equal(report.requestedBy, "commander");
    assert.equal(report.members.find(member => member.discordId === "active").rsiMembership.status, "Confirmed CUTTERWOLF");
    assert.match(state.sent[0].payload.embeds[0].title, /ACTIVITY HISTORY/);
    assert.match(state.sent[0].payload.files[0].attachment.toString(), /RSI membership/);
    await state.worker.requestReport({ actorId: "commander" });
    assert.equal(state.sent.length, 2, "duplicate request at the same cutoff does not resend");
    state.setTime("2027-01-23"); await state.worker.poll();
    assert.equal(state.sent.length, 4, "scheduled report still sends after the manual report");
  }
});

test("history denies ordinary officers and administrators without either allowed role", async () => {
  const state = fixture();
  state.addMember("captain", [PERSONNEL_ROLES.captain], { permissions: { has: () => true } });
  await assert.rejects(state.worker.requestReport({ actorId: "captain" }), /Only the Clan Warlord or Hand/);
  assert.equal(state.sent.length, 0);
  assert.equal(state.deliveries.length, 0);
});

test("history reports closed DMs as pending and the worker retries without resetting the schedule", async () => {
  const state = fixture(); state.addMember("commander", [PERSONNEL_ROLES.hand]);
  await state.worker.poll(); state.setTime("2026-11-01");
  state.failures.set(ACTIVITY_RECIPIENTS[1], Object.assign(new Error("DMs closed"), { code: 50007 }));
  const result = await state.worker.requestReport({ actorId: "commander" });
  assert.deepEqual(result.pendingRecipientIds, [ACTIVITY_RECIPIENTS[1]]);
  state.failures.clear(); state.setTime("2026-11-02"); await state.worker.poll();
  assert.equal(state.sent.length, 2);
  assert.equal(state.settings().nextReportAt.toISOString(), "2027-01-23T00:00:00.000Z");
});

test("rolling history clamps month ends and cannot claim activity before tracking began", async () => {
  const state = fixture(); state.addMember("commander", [PERSONNEL_ROLES.hand]);
  await state.worker.poll(); state.setTime("2027-05-31T12:00:00Z");
  await state.worker.requestReport({ actorId: "commander" });
  assert.equal(state.deliveries[0].report.start, "2027-02-28T12:00:00.000Z");
});

test("membership lookup failures stay unknown and role revocation during lookup blocks dispatch", async () => {
  let state;
  state = fixture({ rsiApiKey: "test-key", records: [{ discordId: "active", rsiHandle: "ActiveWolf" }], lookup: async () => {
    state.people.get("commander").roles.cache.clear(); throw new Error("provider down");
  } });
  state.addMember("commander", [PERSONNEL_ROLES.hand]);
  await state.worker.poll(); state.setTime("2026-11-01");
  await assert.rejects(state.worker.requestReport({ actorId: "commander" }), /Only the Clan Warlord/);
  assert.equal(state.sent.length, 0);
});
