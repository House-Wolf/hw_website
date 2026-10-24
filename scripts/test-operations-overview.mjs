import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { isOfficer } from "../lib/command/access.js";
import { PERSONNEL_ROLES, OFFICER_ROLE_IDS, SERVICE_RANKS } from "../lib/personnel/policy.js";

const require = createRequire(import.meta.url);
function load(path, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(source, { module: loaded, exports: loaded.exports, Date, Set, Map, process: { env: { NEXT_PUBLIC_FLEETYARDS_FLEET_SLUG: "house-wolf" } }, require(name) {
    if (name in dependencies) return dependencies[name];
    if (["react", "react/jsx-runtime", "lucide-react"].includes(name)) return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return loaded.exports;
}
const statistics = load("../lib/command/overview.ts");
const at = new Date("2026-10-24T12:00:00Z");
const row = (id, state, createdAt, start = "2026-10-25T12:00:00Z") => ({ id, title: id, state, createdAt, start });

test("overview keeps six UTC month buckets, a 90-day status window, and an actionable upcoming list", () => {
  const result = statistics.operationOverviewStatistics([
    row("old", "COMPLETED", "2026-05-03"), row("cancelled", "CANCELLED", "2026-08-01"),
    row("draft", "DRAFT", "2026-10-01"), row("future", "PUBLISHED", "2026-10-10"),
    row("underway", "ACTIVE", "2026-10-20", "2026-10-23T12:00:00Z"),
    row("overdue", "PUBLISHED", "2026-10-20", "2026-10-22T12:00:00Z"),
  ], at);
  assert.deepEqual(Array.from(result.trend, month => month.month), ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
  assert.deepEqual(Array.from(result.trend, month => month.count), [1, 0, 0, 1, 0, 4]);
  assert.equal(result.statuses.reduce((sum, status) => sum + status.count, 0), 5);
  assert.equal(result.operations.active, 1);
  assert.equal(result.operations.scheduled, 2);
  assert.deepEqual(Array.from(result.upcoming, operation => operation.id), ["underway", "future"]);
});

test("empty data produces honest zeros and month windows cross calendar years correctly", () => {
  const result = statistics.operationOverviewStatistics([], new Date("2027-01-01T01:00:00Z"));
  assert.deepEqual(Array.from(result.trend, month => month.month), ["2026-08", "2026-09", "2026-10", "2026-11", "2026-12", "2027-01"]);
  assert.equal(result.operations.total, 0);
  assert.equal(result.trend.every(month => month.count === 0), true);
  assert.equal(result.statuses.length, 0);
});

function serviceFixture({ officer = false, denied = false, fleetFailed = false, databaseFailed = false } = {}) {
  const queries = [], memberQueries = [];
  let fleetCalls = 0;
  const prisma = {
    $queryRaw: async (query, ...values) => {
      queries.push({ sql: query.join("?"), values });
      if (databaseFailed) throw new Error("Database unavailable");
      return [];
    },
    user: { count: async options => { memberQueries.push(options); return 0; }, findMany: async options => { memberQueries.push(options); return []; } },
  };
  const service = load("../lib/command/overviewServer.ts", {
    "server-only": {}, "@/lib/prisma": { prisma }, "@/lib/fleetyards/client": { getPublicFleetData: async () => { fleetCalls++; if (fleetFailed) throw new Error("Fleet unavailable"); return { sourceStatus: "partial", vehicles: [{ id: "ship" }] }; } },
    "@/lib/role-constants": { RANK_PRIORITY: ["Hand of the Clan"] },
    "@/lib/personnel/policy.js": { PERSONNEL_ROLES, OFFICER_ROLE_IDS, SERVICE_RANKS }, "./access.js": { isOfficer }, "./overview": statistics,
    "./server": { authorize: async () => { if (denied) throw new Error("Not authorized"); return { id: "actor", guildId: "house-wolf-guild", roleIds: officer ? [PERSONNEL_ROLES.hand] : [PERSONNEL_ROLES.member] }; } },
  });
  return { ...service, queries, memberQueries, fleetCalls: () => fleetCalls };
}

test("authorization precedes any overview queries or external fleet requests", async () => {
  const f = serviceFixture({ denied: true });
  await assert.rejects(f.getOperationsOverview("actor", at), /Not authorized/);
  assert.equal(f.queries.length, 0);
  assert.equal(f.memberQueries.length, 0);
  assert.equal(f.fleetCalls(), 0);
});

test("member analytics and activity SQL both enforce guild, visibility and draft boundaries", async () => {
  const f = serviceFixture();
  const result = await f.getOperationsOverview("actor", at);
  assert.equal(f.queries.length, 2);
  for (const query of f.queries) {
    assert.equal(query.values[0], "house-wolf-guild");
    assert.equal(query.values[1], false);
    assert.match(query.sql, /state <> 'DRAFT'/);
    assert.match(query.sql, /visibility.*= 'GUILD'/);
  }
  assert.equal(result.leadership, false);
  assert.equal(result.recentMembers.length, 0);
  assert.ok(f.memberQueries.every(query => query.where.isActive === true && query.where.roles.some.discordRoleId.in.includes(PERSONNEL_ROLES.member)));
});

test("fleet outages do not erase valid metrics; partial totals and missing reliability are explicit", async () => {
  const partial = await serviceFixture({ officer: true }).getOperationsOverview("actor", at);
  assert.equal(partial.fleet.total, 1);
  assert.equal(partial.fleet.status, "partial");
  assert.equal(partial.reliability.value, null);
  const unavailable = await serviceFixture({ fleetFailed: true }).getOperationsOverview("actor", at);
  assert.equal(unavailable.fleet.total, null);
  assert.equal(unavailable.fleet.status, "unavailable");
  await assert.rejects(serviceFixture({ databaseFailed: true }).getOperationsOverview("actor", at), /Database unavailable/);
});

test("the rendered empty overview has all reference panels without fabricated reliability or ship counts", async () => {
  const { OperationsOverviewContent } = load("../app/(dashboard)/dashboard/operations/OperationsDashboard.tsx", {
    "./operations.css": {}, "next/link": ({ children, ...props }) => React.createElement("a", props, children), "./EventWizard": { api() {} }, "./OperationsPanel": { OperationsList() { return null; } },
  });
  const data = await serviceFixture({ officer: true, fleetFailed: true }).getOperationsOverview("actor", at);
  const html = renderToStaticMarkup(React.createElement(OperationsOverviewContent, { data }));
  for (const title of ["Total members", "Active operations", "Registered ships", "Org performance", "Operations over time", "Operation status breakdown", "Recent members", "Recent activity"]) assert.ok(html.includes(title), title);
  assert.match(html, /Not measured/);
  assert.match(html, /Unavailable/);
  assert.doesNotMatch(html, /100%|NaN/);
  const memberHtml = renderToStaticMarkup(React.createElement(OperationsOverviewContent, { data: { ...data, leadership: false } }));
  assert.doesNotMatch(memberHtml, /Org performance|Recent members/);
});
