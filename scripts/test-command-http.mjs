import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server.js";
import * as access from "../lib/command/access.js";
function fixture() {
  const state = { session: { user: { id: "test-user" } }, limited: false, calls: 0 };
  const processMock = { env: { COMMAND_DASHBOARD_ENABLED: "true", NEXTAUTH_URL: "https://housewolf.example" } };
  const loaded = { exports: {} };
  const source = ts.transpileModule(readFileSync(new URL("../lib/command/http.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { module: loaded, exports: loaded.exports, Buffer, process: processMock, console: { error() {} }, require(name) {
    if (name === "node:crypto") return { randomUUID: () => "correlation" };
    if (name === "next/server") return { NextResponse };
    if (name === "@/lib/auth") return { auth: async () => state.session };
    if (name === "./access.js") return access;
    if (name === "@/lib/rate-limit") return { rateLimit: async () => ({ success: !state.limited }), RATE_LIMITS: { API_WRITE: {} }, createRateLimitHeaders: () => ({ "Retry-After": "60" }) };
    throw new Error("Unexpected dependency " + name);
  } });
  const request = (options = {}) => new NextRequest("https://housewolf.example/api/command/operations", { method: "POST", headers: { origin: "https://housewolf.example", "Content-Type": "application/json" }, body: "{}", ...options });
  return { ...loaded.exports, state, processMock, request };
}
test("command API returns 401, 403, 503, 429 without running denied writes", async () => {
  const f = fixture(); const write = async () => { f.state.calls++; return { id: "test" }; };
  f.state.session = null; assert.equal((await f.commandHttp(f.request(), true, write)).status, 401);
  f.state.session = { user: { id: "test" } };
  assert.equal((await f.commandHttp(f.request({ headers: { origin: "https://attacker.example" } }), true, write)).status, 403);
  f.processMock.env.COMMAND_DASHBOARD_ENABLED = "false"; assert.equal((await f.commandHttp(f.request(), true, write)).status, 503);
  f.processMock.env.COMMAND_DASHBOARD_ENABLED = "true"; f.state.limited = true; assert.equal((await f.commandHttp(f.request(), true, write)).status, 429);
  assert.equal(f.state.calls, 0);
});
test("domain role denial and outage preserve explicit status; unexpected failures redact stack", async () => {
  const f = fixture();
  for (const status of [403, 409, 422, 503]) {
    const response = await f.commandHttp(f.request(), true, async () => { throw new access.CommandError(status, "DOMAIN", "Safe error"); });
    assert.equal(response.status, status); assert.equal((await response.json()).error, "Safe error");
  }
  const response = await f.commandHttp(f.request(), true, async () => { throw new Error("SECRET database token"); });
  assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /SECRET|stack|token/);
});
test("streaming JSON body bound, malformed JSON and successful responses", async () => {
  const f = fixture(); assert.deepEqual(JSON.parse(JSON.stringify(await f.commandBody(f.request({ body: '{"title":"test"}' })))), { title: "test" });
  await assert.rejects(f.commandBody(f.request({ body: "invalid" })), (e) => e.status === 400);
  for (const body of ["null", "[]", "1", "true", '"text"']) await assert.rejects(f.commandBody(f.request({ body })), (e) => e.status === 400);
  await assert.rejects(f.commandBody(f.request({ body: "x".repeat(800001) })), (e) => e.status === 400);
  const response = await f.commandHttp(f.request(), true, async () => ({ nativeEventId: "mapped" }));
  assert.equal(response.status, 200); assert.match(response.headers.get("cache-control"), /no-store/); assert.deepEqual((await response.json()).data, { nativeEventId: "mapped" });
});

test("cover endpoint checks live officer authority before decoding and returns the normalized image", async () => {
  const f = fixture(); let officer = false, checks = 0, decoded = 0;
  const loaded = { exports: {} };
  const source = ts.transpileModule(readFileSync(new URL("../app/api/command/operations/cover/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { module: loaded, exports: loaded.exports, require(name) {
    if (name === "@/lib/command/http") return f;
    if (name === "@/lib/command/server") return { authorize: async (userId, options) => {
      checks++; assert.equal(userId, f.state.session.user.id); assert.equal(options.officer, true);
      if (!officer) throw new access.CommandError(403, "OFFICER_REQUIRED", "Officer required");
    } };
    if (name === "@/lib/command/cover") return { normalizeEventCoverBytes: async (bytes) => { decoded++; assert.equal(bytes.toString(), "image bytes"); return "data:image/jpeg;base64,dGVzdA=="; } };
    throw new Error("Unexpected dependency " + name);
  } });
  assert.equal((await loaded.exports.POST(f.request({ body: "image bytes" }))).status, 403); assert.equal(decoded, 0);
  officer = true; const response = await loaded.exports.POST(f.request({ body: "image bytes" }));
  assert.equal(response.status, 200); assert.equal((await response.json()).data.imageData, "data:image/jpeg;base64,dGVzdA==");
  assert.equal(decoded, 1); assert.equal(checks, 3);
});
