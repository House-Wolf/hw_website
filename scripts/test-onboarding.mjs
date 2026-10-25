import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { createWelcomeMessage, publishPendingWelcomes, renderWelcomeBanner } from "../bot/onboardingWelcome.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";

function loadTypeScript(path, dependencies = {}, environment = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, require: (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  }, Date, Set, AbortSignal, console: { error() {} }, ...environment });
  return loadedModule.exports;
}

const onboarding = loadTypeScript("../lib/onboarding.ts");
const { readOnboardingResume } = loadTypeScript("../lib/onboardingResume.ts", { "./onboarding": onboarding });
const validInput = { interests: ["bunker-running"], otherGameSelected: false, otherGame: "", rulesAccepted: true, rulesVersion: onboarding.ONBOARDING_RULES_VERSION };

function mountOnboarding(search) {
  const states = [], effects = [], local = new Map([["housewolf-onboarding-v1", JSON.stringify(validInput)]]);
  const session = new Map([["housewolf-onboarding-resume-v1", JSON.stringify({ ...validInput, rulesAcceptedAt: Date.now() })]]);
  const storage = map => ({ getItem: key => map.get(key) || null, removeItem: key => map.delete(key) });
  const component = loadTypeScript("../app/onboarding/OnboardingExperience.tsx", {
    react: { useState(initial) { const slot = states.length; states.push(initial); return [initial, value => { states[slot] = value; }]; }, useEffect: callback => effects.push(callback), useRef: value => ({ current: value }), useCallback: callback => callback },
    "react/jsx-runtime": jsxRuntime, "next/image": { default: () => null }, "next/link": { default: () => null },
    "next-auth/react": { useSession: () => ({ data: null, status: "unauthenticated" }), signIn: async () => {} },
    "lucide-react": new Proxy({}, { get: () => () => null }),
    "@/lib/onboarding": onboarding,
    "@/lib/onboardingResume": { ONBOARDING_RESUME_KEY: "housewolf-onboarding-resume-v1", readOnboardingResume },
    "./onboarding.module.css": { default: new Proxy({}, { get: (_, key) => String(key) }) },
  }, { window: { location: { search } }, localStorage: storage(local), sessionStorage: storage(session), URLSearchParams });
  component.default(); effects[0]();
  return { states, local, session };
}

test("a fresh onboarding visit starts unselected and discards the previous person's saved choices", () => {
  const page = mountOnboarding("");
  assert.deepEqual(Array.from(page.states[1]), []);
  assert.equal(page.states[2], false);
  assert.equal(page.states[3], "");
  assert.equal(page.states[4], false);
  assert.equal(page.local.size, 0);
  assert.equal(page.session.size, 0);
});
test("only the current Discord return restores the one-time accepted onboarding choices", () => {
  const page = mountOnboarding("?connected=1");
  assert.deepEqual(Array.from(page.states[1]), validInput.interests);
  assert.equal(page.states[4], true);
  assert.equal(page.session.size, 0);
});

test("a recent accepted onboarding draft survives the Discord round trip", () => {
  const now = Date.now();
  const resume = readOnboardingResume(JSON.stringify({ ...validInput, rulesAcceptedAt: now - 60_000 }), now);
  assert.deepEqual(Array.from(resume.interests), validInput.interests);
});

test("a callback URL alone, expired agreement, or changed rules cannot complete onboarding", () => {
  const now = Date.now();
  for (const raw of [null, "bad json", "{}", JSON.stringify({ ...validInput, rulesAcceptedAt: now, rulesAccepted: false }), JSON.stringify({ ...validInput, rulesAcceptedAt: now, rulesVersion: "old" }), JSON.stringify({ ...validInput, rulesAcceptedAt: now - 31 * 60_000 }), JSON.stringify({ ...validInput, rulesAcceptedAt: now + 1 }), JSON.stringify({ ...validInput, rulesAcceptedAt: String(now) })]) {
    assert.equal(readOnboardingResume(raw, now), null);
  }
});

function createFixture(options = {}) {
  const writes = [];
  const discordCalls = [];
  const guestCalls = [];
  const saved = options.saved || null;
  const prisma = {
    marketplaceGuest: {
      findUnique: async () => options.guest ? { id: 1 } : null,
      updateMany: async (query) => { guestCalls.push({ action: "claim", query }); return { count: options.guestBusy ? 0 : 1 }; },
      deleteMany: async (query) => { guestCalls.push({ action: "retire", query }); if (options.cleanupFailure) throw new Error("Database unavailable"); return { count: 1 }; },
    },
    user: { findUnique: async () => ({ isActive: options.active !== false }) },
    onboardingProfile: {
      findUnique: async () => saved,
      upsert: async (query) => { writes.push({ action: "save", query }); },
      update: async (query) => { writes.push({ action: "complete", query }); },
      updateMany: async (query) => { writes.push({ action: "reset-welcome", query }); return { count: 1 }; },
    },
  };
  const route = loadTypeScript("../app/api/onboarding/route.ts", {
    "node:crypto": { randomUUID },
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "@/lib/auth": { auth: async () => options.signedOut ? null : { user: { id: "member-id", discordId: "123456789", isActive: true } } },
    "@/lib/onboarding": onboarding,
    "@/lib/prisma": { prisma },
    "@/lib/personnel/policy.js": { PERSONNEL_ROLES },
    "@/lib/rate-limit": { rateLimit: async () => ({ success: !options.limited }), createRateLimitHeaders: () => ({ "X-RateLimit-Limit": "5" }) },
  }, {
    process: { env: { ONBOARDING_ENABLED: "true", DISCORD_GUILD_ID: "guild", DISCORD_BOT_TOKEN: "fake-test-token", VISITOR_ROLE_ID: "visitor", BUYER_ROLE_ID: "buyer", GENERAL_CHANNEL_ID: "general" } },
    fetch: async (url, init) => {
      discordCalls.push({ url, method: init.method || "GET" });
      if (init.method === "DELETE") return new Response(null, { status: options.buyerRemovalFailure ? 403 : 204 });
      if (init.method === "PUT") return new Response(null, { status: options.roleFailure ? 403 : 204 });
      if (options.notMember) return new Response(null, { status: 404 });
      return Response.json({ roles: options.buyer ? ["buyer"] : saved ? ["visitor"] : [], joined_at: options.joinedAt });
    },
  });
  const request = { nextUrl: new URL("https://housewolf.test/api/onboarding"), headers: new Headers({ origin: options.foreignOrigin ? "https://other.test" : "https://housewolf.test" }), json: async () => options.input || validInput };
  return { submit: () => route.POST(request), writes, discordCalls, guestCalls };
}

test("Other game can be the only selection; text is trimmed", () => {
  const result = onboarding.validateOnboardingChoices({ interests: [], otherGameSelected: true, otherGame: "  DayZ  " });
  assert.equal(result.otherGame, "DayZ");
});

test("invalid interests and incomplete Other game are rejected", () => {
  for (const input of [null, {}, { ...validInput, interests: ["admin"] }, { ...validInput, interests: [] }, { ...validInput, otherGameSelected: true }, { ...validInput, otherGameSelected: true, otherGame: "a".repeat(101) }]) {
    assert.equal(onboarding.validateOnboardingChoices(input), null);
  }
});

for (const [name, options, expected] of [
  ["requires authentication", { signedOut: true }, 401],
  ["rejects foreign origins", { foreignOrigin: true }, 403],
  ["enforces rate limits", { limited: true }, 429],
  ["requires rules agreement", { input: { ...validInput, rulesAccepted: false } }, 400],
  ["rejects old rules versions", { input: { ...validInput, rulesVersion: "old" } }, 400],
  ["rejects inactive accounts", { active: false }, 403],
  ["requires current guild membership", { notMember: true }, 403],
]) {
  test(name, async () => {
    const fixture = createFixture(options);
    const result = await fixture.submit();
    assert.equal(result.status, expected);
    assert.equal(fixture.writes.length, 0);
    assert.equal(fixture.discordCalls.filter((call) => call.method === "PUT").length, 0);
  });
}

test("regular onboarding converts an existing Buyer and retires guest expiry", async () => {
  const fixture = createFixture({ buyer: true, guest: true });
  assert.equal((await fixture.submit()).status, 200);
  assert.deepEqual(fixture.discordCalls.map(call => call.method), ["GET", "DELETE", "PUT"]);
  assert.ok(fixture.discordCalls[1].url.endsWith("/roles/buyer"));
  assert.ok(fixture.discordCalls[2].url.endsWith("/roles/visitor"));
  assert.ok(fixture.guestCalls.some(call => call.action === "retire"));
  assert.deepEqual(fixture.writes.map(write => write.action), ["save", "complete"]);
});

test("an untracked Buyer can choose regular onboarding", async () => {
  const fixture = createFixture({ buyer: true });
  assert.equal((await fixture.submit()).status, 200);
  assert.equal(fixture.discordCalls[1].method, "DELETE");
});

test("failed Visitor grant after Buyer conversion stays pending for retry", async () => {
  const fixture = createFixture({ buyer: true, guest: true, roleFailure: true });
  assert.equal((await fixture.submit()).status, 502);
  assert.ok(fixture.guestCalls.some(call => call.action === "retire"));
  assert.deepEqual(fixture.writes.map(write => write.action), ["save"]);
  assert.equal(fixture.writes[0].query.create.completedAt, null);
});

for (const [name, options, status] of [
  ["an active guest expiry lease blocks conversion", { guestBusy: true }, 409],
  ["Buyer removal must succeed before Visitor is granted", { buyerRemovalFailure: true }, 502],
  ["guest cleanup failure does not complete onboarding", { cleanupFailure: true }, 500],
]) {
  test(name, async () => {
    const fixture = createFixture({ buyer: true, guest: true, ...options });
    assert.equal((await fixture.submit()).status, status);
    assert.equal(fixture.writes.length, 0);
    assert.equal(fixture.discordCalls.filter(call => call.method === "PUT").length, 0);
  });
}

test("a former completed Buyer regains Visitor through regular onboarding", async () => {
  const fixture = createFixture({ buyer: true, saved: { completedAt: new Date(), rulesVersion: onboarding.ONBOARDING_RULES_VERSION } });
  assert.equal((await fixture.submit()).status, 200);
  assert.equal(fixture.discordCalls.at(-1).method, "PUT");
});

test("failed Visitor assignment keeps a pending record and does not complete", async () => {
  const fixture = createFixture({ roleFailure: true });
  assert.equal((await fixture.submit()).status, 502);
  assert.equal(fixture.writes.length, 1);
  assert.equal(fixture.writes[0].query.create.completedAt, null);
});

test("completion is recorded after Visitor role assignment", async () => {
  const fixture = createFixture();
  const response = await fixture.submit();
  assert.equal(response.status, 200);
  assert.equal(fixture.discordCalls[1].url.endsWith("/roles/visitor"), true);
  assert.deepEqual(fixture.writes.map((write) => write.action), ["save", "complete"]);
  assert.equal((await response.json()).discordUrl, "https://discord.com/channels/guild");
});

test("repeated completion does not reassign roles or rewrite the agreement", async () => {
  const fixture = createFixture({ saved: { completedAt: new Date(), rulesVersion: onboarding.ONBOARDING_RULES_VERSION } });
  assert.equal((await fixture.submit()).status, 200);
  assert.equal(fixture.writes.length, 0);
  assert.equal(fixture.discordCalls.length, 1);
});

const snowflakeAt = date => ((BigInt(new Date(date).getTime()) - BigInt("1420070400000")) << BigInt(22)).toString();

test("a rejoining member queues a fresh welcome only after onboarding completes", async () => {
  const fixture = createFixture({ joinedAt: "2026-10-22T10:36:00Z", saved: { completedAt: new Date(), rulesVersion: onboarding.ONBOARDING_RULES_VERSION, welcomeMessageId: snowflakeAt("2026-10-22T08:49:00Z") } });
  assert.equal((await fixture.submit()).status, 200);
  assert.deepEqual(fixture.writes.map(write => write.action), ["reset-welcome", "save", "complete"]);
  assert.equal(fixture.writes[0].query.data.welcomeMessageId, null);
  assert.equal(fixture.writes[0].query.data.completedAt, null);
  assert.ok(fixture.writes.at(-1).query.data.completedAt);
});

test("same-membership retries preserve a delivered welcome", async () => {
  const fixture = createFixture({ joinedAt: "2026-10-22T08:00:00Z", saved: { completedAt: new Date(), rulesVersion: onboarding.ONBOARDING_RULES_VERSION, welcomeMessageId: snowflakeAt("2026-10-22T08:49:00Z") } });
  assert.equal((await fixture.submit()).status, 200);
  assert.equal(fixture.writes.length, 0);
});

test("new onboarding completions get a distinct welcome nonce while retries keep it", () => {
  const profile = { userId: "member", interests: [], otherGame: "DayZ", completedAt: "2026-10-22T08:49:00Z" };
  const first = createWelcomeMessage(profile, "123");
  assert.equal(first.nonce, createWelcomeMessage(profile, "123").nonce);
  assert.notEqual(first.nonce, createWelcomeMessage({ ...profile, completedAt: "2026-10-22T10:40:00Z" }, "123").nonce);
});

test("welcome shares one card for banner and text and restricts mentions", () => {
  const message = createWelcomeMessage({ userId: "member", interests: ["bunker-running", "space-trucking"], otherGame: "@everyone **DayZ**" }, "123");
  assert.equal(message.flags, 32768);
  assert.equal(message.embeds, undefined);
  assert.equal(message.components.length, 1);
  const card = message.components[0];
  assert.equal(card.type, 17);
  assert.equal(card.components[0].type, 12);
  assert.equal(card.components[0].items[0].media.url, "attachment://house-wolf-welcome.png");
  const text = card.components.slice(1).map(component => component.content).join("\n");
  assert.match(text, /STAR CITIZEN/);
  assert.match(text, /Bunker Running\n.*Space Trucking/);
  assert.match(text, /DayZ/);
  assert.equal(text.includes("@everyone"), false);
  assert.match(text, /Say hello, invite them/);
  assert.equal(card.components.at(-1).content, "-# This is the Way!");
  assert.deepEqual(message.allowedMentions, { parse: [], users: ["123"] });
  assert.equal(message.enforceNonce, true);
  assert.equal(message.content, undefined);
});

test("other-game-only welcome introduces the member without empty Star Citizen text", () => {
  const message = createWelcomeMessage({ userId: "member", interests: [], otherGame: "DayZ" }, "123", "Wolf @everyone");
  const text = JSON.stringify(message.components);
  assert.match(text, /DayZ/);
  assert.match(text, /Wolf/);
  assert.equal(text.includes("STAR CITIZEN"), false);
  assert.equal(text.includes("@everyone"), false);
});

test("welcome omits other games when none were listed", () => {
  const message = createWelcomeMessage({ userId: "member", interests: ["bounty-hunting"], otherGame: null }, "123", "Wolf");
  const card = message.components[0];
  assert.match(JSON.stringify(card), /Bounty Hunting/);
  assert.equal(card.components.length, 5);
});

test("welcome banner renders with a safely escaped member name", async () => {
  const banner = await renderWelcomeBanner('<Wolf & "Pack">');
  assert.equal(banner.subarray(1, 4).toString(), "PNG");
  assert.equal((await sharp(banner).metadata()).height, 420);
  const larger = await renderWelcomeBanner("Wolf", undefined, { large: true, footer: "This is the Way!" });
  assert.equal((await sharp(larger).metadata()).height, 520);
});

test("welcome worker does nothing while onboarding is disabled", async () => {
  const previous = process.env.ONBOARDING_ENABLED;
  process.env.ONBOARDING_ENABLED = "false";
  try {
    await publishPendingWelcomes({ isReady: () => true }, { onboardingProfile: { findMany: () => { throw new Error("Must not query pending welcomes"); } } });
  } finally {
    if (previous === undefined) delete process.env.ONBOARDING_ENABLED;
    else process.env.ONBOARDING_ENABLED = previous;
  }
});

for (const scenario of ["delivered", "send-failure", "claimed-elsewhere", "buyer", "inactive-backlog"]) {
  test(`welcome worker: ${scenario}`, async () => {
    const previous = { ...process.env };
    Object.assign(process.env, { ONBOARDING_ENABLED: "true", GENERAL_CHANNEL_ID: "general", DISCORD_GUILD_ID: "guild", BUYER_ROLE_ID: "buyer" });
    const updates = [];
    const sent = [];
    const profile = { userId: "member", interests: ["bunker-running"], otherGame: "DayZ", user: { discordId: "123", isActive: true } };
    const member = { id: "123", displayName: "Wolf", roles: { cache: new Set(scenario === "buyer" ? ["buyer"] : []) }, user: { displayAvatarURL() { throw new Error("Use logo fallback in tests"); } } };
    const client = {
      isReady: () => true,
      guilds: { fetch: async () => ({ id: "guild", members: { fetch: async () => member } }) },
      channels: { fetch: async () => ({ guildId: "guild", isTextBased: () => true, send: async (payload) => {
        if (scenario === "send-failure") throw new Error("Missing channel permission");
        sent.push(payload);
        return { id: "welcome-message" };
      } }) },
    };
    const prisma = { onboardingProfile: {
      findMany: async ({ where, take }) => {
        const profiles = scenario === "inactive-backlog"
          ? [...Array.from({ length: 10 }, (_, index) => ({ ...profile, userId: `inactive-${index}`, user: { ...profile.user, isActive: false } })), profile]
          : [profile];
        return profiles.filter(value => !where.user?.isActive || value.user.isActive).slice(0, take);
      },
      updateMany: async (query) => { updates.push(query); return { count: scenario === "claimed-elsewhere" ? 0 : 1 }; },
      update: async (query) => { updates.push(query); },
    } };
    try {
      await publishPendingWelcomes(client, prisma);
      const delivered = ["delivered", "inactive-backlog"].includes(scenario);
      assert.equal(sent.length, delivered ? 1 : 0);
      const completed = updates.find((query) => query.data.welcomeMessageId);
      assert.equal(Boolean(completed), delivered);
      if (delivered) {
        assert.equal(completed.data.welcomeMessageId, "welcome-message");
        assert.equal(sent[0].content, undefined);
        const card = JSON.stringify(sent[0].components[0]);
        assert.match(card, /Wolf/);
        assert.match(card, /Bunker Running/);
        assert.match(card, /DayZ/);
        assert.equal(sent[0].components.length, 1);
        assert.equal(sent[0].embeds, undefined);
      }
      if (scenario === "send-failure") assert.equal(updates.at(-1).data.welcomeLastError, "Missing channel permission");
      if (scenario === "buyer") assert.match(updates.at(-1).data.welcomeLastError, /Buyer role/);
    } finally {
      for (const key of ["ONBOARDING_ENABLED", "GENERAL_CHANNEL_ID", "DISCORD_GUILD_ID", "BUYER_ROLE_ID"]) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
    }
  });
}
