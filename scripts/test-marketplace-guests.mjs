import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createMarketplaceGuestService } from "../bot/marketplaceGuestService.js";
import * as guestRecords from "../lib/marketplace/guestRecords.js";

const guildId = "100000000000000001";
const userId = "100000000000000002";
const config = { guildId, buyerRoleId: "buyer", visitorRoleId: "visitor", onboardingRoleIds: ["interest"] };

function matches(record, where) {
  if (!record) return false;
  for (const [key, expected] of Object.entries(where)) {
    if (key === "OR") { if (!expected.some((condition) => matches(record, condition))) return false; }
    else if (key === "discordUserId_guildId") { if (!matches(record, expected)) return false; }
    else if (expected && typeof expected === "object" && !(expected instanceof Date)) {
      if (expected.lt && !(record[key] && record[key] < expected.lt)) return false;
      if (expected.lte && !(record[key] <= expected.lte)) return false;
    } else if (record[key] !== expected) return false;
  }
  return true;
}

function fixture(options = {}) {
  let clock = new Date("2026-10-22T12:00:00Z");
  let record = options.noRecord ? null : {
    id: 1, discordUserId: userId, guildId, discordTag: "Wolf", joinedAt: new Date(clock.getTime() - 6 * 86_400_000),
    expiresAt: new Date(clock.getTime() + (options.expired ? -1 : 86_400_000)), warningAt: new Date(clock.getTime() - 1),
    warningSentAt: null, warningAttemptedAt: null, warningUnavailable: false, nextCheckAt: clock,
    processingUntil: null, processingToken: null, lastError: null,
  };
  const calls = { kick: 0, send: 0, remove: [], memberFetch: 0, created: 0 };
  const roles = new Map((options.roles || [guildId, "buyer"]).map((roleId) => [roleId, { id: roleId }]));
  const prisma = { marketplaceGuest: {
    findUnique: async ({ where }) => matches(record, where) ? structuredClone(record) : null,
    findMany: async ({ where }) => matches(record, where) ? [structuredClone(record)] : [],
    updateMany: async ({ where, data }) => {
      if (!matches(record, where)) return { count: 0 };
      Object.assign(record, data);
      return { count: 1 };
    },
    deleteMany: async ({ where }) => {
      if (!matches(record, where)) return { count: 0 };
      record = null;
      return { count: 1 };
    },
    create: async ({ data }) => {
      if (options.databaseFailure) throw new Error("Database unavailable");
      calls.created++;
      record = { id: 1, processingUntil: null, processingToken: null, ...data };
      return structuredClone(record);
    },
  } };
  const member = {
    id: userId, user: { bot: false },
    roles: { cache: roles, remove: async (roleIds) => {
      for (const roleId of Array.isArray(roleIds) ? roleIds : [roleIds]) { calls.remove.push(roleId); roles.delete(roleId); }
    } },
    send: async () => { calls.send++; if (options.closedDMs) throw Object.assign(new Error("DMs closed"), { code: 50007 }); },
    kick: async () => { calls.kick++; if (options.kickFailure) throw new Error("Missing kick permission"); },
  };
  const guild = { id: guildId, members: { fetch: async (query) => {
    assert.equal(query.force, true);
    calls.memberFetch++;
    if (options.fetchFailure) throw options.fetchFailure;
    if (options.promoteDuringExpiry && calls.memberFetch === 2) roles.set("captain", { id: "captain" });
    return member;
  } } };
  member.guild = guild;
  const client = { isReady: () => true, guilds: { fetch: async () => guild } };
  const createService = () => createMarketplaceGuestService({ client, prisma, config, now: () => clock, logger: { error() {} } });
  return { calls, roles, prisma, member, options, createService, service: createService(), record: () => record, advance: (milliseconds) => { clock = new Date(clock.getTime() + milliseconds); }, now: () => clock };
}

test("expired guests are removed after a worker restart", async () => {
  const state = fixture({ expired: true });
  await state.createService().run();
  assert.equal(state.calls.kick, 1);
  assert.equal(state.record(), null);
});

test("promoted members are preserved even with a stale Buyer role", async () => {
  const state = fixture({ expired: true, roles: [guildId, "buyer", "captain"] });
  await state.service.run();
  assert.equal(state.calls.kick, 0);
  assert.equal(state.roles.has("captain"), true);
  assert.equal(state.roles.has("buyer"), false);
  assert.equal(state.record(), null);
});

test("members without Buyer are never kicked", async () => {
  const state = fixture({ expired: true, roles: [guildId, "visitor"] });
  await state.service.run();
  assert.equal(state.calls.kick, 0);
  assert.equal(state.roles.has("visitor"), true);
  assert.equal(state.record(), null);
});

test("Visitor and configured onboarding roles are removed from tracked buyers", async () => {
  const state = fixture({ roles: [guildId, "buyer", "visitor", "interest"] });
  await state.service.reconcileMember(state.member);
  assert.deepEqual([...state.roles.keys()], [guildId, "buyer"]);
  state.roles.set("visitor", { id: "visitor" });
  await state.service.reconcileMember(state.member);
  assert.equal(state.roles.has("visitor"), false);
});

test("extending access invalidates an expired snapshot", async () => {
  const state = fixture({ expired: true });
  const oldSnapshot = structuredClone(state.record());
  await guestRecords.registerMarketplaceGuest(state.prisma, { userId, guildId, userTag: "Wolf" }, state.now());
  await state.service.processGuest(oldSnapshot);
  assert.equal(state.calls.kick, 0);
  assert.equal(state.record().expiresAt.getTime(), state.now().getTime() + 7 * 86_400_000);
});

test("extensions cannot overwrite an active removal lease", async () => {
  const state = fixture();
  state.record().processingUntil = new Date(state.now().getTime() + 60_000);
  await assert.rejects(guestRecords.registerMarketplaceGuest(state.prisma, { userId, guildId, userTag: "Wolf" }, state.now()), /being processed/);
});

test("failed kicks remain pending and retry without a restart", async () => {
  const state = fixture({ expired: true, kickFailure: true });
  await state.service.run();
  assert.match(state.record().lastError, /Missing kick permission/);
  state.options.kickFailure = false;
  state.advance(61_000);
  await state.service.run();
  assert.equal(state.calls.kick, 2);
  assert.equal(state.record(), null);
});

test("network errors do not delete guest records", async () => {
  const state = fixture({ expired: true, fetchFailure: Object.assign(new Error("Connection reset"), { code: "ECONNRESET" }) });
  await state.service.run();
  assert.ok(state.record());
  assert.equal(state.calls.kick, 0);
});

test("confirmed departed members are cleaned up", async () => {
  const state = fixture({ fetchFailure: Object.assign(new Error("Unknown Member"), { code: 10007 }) });
  await state.service.run();
  assert.equal(state.record(), null);
});

test("successful warnings are not resent after a restart", async () => {
  const state = fixture();
  await state.service.run();
  assert.ok(state.record().warningSentAt);
  state.advance(301_000);
  await state.createService().run();
  assert.equal(state.calls.send, 1);
});

test("closed DMs do not cause repeated warning attempts", async () => {
  const state = fixture({ closedDMs: true });
  await state.service.run();
  state.advance(301_000);
  await state.createService().run();
  assert.equal(state.calls.send, 1);
  assert.equal(state.record().warningUnavailable, true);
});

test("two workers cannot kick the same claimed guest", async () => {
  const state = fixture({ expired: true });
  await Promise.all([state.service.processGuest(structuredClone(state.record())), state.createService().processGuest(structuredClone(state.record()))]);
  assert.equal(state.calls.kick, 1);
});

test("a promotion during expiry processing stops the kick", async () => {
  const state = fixture({ expired: true, promoteDuringExpiry: true });
  await state.service.run();
  assert.equal(state.calls.kick, 0);
  await state.service.run();
  assert.equal(state.record(), null);
  assert.equal(state.roles.has("captain"), true);
});

test("tracking refuses regular members and propagates persistence failures", async () => {
  const regular = fixture({ roles: [guildId, "captain"] });
  await assert.rejects(regular.service.track({ userId, guildId, userTag: "Wolf" }), /Buyer-only/);
  const unavailable = fixture({ noRecord: true, databaseFailure: true });
  await assert.rejects(unavailable.service.track({ userId, guildId, userTag: "Wolf" }), /Database unavailable/);
  assert.equal(unavailable.record(), null);
});

function joinFixture(options = {}) {
  const state = fixture({ ...options, noRecord: options.noRecord !== false });
  const code = ts.transpileModule(readFileSync(new URL("../lib/marketplace/guestJoin.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loadedModule = { exports: {} };
  const requests = [];
  vm.runInNewContext(code, {
    exports: loadedModule.exports, module: loadedModule, Date, Set, AbortSignal,
    require: (name) => {
      if (name === "server-only") return {};
      if (name === "@/lib/prisma") return { prisma: state.prisma };
      if (name === "./guestRecords.js") return guestRecords;
      throw new Error(name);
    },
    fetch: async (url, init) => {
      requests.push({ url, method: init.method || "GET" });
      if (init.method === "DELETE") return new Response(null, { status: options.removeFailure ? 403 : 204 });
      return Response.json({ roles: [...state.roles.keys()].filter((roleId) => roleId !== guildId) });
    },
  });
  const submit = () => loadedModule.exports.prepareMarketplaceGuest({ userId, guildId, userTag: "Wolf", ...config, botToken: "fake-test-token", newlyJoined: options.newlyJoined !== false });
  return { ...state, requests, submit };
}

test("new OAuth buyers are persisted and lose Visitor without replacing all roles", async () => {
  const state = joinFixture({ roles: [guildId, "buyer", "visitor"] });
  assert.equal(await state.submit(), true);
  assert.ok(state.record());
  assert.equal(state.requests[1].url.endsWith("/roles/visitor"), true);
  assert.equal(state.requests.some((request) => request.method === "PATCH"), false);
});

test("existing normal members do not get Buyer or expiry tracking", async () => {
  const state = joinFixture({ roles: [guildId, "visitor", "captain"], newlyJoined: false });
  assert.equal(await state.submit(), false);
  assert.equal(state.record(), null);
  assert.equal(state.requests.length, 1);
});

test("role-removal errors are surfaced while persistence remains retryable", async () => {
  const state = joinFixture({ roles: [guildId, "buyer", "visitor"], removeFailure: true });
  await assert.rejects(state.submit(), /Could not remove/);
  assert.ok(state.record());
});

test("existing members with an orphaned Buyer role keep their rank and lose Buyer", async () => {
  const state = joinFixture({ roles: [guildId, "buyer", "captain"], newlyJoined: false });
  assert.equal(await state.submit(), false);
  assert.equal(state.record(), null);
  assert.equal(state.requests[1].url.endsWith("/roles/buyer"), true);
  assert.equal(state.requests.some((request) => request.url.endsWith("/roles/captain")), false);
});

test("OAuth never reports success after a database failure", async () => {
  const state = joinFixture({ databaseFailure: true });
  await assert.rejects(state.submit(), /Database unavailable/);
});
