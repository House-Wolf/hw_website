import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsx from "react/jsx-runtime";
import ReactMarkdown from "react-markdown";
import ts from "typescript";
import * as presentation from "../lib/command/aarPresentation.js";

const loaded = { exports: {} };
const code = ts.transpileModule(readFileSync(new URL("../app/(dashboard)/dashboard/operations/AarPreview.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require(name) {
  if (name === "react/jsx-runtime") return jsx;
  if (name === "react-markdown") return { default: ReactMarkdown };
  if (name === "@/lib/command/aarPresentation.js") return presentation;
  if (name === "next/image") return { default: props => { const imageProps = { ...props }; delete imageProps.unoptimized; return React.createElement("img", imageProps); } };
  throw new Error(name);
} });
const props = { context: { title: "Black Breach", brief: "Public briefing", visibility: "GUILD", bannerUrl: "https://cdn.discordapp.com/guild-events/900000000000000001/0123456789abcdef0123456789abcdef.png?size=1024" }, summary: "**Mission outcome**\nExtraction complete", finalized: true, totals: { present: 6, absent: 1, excused: 0 }, unsaved: true, privateNotes: "SECRET NOTES" };
const render = overrides => renderToStaticMarkup(loaded.exports.default({ ...props, ...overrides }));

test("website preview renders banner before the live AAR without the mission brief or private notes", () => {
  const html = render();
  assert.ok(html.indexOf("<img") < html.indexOf("<h5"));
  assert.doesNotMatch(html, /Mission brief|Public briefing/); assert.match(html, /<strong>Mission outcome<\/strong>/);
  assert.match(html, /Previewing unsaved report text/); assert.match(html, />6<\/dd>/);
  assert.ok(!html.includes("SECRET NOTES"));
  assert.match(render({ summary: "Updated draft" }), /Updated draft/);
});

test("empty reports use an honest placeholder, and private operations show a send restriction", () => {
  const html = render({ summary: "", finalized: false, context: { ...props.context, visibility: "OFFICERS", bannerUrl: null } });
  assert.match(html, /Write your report above/); assert.match(html, /cannot be posted/);
  assert.ok(!html.includes("<img")); assert.ok(!html.includes("<dl"));
});
