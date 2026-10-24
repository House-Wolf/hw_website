import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(path, globals = {}, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(source, { module: loaded, exports: loaded.exports, AbortSignal, Date, Set, Map,
    require(name) { if (name in dependencies) return dependencies[name]; throw new Error(`Unexpected dependency: ${name}`); }, ...globals });
  return loaded.exports;
}

test("FleetYards pages share a 30-minute cache across visitors", async () => {
  const normalization = load("../lib/fleetyards/normalization.ts");
  const requests = [];
  let ids = ["a", "b"];
  const { getPublicFleetData } = load("../lib/fleetyards/client.ts", {
    fetch: async (url, options) => {
      requests.push({ url, options });
      return Response.json({ items: ids.map((id) => ({ id, model: { id: "model" } })), meta: { pagination: { totalCount: ids.length } } });
    },
  }, { "./normalization": normalization });
  assert.equal((await getPublicFleetData("hw-flt-001")).vehicles.length, 2);
  ids = ["b", "c", "d"];
  const updated = await getPublicFleetData("hw-flt-001");
  assert.equal(updated.vehicles.map(({ id }) => id).join(","), "b,c,d");
  assert.equal(updated.sourceStatus, "complete");
  for (const { url, options } of requests) {
    assert.equal(options.cache, "force-cache");
    assert.equal(options.next.revalidate, 1800);
    assert.equal(new URL(url).searchParams.get("per_page"), "240");
  }
});

test("fleet API shares complete responses but does not cache partial or failed responses", async () => {
  for (const sourceStatus of ["complete", "partial", "unavailable"]) {
    const { GET } = load("../app/api/fleetyards/fleet/route.ts", {
      process: { env: { NEXT_PUBLIC_FLEETYARDS_FLEET_SLUG: "hw-flt-001" } },
    }, {
      "next/server": { NextResponse: Response },
      "@/lib/fleetyards/client": { getPublicFleetData: async () => ({ sourceStatus, vehicles: [] }) },
    });
    const response = await GET();
    assert.equal(response.headers.get("cache-control"), sourceStatus === "complete" ? "public, max-age=60, s-maxage=1800, stale-while-revalidate=300" : "no-store");
    assert.equal(response.status, sourceStatus === "unavailable" ? 503 : 200);
  }
});

test("fleet page loads once without polling or tab-return requests and aborts on unmount", async () => {
  const states = [], effects = [];
  let index = 0, calls = 0, signal;
  const payload = { vehicles: [], sourceStatus: "complete" };
  const { default: FleetPage } = load("../components/fleet/FleetCommandPage.tsx", {
    AbortController,
    fetch: async (_url, options) => {
      calls++;
      assert.equal(options.cache, undefined);
      signal = options.signal;
      return Response.json(payload);
    },
  }, {
    react: {
      useState(initial) { const key = index++; states[key] = initial; return [initial, (value) => { states[key] = typeof value === "function" ? value(states[key]) : value; }]; },
      useEffect(fn) { effects.push(fn); }, useMemo(fn) { return fn(); },
    },
    "react/jsx-runtime": { jsx: () => null, jsxs: () => null },
    ...Object.fromEntries(["FleetHero", "FleetStats", "FleetFilters", "FleetShipCard"].map((name) => [`./${name}`, { default: () => null }])),
  });
  FleetPage();
  const cleanup = effects[0]();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  assert.equal(states[0].sourceStatus, "complete");
  assert.equal(states[1], false);
  assert.equal(signal.aborted, false);
  cleanup();
  assert.equal(signal.aborted, true);
});
