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
function renderDetail(voiceChannelName) {
  const source = readFileSync(new URL("../app/(dashboard)/dashboard/operations/OperationsPanel.tsx", import.meta.url), "utf8");
  const loaded = { exports: {} };
  const dependencies = {
    react: { ...React, useState: initial => [initial === null ? { ...operation, voiceChannelName } : initial, () => {}], useEffect() {}, useCallback: callback => callback },
    "react/jsx-runtime": awaitlessJsx,
    "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children), __esModule: true },
    "lucide-react": {}, "./EventWizard": {}, "./CrewPanel": {},
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
