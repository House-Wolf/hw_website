import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { createOperationService } from "../lib/command/operations.js";

const id = "00000000-0000-4000-8000-000000000001";
const operation = { id, guildId: "guild", creatorId: "actor", managerIds: [], state: "PUBLISHED", revision: 2, syncState: "CLEAN", nativeEventId: "event", input: { title: "Operation", description: "Briefing", entityType: "VOICE", channelId: "1119651168122064909", visibility: "GUILD", timezone: "UTC", start: "2099-06-01T18:00:00Z", end: null } };
function service(resolveVoiceChannelName, overrides = {}) {
  return createOperationService({ prisma: { commandOperation: { findFirst: async () => operation } }, authorize: async () => ({ id: "actor", guildId: "guild", roleIds: [] }), resolveVoiceChannelName, ...overrides });
}
test("operation details resolve the voice name using the authorized operation guild", async () => {
  const result = await service(async (guild, channel) => {
    assert.equal(guild, operation.guildId);
    assert.equal(channel, operation.input.channelId);
    return "🐺 WOLF DEN";
  }).detail("actor", id);
  assert.equal(result.voiceChannelName, "🐺 WOLF DEN");
});
test("Discord lookup failures leave the operation briefing available", async () => {
  const result = await service(async () => { throw new Error("Discord unavailable"); }).detail("actor", id);
  assert.equal(result.id, id);
  assert.equal(result.voiceChannelName, null);
});
test("unauthorized requests cannot resolve channel names", async () => {
  let calls = 0;
  await assert.rejects(service(async () => { calls++; }, { authorize: async () => { throw new Error("Denied"); } }).detail("actor", id), /Denied/);
  assert.equal(calls, 0);
});
function renderDetail(voiceChannelName, overrides = {}) {
  const source = readFileSync(new URL("../app/(dashboard)/dashboard/operations/OperationsPanel.tsx", import.meta.url), "utf8");
  const loaded = { exports: {} };
  const dependencies = {
    react: { ...React, useState: initial => [initial === null ? { ...operation, voiceChannelName, ...overrides } : initial, () => {}], useEffect() {}, useCallback: callback => callback },
    "react/jsx-runtime": awaitlessJsx,
    "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children), __esModule: true },
    "lucide-react": {}, "./EventWizard": {}, "./CrewPanel": { default: () => null, __esModule: true }, "./OperationsBrowser": {}, "./PlanningPanel": {},
  };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports: loaded.exports, module: loaded, require(name) { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return renderToStaticMarkup(React.createElement(loaded.exports.OperationDetail, { id }));
}
const awaitlessJsx = await import("react/jsx-runtime");
test("the rendered briefing shows the channel name without exposing its numeric ID", () => {
  const html = renderDetail("🐺 WOLF DEN");
  assert.ok(html.includes("Voice channel: 🐺 WOLF DEN"));
  assert.ok(!html.includes(operation.input.channelId));
});
test("an unavailable voice channel uses a readable fallback without exposing its ID", () => {
  const html = renderDetail(null);
  assert.ok(html.includes("Voice channel: Channel unavailable"));
  assert.ok(!html.includes(operation.input.channelId));
});

test("the operation page exposes the missing schedule prerequisite and preserves saved commitment", () => {
  const html = renderDetail("Wolf Den", { canManage: true, staffingEnabled: true, advancedEnabled: true, signups: [{ status: "COMMITTED", preferences: "PILOT" }] });
  assert.ok(html.includes("Set an end time before assigning crew"));
  assert.ok(html.includes("Set end time"));
  assert.ok(html.includes("Crew &amp; ships"));
  assert.ok(html.includes("Planning tools"));
  assert.ok(html.includes('value="COMMITTED" selected=""'));
  assert.ok(html.includes("PILOT</textarea>"));
});

function planningTree(canManage, requests = []) {
  const plan = { canManage, state: "PUBLISHED", revision: 2, crewRevision: 5, timezone: "UTC", capacity: 12, waitlistEnabled: true, reminderMinutes: [60], committed: 3, waiting: 1, waitlistPosition: 1, seats: [], assignments: [], candidates: [], wings: [], reserves: [], reminders: [], occurrences: [] };
  let stateIndex = 0;
  const dependencies = {
    react: { ...React, useState(initial) { const index = stateIndex++; return [index === 0 ? plan : index === 4 ? { capacity: "12", waitlistEnabled: true, offsets: "60" } : initial, () => {}]; }, useRef: value => ({ current: value }), useEffect() {}, useCallback: callback => callback },
    "react/jsx-runtime": awaitlessJsx,
    "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children), __esModule: true },
    "lucide-react": new Proxy({}, { get: () => () => null }),
    "./EventWizard": { api: async (...args) => { requests.push(args); return plan; } },
  };
  const source = readFileSync(new URL("../app/(dashboard)/dashboard/operations/PlanningPanel.tsx", import.meta.url), "utf8");
  const loaded = { exports: {} };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports: loaded.exports, module: loaded, require(name) { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return loaded.exports.default({ operationId: id, revisionKey: "2", onChanged() {} });
}
function descendants(node) {
  if (!node || typeof node !== "object") return [];
  return [node, ...React.Children.toArray(node.props?.children).flatMap(descendants)];
}
test("planning renders member counts and queue position while restricting management controls", () => {
  const member = renderToStaticMarkup(planningTree(false));
  assert.ok(member.includes("Your waitlist position:"));
  assert.ok(!member.includes("Save places"));
  assert.ok(!member.includes("Preview assignments"));
  const manager = renderToStaticMarkup(planningTree(true));
  assert.ok(manager.includes("Save places"));
  assert.ok(manager.includes("Preview assignments"));
});
test("capacity form submits the supported planning fields without crew mutation metadata", async () => {
  const requests = [], tree = planningTree(true, requests);
  const form = descendants(tree).find(node => node.type === "form");
  await form.props.onSubmit({ preventDefault() {} });
  // The form starts an async mutation; wait until its API request is observable.
  const request = requests.find(([, method]) => method === "POST");
  assert.equal(request[2].action, "savePlan");
  assert.deepEqual(JSON.parse(JSON.stringify(request[2].input)), { capacity: 12, waitlistEnabled: true, reminderMinutes: [60] });
});
