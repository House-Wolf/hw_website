import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { validateBotEnvironment } from "../bot/runtime.js";

const configured = { DISCORD_BOT_TOKEN: "test-only-secret", DISCORD_GUILD_ID: "guild", BUYER_ROLE_ID: "buyer", DATABASE_URL: "postgresql://test-only", NODE_ENV: "production", BOT_HTTP_ENABLED: "false" };

test("daemon startup requires runtime secrets without exposing their values", () => {
  assert.doesNotThrow(() => validateBotEnvironment(configured));
  for (const key of ["DISCORD_BOT_TOKEN", "DISCORD_GUILD_ID", "BUYER_ROLE_ID", "DATABASE_URL"]) {
    assert.throws(() => validateBotEnvironment({ ...configured, [key]: " " }), (error) => error.message.includes(key) && !error.message.includes("test-only-secret"));
  }
});

test("enabled onboarding requires its channel and public website URL", () => {
  assert.throws(() => validateBotEnvironment({ ...configured, ONBOARDING_ENABLED: "true" }), /GENERAL_CHANNEL_ID, NEXTAUTH_URL/);
  assert.doesNotThrow(() => validateBotEnvironment({ ...configured, ONBOARDING_ENABLED: "true", GENERAL_CHANNEL_ID: "general", NEXTAUTH_URL: "https://example.com" }));
});

test("standalone production HTTP requires service authentication but daemon does not", () => {
  assert.throws(() => validateBotEnvironment({ ...configured, BOT_HTTP_ENABLED: "true" }), /BOT_SERVICE_TOKEN/);
  assert.doesNotThrow(() => validateBotEnvironment({ ...configured, BOT_HTTP_ENABLED: "true", BOT_SERVICE_TOKEN: "test-only-internal-secret" }));
});

test("Vercel keeps the website build and declares one background bot instance", async () => {
  const configuration = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.equal(configuration.buildCommand, "pnpm run build");
  assert.deepEqual(configuration.daemons["discord-bot"].instances, { iad1: 1 });
  assert.equal(configuration.daemons["discord-bot"].entrypoint, "Dockerfile.discord");
  assert.equal(configuration.daemons["discord-bot"].root, ".");
  assert.equal(configuration.crons, undefined);
});

test("container includes generated Linux Prisma, native rendering assets, and no local secrets", async () => {
  const dockerfile = await readFile(new URL("../Dockerfile.discord", import.meta.url), "utf8");
  assert.match(dockerfile, /pnpm install --prod --frozen-lockfile --ignore-scripts/);
  assert.match(dockerfile, /pnpm exec prisma generate/);
  assert.match(dockerfile, /ENV BOT_HTTP_ENABLED=false/);
  assert.match(dockerfile, /USER node/);
  assert.doesNotMatch(dockerfile, /COPY \. |COPY \.env|ARG DISCORD_BOT_TOKEN|prisma migrate deploy/);
  for (const asset of ["Websitebgnew.png", "HWiconnew.png"]) {
    assert.ok((await readFile(new URL(`../public/images/global/${asset}`, import.meta.url))).length > 0);
    assert.ok(dockerfile.includes(asset));
  }
});

test("all bot relative JavaScript dependencies are included in the container", async () => {
  const visited = new Set();
  async function inspect(url) {
    if (visited.has(url.href)) return;
    visited.add(url.href);
    const source = await readFile(url, "utf8");
    for (const match of source.matchAll(/from\s+["'](\.[^"']+\.js)["']/g)) {
      const dependency = new URL(match[1], url);
      assert.match(dependency.pathname, /\/(bot\/|lib\/personnel\/|lib\/marketplace\/guestRecords\.js$)/);
      await inspect(dependency);
    }
  }
  await inspect(new URL("../bot/index.js", import.meta.url));
  assert.ok(visited.size > 5);
});
