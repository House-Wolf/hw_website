import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(file, dependencies, globals = {}) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, require(name) {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`); return dependencies[name];
  }, URL, AbortSignal, Date, console: { error() {} }, ...globals });
  return loadedModule.exports;
}

const server = { createMarketplaceThreadPayload: () => ({ buyerId: "buyer", sellerId: "seller", itemTitle: "Ship @everyone", itemPrice: 123, itemImageUrl: "/image.png" }) };

function fixture(options = {}) {
  const calls = [];
  const env = { DISCORD_BOT_TOKEN: "test-token", DISCORD_GUILD_ID: "guild", MARKETPLACE_CHANNEL_ID: "market", ...options.env };
  const service = load("../lib/marketplace/messaging.ts", {
    "server-only": {}, "node:crypto": { createHash }, "@/lib/imageSource": { normalizeImageSource: value => value }, "./server": server,
  }, { process: { env }, fetch: async (url, init) => {
    const endpoint = new URL(url).pathname.replace("/api/v10", "");
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ endpoint, ...init, body });
    if (options.invalidToken) return Response.json({ code: 0 }, { status: 401 });
    if (options.networkFailure) throw new Error("Network unavailable");
    if (endpoint.startsWith("/guilds/")) return options.notMember ? Response.json({ code: 10007 }, { status: 404 }) : options.lookupFailure ? Response.json({ code: 50001 }, { status: 403 }) : Response.json({ user: { id: "buyer" } });
    if (endpoint === "/channels/market") return Response.json({ id: "market", type: 0, guild_id: options.wrongGuild ? "other" : "guild" });
    if (endpoint === "/channels/market/messages") return options.postFailure ? Response.json({ code: 50013 }, { status: 403 }) : Response.json({ id: "inquiry" });
    if (endpoint.endsWith("/threads")) return options.threadFailure ? Response.json({ code: 50013 }, { status: 403 }) : Response.json({ id: "thread" });
    if (endpoint === "/users/@me/channels") return options.closedDMs ? Response.json({ code: 50007 }, { status: 403 }) : Response.json({ id: `dm-${body.recipient_id}` });
    return Response.json({ id: "message" });
  } });
  return { service, calls, submit: () => service.contactMarketplaceSeller({ id: "listing" }, { discordId: "buyer" }) };
}

test("contact creates a Discord inquiry, thread, and buyer/seller DMs without the bot HTTP service", async () => {
  const f = fixture();
  const result = await f.submit();
  assert.equal(result.method, "thread");
  assert.equal(result.threadUrl, "https://discord.com/channels/guild/thread");
  assert.equal(result.dmNotifications.buyer, true);
  assert.equal(result.dmNotifications.seller, true);
  const inquiry = f.calls.find(call => call.endpoint === "/channels/market/messages");
  assert.deepEqual(inquiry.body.allowed_mentions, { parse: [], users: ["buyer", "seller"] });
  assert.equal(JSON.stringify(inquiry.body.embeds).includes("@everyone"), false);
  assert.equal(inquiry.body.embeds[0].thumbnail, undefined);
  assert.equal(f.calls.filter(call => call.endpoint.startsWith("/channels/dm-")).length, 2);
  assert.ok(f.calls.every(call => call.headers.Authorization === "Bot test-token"));
});

test("nonmembers require OAuth before any posts or notifications", async () => {
  const f = fixture({ notMember: true });
  assert.equal((await f.submit()).method, "invite_required");
  assert.equal(f.calls.length, 1);
});

test("closed DMs do not hide the successful thread from the modal", async () => {
  const result = await fixture({ closedDMs: true }).submit();
  assert.equal(result.method, "thread");
  assert.equal(result.dmNotifications.buyer, false);
  assert.equal(result.dmNotifications.seller, false);
});

test("invalid bot credentials return an actionable configuration error", async () => {
  await assert.rejects(fixture({ invalidToken: true }).submit(), error => error.status === 503 && error.message.includes("update the bot token"));
});

test("thread permission failure preserves inquiry link and notifications", async () => {
  const result = await fixture({ threadFailure: true }).submit();
  assert.equal(result.method, "channel");
  assert.equal(result.threadUrl, "https://discord.com/channels/guild/market/inquiry");
  assert.equal(result.dmNotifications.seller, true);
});

for (const [name, options] of [
  ["missing configuration", { env: { DISCORD_BOT_TOKEN: "" } }],
  ["wrong server channel", { wrongGuild: true }],
  ["membership API failure", { lookupFailure: true }],
  ["inquiry permission failure", { postFailure: true }],
  ["Discord outage", { networkFailure: true }],
]) test(`${name} never reports a successful inquiry`, async () => {
  await assert.rejects(fixture(options).submit());
});

function routeFixture(options = {}) {
  let contacts = 0;
  const service = fixture().service;
  const route = load("../app/api/marketplace/contact-seller/route.ts", {
    "@/lib/auth": { auth: async () => options.signedOut ? null : { user: { id: "user", discordId: "buyer", isActive: !options.suspended } } },
    "@/lib/rate-limit": { getClientIp: () => "ip", getRateLimitIdentifier: () => "buyer", RATE_LIMITS: { CONTACT: {} }, rateLimit: async () => ({ success: !options.limited }), createRateLimitHeaders: () => ({ "X-RateLimit-Limit": "5" }) },
    "@/lib/marketplace/server": { getContactableMarketplaceListing: async () => options.unavailable ? null : { sellerUserId: "seller-user", seller: { discordId: options.selfContact ? "buyer" : "seller" } } },
    "@/lib/marketplace/messaging": { ...service, contactMarketplaceSeller: async () => { contacts++; return { success: true, method: "thread", threadUrl: "https://discord.com/channels/guild/thread" }; } },
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
  });
  const request = { nextUrl: new URL("https://www.housewolf.co/api/marketplace/contact-seller"), headers: new Headers({ origin: options.foreignOrigin ? "https://other.test" : "https://www.housewolf.co" }), json: async () => ({ listingId: "listing" }) };
  return { submit: () => route.POST(request), contacts: () => contacts };
}

for (const [options, status] of [[{ signedOut: true }, 401], [{ suspended: true }, 403], [{ foreignOrigin: true }, 403], [{ limited: true }, 429], [{ selfContact: true }, 400], [{ unavailable: true }, 404]]) {
  test(`contact route refuses unsafe or unavailable request: ${JSON.stringify(options)}`, async () => {
    const f = routeFixture(options);
    assert.equal((await f.submit()).status, status);
    assert.equal(f.contacts(), 0);
  });
}

test("contact route returns a modal link and rate-limit headers", async () => {
  const response = await routeFixture().submit();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-RateLimit-Limit"), "5");
  assert.ok((await response.json()).threadUrl);
});

test("auth proxy retains www even when Auth.js overrides its request URL with apex", async () => {
  const proxy = load("../proxy.ts", {
    "@/lib/auth": { auth: handler => request => handler({ ...request, url: "https://housewolf.co/auth/signin", auth: { user: {} }, nextUrl: { pathname: "/auth/signin" } }) },
    "next/server": { NextResponse: { redirect: url => Response.redirect(url), next: () => new Response() } },
  }).default;
  const response = await proxy({ url: "https://www.housewolf.co/auth/signin" }, {});
  assert.equal(response.headers.get("location"), "https://www.housewolf.co/dashboard");
});

for (const [auth, expected] of [[null, 401], [{ user: { isActive: false } }, 403]]) {
  test(`protected contact API returns JSON ${expected} instead of an HTML redirect`, async () => {
    const proxy = load("../proxy.ts", {
      "@/lib/auth": { auth: handler => request => handler({ ...request, url: "https://housewolf.co/api/marketplace/contact-seller", auth, nextUrl: { pathname: "/api/marketplace/contact-seller" } }) },
      "next/server": { NextResponse: { redirect: url => Response.redirect(url), json: (body, init) => Response.json(body, init), next: () => new Response() } },
    }).default;
    const response = await proxy({ url: "https://www.housewolf.co/api/marketplace/contact-seller" }, {});
    assert.equal(response.status, expected);
    assert.equal(response.headers.get("location"), null);
    assert.ok((await response.json()).error);
  });
}
