import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { CommandError } from "../lib/command/access.js";

const source = ts.transpileModule(readFileSync(new URL("../lib/command/discordRead.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = { exports: {} };
vm.runInNewContext(source, { module: loaded, exports: loaded.exports, AbortSignal, console, require: () => ({ CommandError }) });
const { readDiscord } = loaded.exports;
const path = "/guilds/12345678901234567/members/23456789012345678";

test("Discord auth, access, and rate limits have distinct errors without repeated requests", async () => {
  for (const [status, code] of [[401, "DISCORD_BOT_AUTH_FAILED"], [403, "DISCORD_BOT_ACCESS_DENIED"], [429, "DISCORD_RATE_LIMITED"]]) {
    const logs = []; let calls = 0;
    await assert.rejects(readDiscord(path, "secret-token", async () => { calls++; return new Response(null, { status }); }, (...args) => logs.push(args)), (e) => e.status === 503 && e.code === code);
    assert.equal(calls, 1);
    const log = JSON.stringify(logs);
    assert.match(log, /guild-member/);
    assert.ok(!log.includes("secret-token") && !log.includes("12345678901234567") && !log.includes("23456789012345678"));
  }
});

test("transient server and connection failures retry once with fresh membership data", async () => {
  for (const failure of [() => new Response(null, { status: 503 }), () => { throw new Error("timeout"); }]) {
    let calls = 0;
    const data = await readDiscord(path, "token", async (_url, options) => {
      assert.equal(options.cache, "no-store");
      assert.equal(options.headers.Authorization, "Bot token");
      assert.ok(options.signal);
      if (calls++ === 0) return failure();
      return Response.json({ roles: ["current-role"] });
    }, () => {});
    assert.equal(calls, 2);
    assert.deepEqual(data.roles, ["current-role"]);
  }
});

test("persistent outages remain denied and retries are bounded", async () => {
  for (const failure of [() => new Response(null, { status: 503 }), () => { throw new Error("sensitive network details"); }]) {
    let calls = 0;
    await assert.rejects(readDiscord(path, "token", async () => { calls++; return failure(); }, () => {}), (e) => e.status === 503 && !e.message.includes("sensitive"));
    assert.equal(calls, 2);
  }
});

test("missing membership, missing configuration, and malformed responses stay distinct", async () => {
  assert.equal(await readDiscord(path, "token", async () => new Response(null, { status: 404 })), null);
  await assert.rejects(readDiscord(path, undefined, () => { throw new Error("must not fetch"); }), (e) => e.code === "DISCORD_UNCONFIGURED");
  await assert.rejects(readDiscord(path, "token", async () => new Response("invalid json"), () => {}), (e) => e.code === "INVALID_PROVIDER_RESPONSE");
});
