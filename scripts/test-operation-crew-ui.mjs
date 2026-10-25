import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsx from "react/jsx-runtime";
import ts from "typescript";

function descendants(node) {
  if (!node || typeof node !== "object") return [];
  return [node, ...React.Children.toArray(node.props?.children).flatMap(descendants)];
}
function fixture(end = "2099-01-01T22:00:00Z") {
  const crew = { userId: "manager", canManage: true, state: "PUBLISHED", crewRevision: 3, roles: ["GROUND"], pendingVerification: 0, ships: [], availableShips: [], seats: [{ id: "seat", label: "Combat Medic", role: "GROUND", operationShipId: null, requiredCode: null }], assignments: [], candidates: [{ userId: "medic", name: "Medic Wolf", preferences: "MEDIC", qualifications: [] }], audit: [] };
  const states = [], requests = [];
  let index = 0;
  const loaded = { exports: {} };
  const dependencies = {
    react: { ...React, useState(initial) { const slot = index++; if (!(slot in states)) states[slot] = slot === 0 ? crew : slot === 5 ? { seat: "medic" } : typeof initial === "function" ? initial() : initial; return [states[slot], value => { states[slot] = typeof value === "function" ? value(states[slot]) : value; }]; }, useEffect() {}, useCallback: fn => fn, useRef: () => ({ current: null }) },
    "react/jsx-runtime": jsx,
    "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children), __esModule: true },
    "./ShipPicker": { default: () => null, __esModule: true },
    "./EventWizard": { api: async (...args) => { requests.push(args); return crew; } },
  };
  const code = ts.transpileModule(readFileSync(new URL("../app/(dashboard)/dashboard/operations/CrewPanel.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require(name) { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return { requests, render() { index = 0; return loaded.exports.default({ operationId: "operation", revisionKey: "3", staffingInput: { end, recurrence: "NONE" } }); } };
}
test("assignment explains a missing end time and cannot submit until the schedule is complete", () => {
  const f = fixture(null), tree = f.render();
  assert.ok(renderToStaticMarkup(tree).includes("Set an operation end time before assigning crew"));
  const assign = descendants(tree).find(node => node.type === "button" && node.props.children === "Assign");
  assert.equal(assign.props.disabled, true);
  const form = descendants(tree).find(node => node.type === "form" && descendants(node).some(child => child.type === "button" && child.props.children === "Assign"));
  form.props.onSubmit({ preventDefault() {} });
  assert.equal(f.requests.length, 0);
  assert.ok(!descendants(f.render()).some(node => node.type === "dialog"));
});
test("assign opens an explicit confirmation and only saves after a required reason is supplied", async () => {
  const f = fixture(), tree = f.render();
  const form = descendants(tree).find(node => node.type === "form" && descendants(node).some(child => child.type === "button" && child.props.children === "Assign"));
  form.props.onSubmit({ preventDefault() {} });
  assert.equal(f.requests.length, 0);
  let dialog = descendants(f.render()).find(node => node.type === "dialog");
  assert.ok(renderToStaticMarkup(dialog).includes("Medic Wolf will fill Combat Medic"));
  let confirm = descendants(dialog).find(node => node.type === "form");
  await confirm.props.onSubmit({ preventDefault() {} });
  assert.equal(f.requests.length, 0);
  descendants(dialog).find(node => node.type === "textarea").props.onChange({ target: { value: "Initial mission medical assignment" } });
  dialog = descendants(f.render()).find(node => node.type === "dialog");
  confirm = descendants(dialog).find(node => node.type === "form");
  await confirm.props.onSubmit({ preventDefault() {} });
  assert.deepEqual(JSON.parse(JSON.stringify(f.requests[0])), ["operations/operation/crew", "POST", { action: "assign", crewRevision: 3, input: { seatId: "seat", userId: "medic", reason: "Initial mission medical assignment" } }]);
  assert.ok(!descendants(f.render()).some(node => node.type === "dialog"));
});
