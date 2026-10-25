import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function fixture(fetch) {
  const timers = [], cleared = [], loaded = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL("../lib/command/browserApi.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, fetch, AbortController, setTimeout(fn, ms) { assert.equal(ms, 45000); timers.push(fn); return timers.length; }, clearTimeout(id) { cleared.push(id); } });
  return { api: loaded.exports.commandApi, expire: () => timers[0](), cleared };
}

test("stalled saves time out, abort the request, and never automatically resubmit", async () => {
  let calls = 0, signal;
  const f = fixture(async (_url, init) => { calls++; signal = init.signal; return new Promise(() => {}); });
  const saving = f.api("operations/op/debrief", "POST", { summary: "Keep this text" });
  f.expire();
  await assert.rejects(saving, /timed out.*text is still here.*check whether it saved/i);
  assert.equal(signal.aborted, true); assert.equal(calls, 1); assert.deepEqual(f.cleared, [1]);
});

test("the deadline also bounds a stalled response body", async () => {
  const f = fixture(async () => ({ ok: true, json: () => new Promise(() => {}) }));
  const loading = f.api("operations/op/debrief");
  await Promise.resolve(); f.expire();
  await assert.rejects(loading, /timed out/);
  assert.deepEqual(f.cleared, [1]);
});

test("network errors and non-JSON responses provide actionable errors", async () => {
  await assert.rejects(fixture(async () => { throw new TypeError("Failed to fetch"); }).api("operations/op/debrief", "POST", {}), /Could not reach.*text is still here/);
  await assert.rejects(fixture(async () => ({ ok: true, json: async () => { throw new SyntaxError(); } })).api("operations/op/debrief"), /unreadable response/);
  await assert.rejects(fixture(async () => ({ ok: true, json: async () => ({}) })).api("operations/op/debrief"), /unexpected response/);
});

test("successful responses and server validation errors keep their existing contract", async () => {
  let request;
  const f = fixture(async (url, init) => { request = { url, ...init }; return { ok: true, json: async () => ({ data: { revision: 2 } }) }; });
  assert.equal((await f.api("operations/op/debrief", "POST", { revision: 1 })).revision, 2);
  assert.equal(request.url, "/api/command/operations/op/debrief"); assert.equal(request.cache, "no-store");
  assert.equal(JSON.parse(request.body).revision, 1); assert.deepEqual(f.cleared, [1]);
  await assert.rejects(fixture(async () => ({ ok: false, json: async () => ({ error: "Reload before saving." }) })).api("operations/op/debrief"), /Reload before saving/);
});
