import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createPersonnelStartup, validateBotEnvironment } from "../bot/runtime.js";

function startupFixture() {
  const state = { ready: true, mappingFailures: 0, registrationFailures: 0, workerFailures: 0, mappingCalls: 0, registrationCalls: 0, workerCalls: 0, workerStops: 0, timers: new Set(), errors: [] };
  const client = { isReady: () => state.ready };
  state.controller = createPersonnelStartup({
    client, guildId: "guild",
    personnel: {
      ensureCommandsConfigured: async () => {
        state.mappingCalls++;
        if (state.mappingBarrier) await state.mappingBarrier;
        if (state.mappingFailures-- > 0) throw new Error("Database temporarily unavailable");
        if (state.disconnectDuringMapping) state.ready = false;
        return ["Mappings configured"];
      },
      start: () => {
        state.workerCalls++;
        if (state.workerFailures-- > 0) throw new Error("Worker startup failed");
        return () => { state.workerStops++; };
      },
    },
    registerCommands: async (actualClient, guildId) => {
      assert.equal(actualClient, client);
      assert.equal(guildId, "guild");
      state.registrationCalls++;
      if (state.registrationFailures-- > 0) throw new Error("Discord temporarily unavailable");
    },
    logger: { log() {}, error: (...args) => state.errors.push(args.join(" ")) },
    setTimer: (callback, delay) => {
      const timer = { callback, delay, unref() {} };
      state.timers.add(timer);
      return timer;
    },
    clearTimer: timer => state.timers.delete(timer),
  });
  state.retry = async () => {
    assert.equal(state.timers.size, 1);
    const timer = [...state.timers][0];
    state.timers.delete(timer);
    timer.callback();
    await new Promise(resolve => setImmediate(resolve));
    return timer.delay;
  };
  return state;
}

test("personnel worker starts once after mappings and command registration succeed", async () => {
  const state = startupFixture();
  await Promise.all([state.controller.start(), state.controller.start()]);
  await state.controller.start();
  assert.equal(state.mappingCalls, 1);
  assert.equal(state.registrationCalls, 1);
  assert.equal(state.workerCalls, 1);
  assert.equal(state.timers.size, 0);
});

for (const failure of ["mappingFailures", "registrationFailures", "workerFailures"]) {
  test(`personnel startup recovers automatically from ${failure}`, async () => {
    const state = startupFixture();
    state[failure] = 1;
    await state.controller.start();
    assert.equal(state.timers.size, 1);
    assert.match(state.errors[0], /retrying in 5s/);
    assert.equal(await state.retry(), 5_000);
    assert.equal(state.timers.size, 0);
    assert.equal(state.registrationCalls, failure === "mappingFailures" ? 1 : 2);
    assert.equal(state.workerCalls, failure === "workerFailures" ? 2 : 1);
    await state.controller.start();
    assert.equal(state.timers.size, 0);
  });
}

test("startup retries back off and cap at one minute without overlapping attempts", async () => {
  const state = startupFixture();
  state.mappingFailures = 20;
  await state.controller.start();
  for (const delay of [5_000, 10_000, 20_000, 40_000, 60_000, 60_000]) {
    const before = state.mappingCalls;
    await state.controller.start();
    assert.equal(state.mappingCalls, before, "an existing retry must not be bypassed");
    assert.equal(await state.retry(), delay);
  }
  assert.equal(state.workerCalls, 0);
  state.controller.stop();
  assert.equal(state.timers.size, 0);
});

test("concurrent startup calls cannot create duplicate workers while setup is pending", async () => {
  const state = startupFixture();
  let release;
  state.mappingBarrier = new Promise(resolve => { release = resolve; });
  const first = state.controller.start();
  await state.controller.start();
  assert.equal(state.mappingCalls, 1);
  release();
  await first;
  assert.equal(state.workerCalls, 1);
});

test("startup waits for Discord readiness and recovers from disconnects during setup", async () => {
  const state = startupFixture();
  state.ready = false;
  await state.controller.start();
  assert.equal(state.mappingCalls, 0);
  state.ready = true;
  state.disconnectDuringMapping = true;
  await state.retry();
  assert.equal(state.registrationCalls, 0);
  assert.equal(state.workerCalls, 0);
  state.ready = true;
  state.disconnectDuringMapping = false;
  await state.retry();
  assert.equal(state.workerCalls, 1);
});

test("stopping startup cancels pending retries and prevents a delayed worker start", async () => {
  const state = startupFixture();
  let release;
  state.mappingBarrier = new Promise(resolve => { release = resolve; });
  const first = state.controller.start();
  state.controller.stop();
  release();
  await first;
  await state.controller.start();
  assert.equal(state.registrationCalls, 0);
  assert.equal(state.workerCalls, 0);
  assert.equal(state.timers.size, 0);
});

test("stopping a successfully started worker runs cleanup only once", async () => {
  const state = startupFixture();
  await state.controller.start();
  state.controller.stop();
  state.controller.stop();
  assert.equal(state.workerStops, 1);
});

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
