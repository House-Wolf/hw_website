import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsx from "react/jsx-runtime";
import ts from "typescript";

function descendants(node) { return !node || typeof node !== "object" ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(descendants)]; }
function fixture(overrides = {}, marked = false) {
  const row = { revision: 1, finalizedAt: null, reportState: "DRAFT", summary: "Saved summary", privateNotes: "Private evidence", officer: true, canManage: true, canReview: false, editable: true, canFinalize: true, candidates: [{ id: "member", name: "Member Wolf" }], entries: [], history: [], totals: { present: 0, absent: 0, excused: 0, value: null }, ...overrides };
  let index = 0;
  const states = [], requests = [];
  const deps = {
    react: { ...React, useEffect() {}, useCallback: (fn) => fn, useState(initial) { const slot = index++; if (!(slot in states)) states[slot] = slot === 0 ? row : slot === 2 ? row.officer ? [{ userId: "member", name: "Member Wolf", status: marked ? "PRESENT" : "", note: "" }] : row.entries : slot === 3 ? row.summary : slot === 4 ? row.privateNotes || "" : slot === 5 ? "Acceptance reason" : initial; return [states[slot], (value) => { states[slot] = typeof value === "function" ? value(states[slot]) : value; }]; } },
    "react/jsx-runtime": jsx,
    "./EventWizard": { api: async (...args) => { requests.push(args); return args[0] === "attendance" ? { present: 1, absent: 0, excused: 0, operations: 1, value: 100 } : row; } },
  };
  const loaded = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL("../app/(dashboard)/dashboard/operations/DebriefPanel.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require(name) { assert.ok(name in deps, name); return deps[name]; } });
  return { requests, states, render() { index = 0; return loaded.exports.default({ operationId: "operation" }); } };
}
test("unmarked attendance cannot finalize and controls have explicit accessible labels", () => {
  const tree = fixture().render();
  const finalize = descendants(tree).find((node) => node.type === "button" && node.props.children === "Finalize attendance");
  assert.equal(finalize.props.disabled, true);
  assert.match(renderToStaticMarkup(tree), /aria-label="Attendance for Member Wolf"/);
  assert.match(renderToStaticMarkup(tree), /Mark all participants before finalizing/);
});
test("manager finalization submits explicit attendance, reason and the loaded revision", async () => {
  const f = fixture({}, true);
  const button = descendants(f.render()).find((node) => node.type === "button" && node.props.children === "Finalize attendance");
  assert.equal(button.props.disabled, false);
  await button.props.onClick();
  const request = f.requests.find(([, method]) => method === "POST");
  assert.equal(request[2].action, "finalizeAttendance"); assert.equal(request[2].revision, 1);
  assert.equal(request[2].input.reason, "Acceptance reason"); assert.equal(request[2].input.entries[0].status, "PRESENT");
});
test("member rendering has no correction, private-note, review or roster-management controls", () => {
  const f = fixture({ officer: false, canManage: false, canReview: false, summary: "Reviewed summary", privateNotes: undefined, reportState: "REVIEWED", entries: [{ userId: "self", name: "Self", status: "PRESENT" }] });
  const html = renderToStaticMarkup(f.render());
  assert.match(html, /Reviewed summary/); assert.match(html, /Your attendance/);
  for (const text of ["Private officer notes", "Private attendance note", "Correction &amp; review history", "Finalize attendance", "Save report for review", "Add a walk-in member"]) assert.ok(!html.includes(text), text);
});
test("review action cannot publish unsaved report edits", () => {
  const f = fixture({ canReview: true });
  f.render(); f.states[3] = "Unsaved edit";
  const approve = descendants(f.render()).find((node) => node.type === "button" && node.props.children === "Approve saved report for members");
  assert.equal(approve.props.disabled, true);
});

test("active operations offer walk-ins and draft saving without finalization or reports", () => {
  const html = renderToStaticMarkup(fixture({ canFinalize: false }).render());
  assert.match(html, /Add a walk-in member/);
  assert.match(html, /Save attendance draft/);
  assert.match(html, /Operation in progress/);
  assert.ok(!html.includes("Finalize attendance"));
  assert.ok(!html.includes("Save report for review"));
});

test("walk-ins are added as present once and included in the attendance save", async () => {
  const f = fixture({}, true);
  f.render();
  f.states[9] = "walk-in"; f.states[10] = [{ id: "walk-in", name: "Late Wolf" }];
  const add = () => descendants(f.render()).find((node) => node.type === "button" && node.props.children === "Add as present");
  add().props.onClick();
  assert.equal(f.states[2].find((entry) => entry.userId === "walk-in").status, "PRESENT");
  f.states[9] = "walk-in"; add().props.onClick();
  assert.equal(f.states[2].filter((entry) => entry.userId === "walk-in").length, 1);
  await descendants(f.render()).find((node) => node.type === "button" && node.props.children === "Save attendance draft").props.onClick();
  assert.ok(f.requests.find(([, method]) => method === "POST")[2].input.entries.some((entry) => entry.userId === "walk-in" && entry.status === "PRESENT"));
});

test("Discord-only search choices show usernames and save their stable Discord identity", async () => {
  const f = fixture({}, true), id = "discord:900000000000000001";
  f.render();
  f.states[9] = id; f.states[10] = [{ id, name: "Late Wolf", username: "latewolf" }];
  const tree = f.render(), html = renderToStaticMarkup(tree);
  assert.match(html, /Late Wolf \(@latewolf\)/);
  assert.match(html, /Website registration and event signup are not required/);
  descendants(tree).find(node => node.type === "button" && node.props.children === "Add as present").props.onClick();
  await descendants(f.render()).find(node => node.type === "button" && node.props.children === "Save attendance draft").props.onClick();
  assert.ok(f.requests.find(([, method]) => method === "POST")[2].input.entries.some(entry => entry.userId === id && entry.status === "PRESENT"));
});
