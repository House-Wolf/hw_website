import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../components/utils/PwaServiceWorker.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function component(environment, { owned = true, controlled = true, readyState = "complete" } = {}) {
  const effects = [], deleted = [], unregistered = [], registered = [], events = [];
  let reloads = 0;
  const ownRegistration = { active: { scriptURL: "http://localhost:3000/sw.js" }, unregister: async () => { unregistered.push("ours"); return true; } };
  const otherRegistration = { active: { scriptURL: "http://localhost:3000/other/sw.js" }, unregister: async () => { unregistered.push("other"); return true; } };
  const loadedModule = { exports: {} };
  vm.runInNewContext(code, {
    module: loadedModule, exports: loadedModule.exports, URL, AbortController, console,
    process: { env: { NODE_ENV: environment } }, document: { readyState },
    navigator: { serviceWorker: { controller: controlled ? ownRegistration.active : null,
      getRegistrations: async () => owned ? [ownRegistration, otherRegistration] : [otherRegistration],
      register: async url => { registered.push(url); } } },
    window: { isSecureContext: true, location: { origin: "http://localhost:3000", reload: () => reloads++ },
      addEventListener: (...args) => events.push(args),
      caches: { keys: async () => ["house-wolf-pwa-v1:static", "another-app-cache"], delete: async key => { deleted.push(key); } } },
    require: name => { assert.equal(name, "react"); return { useEffect: effect => effects.push(effect) }; },
  });
  loadedModule.exports.default();
  const cleanup = effects[0]();
  return { cleanup, deleted, unregistered, registered, events, reloads: () => reloads };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test("development removes only our worker and PWA caches, then detaches its controller", async () => {
  const result = component("development"); await flush();
  assert.deepEqual(result.unregistered, ["ours"]);
  assert.deepEqual(result.deleted, ["house-wolf-pwa-v1:static"]);
  assert.equal(result.reloads(), 1);
  assert.deepEqual(result.registered, []);
});

test("development without an owned registration does not reload repeatedly", async () => {
  const result = component("development", { owned: false }); await flush();
  assert.deepEqual(result.unregistered, []);
  assert.equal(result.reloads(), 0);
});

test("cancelled development initialization does not unregister or reload", async () => {
  const result = component("development"); result.cleanup(); await flush();
  assert.deepEqual(result.unregistered, []);
  assert.equal(result.reloads(), 0);
});

test("production registration also works when hydration finishes after window load", async () => {
  const result = component("production"); await flush();
  assert.deepEqual(result.registered, ["/sw.js"]);
  assert.deepEqual(result.unregistered, []);
  assert.deepEqual(result.deleted, []);
});

test("service worker never intercepts Next bundles or private APIs, but keeps image caching", async () => {
  const listeners = new Map(); let cached = 0;
  vm.runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), {
    self: { location: { origin: "http://localhost:3000" }, addEventListener: (name, handler) => listeners.set(name, handler) },
    URL, Response, fetch: async () => new Response("fresh"),
    caches: { open: async () => ({ match: async () => null, put: async () => cached++ }) },
  });
  for (const path of ["/_next/static/chunks/app.js", "/_next/static/chunks/abc123.js", "/api/user/profile", "/api/command/operations"]) {
    let intercepted = false;
    listeners.get("fetch")({ request: { method: "GET", mode: "cors", url: `http://localhost:3000${path}` }, respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false, path);
  }
  let imageResponse;
  listeners.get("fetch")({ request: { method: "GET", mode: "cors", url: "http://localhost:3000/images/global/HWiconnew.png" }, respondWith: promise => { imageResponse = promise; } });
  assert.equal(await (await imageResponse).text(), "fresh");
  assert.equal(cached, 1);
});
