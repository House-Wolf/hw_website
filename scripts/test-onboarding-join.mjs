import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { previewSessionCookies } from "../lib/authPreview.js";

function load(path, dependencies, globals) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(code, {
    module: loadedModule, exports: loadedModule.exports,
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    AbortSignal, console: { error() {}, log() {} }, ...globals,
  });
  return loadedModule.exports;
}

function fixture(options = {}) {
  const calls = [];
  const env = { ONBOARDING_ENABLED: "true", DISCORD_GUILD_ID: "guild", DISCORD_BOT_TOKEN: "test-bot", ...options.env };
  const globals = {
    process: { env },
    fetch: async (url, init) => {
      calls.push({ url, ...init });
      if (init.method === "PUT") {
        if (options.networkFailure) throw new Error("Network unavailable");
        return new Response(null, { status: options.joinStatus ?? 201 });
      }
      return Response.json(options.member ? [{ id: "guild" }] : [], { status: options.guildStatus ?? 200 });
    },
  };
  const join = load("../lib/onboardingDiscordJoin.ts", {}, globals);
  let config;
  load("../lib/auth.ts", {
    "next-auth": { default: (value) => { config = value; return {}; } },
    "next-auth/providers/discord": { default: (value) => value },
    "@auth/prisma-adapter": { PrismaAdapter: () => ({}) },
    "@/lib/prisma": { prisma: { user: { findUnique: async () => options.inactive ? { isActive: false } : null } } },
    "@/lib/deriveUserpermissions": {},
    "@/lib/onboardingDiscordJoin": join,
    "@/lib/authPreview.js": { previewSessionCookies },
  }, globals);
  return {
    calls,
    signIn: () => config.callbacks.signIn({
      account: { provider: "discord", access_token: "test-access", scope: "identify email guilds guilds.members.read guilds.join", ...options.account },
      profile: { id: options.discordId ?? "123456789012345678" },
    }),
  };
}

test("a consenting newcomer joins without receiving roles", async () => {
  const f = fixture();
  assert.equal(await f.signIn(), true);
  const join = f.calls.find(c => c.method === "PUT");
  assert.ok(join.url.endsWith("/members/123456789012345678"));
  assert.deepEqual(JSON.parse(join.body), { access_token: "test-access" });
  assert.equal(join.headers.Authorization, "Bot test-bot");
});

test("existing members sign in without a join or role change", async () => {
  const f = fixture({ member: true });
  assert.equal(await f.signIn(), true);
  assert.equal(f.calls.length, 1);
});

for (const [name, options, expected] of [
  ["ordinary sign-in cannot add nonmembers", { account: { scope: "identify email guilds" } }, false],
  ["partial scope names do not grant consent", { account: { scope: "guilds.join.other" } }, false],
  ["missing access tokens fail closed", { account: { access_token: undefined } }, false],
  ["disabled onboarding cannot add members", { env: { ONBOARDING_ENABLED: "false" } }, "/onboarding?error=discord_join_failed"],
  ["missing bot configuration cannot add members", { env: { DISCORD_BOT_TOKEN: "" } }, "/onboarding?error=discord_join_failed"],
  ["suspended accounts cannot rejoin", { inactive: true }, "/auth/error?error=Suspended"],
  ["invalid identities cannot be used in Discord URLs", { discordId: "../other" }, "/onboarding?error=discord_join_failed"],
  ["membership lookup errors do not trigger joining", { guildStatus: 502 }, false],
]) {
  test(name, async () => {
    const f = fixture(options);
    assert.equal(await f.signIn(), expected);
    assert.equal(f.calls.filter(c => c.method === "PUT").length, 0);
  });
}

for (const options of [{ joinStatus: 403 }, { joinStatus: 429 }, { networkFailure: true }]) {
  test(`join failure remains retryable: ${JSON.stringify(options)}`, async () => {
    const f = fixture(options);
    assert.equal(await f.signIn(), "/onboarding?error=discord_join_failed");
  });
}

test("concurrent existing membership (204) permits sign-in", async () => {
  assert.equal(await fixture({ joinStatus: 204 }).signIn(), true);
});
