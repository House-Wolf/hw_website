import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextResponse } from "next/server.js";
import ts from "typescript";
import { previewSessionCookies } from "../lib/authPreview.js";
import { previewEnvironment } from "./dev-command-local.mjs";

const require = createRequire(import.meta.url);
function load(path, dependencies) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, console: { error() {} }, require(name) {
    if (name in dependencies) return dependencies[name];
    if (["react", "react/jsx-runtime", "lucide-react"].includes(name)) return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return loadedModule.exports;
}
test("only isolated development preview changes the Auth.js session cookie", () => {
  const cookie = previewSessionCookies(previewEnvironment({})).sessionToken;
  assert.equal(cookie.name, "hw-local-preview.session-token");
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.sameSite, "lax");
  assert.equal(cookie.options.path, "/");
  for (const environment of [{ NODE_ENV: "production", COMMAND_LOCAL_PREVIEW: "true" }, { NODE_ENV: "development" }, {}]) {
    assert.equal(previewSessionCookies(environment), undefined);
  }
});
function profileRoute(session, user) {
  return load("../app/api/user/profile/route.ts", {
    "next/server": { NextResponse }, "@/lib/auth": { auth: async () => session },
    "@/lib/prisma": { prisma: { user: { findUnique: async () => user } } },
    "@/lib/deriveUserpermissions": { deriveUserPermissions: () => new Set() },
  });
}
test("missing session/account requests reauthentication rather than reporting a missing profile", async () => {
  assert.equal((await profileRoute(null, null).GET()).status, 401);
  const response = await profileRoute({ user: { id: "account-from-another-database" } }, null).GET();
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "REAUTH_REQUIRED");
});
test("valid account profile retains its Discord avatar and role metadata", async () => {
  const user = { id: "local-account", name: "Member", discordUsername: "member", discordDisplayName: "Member Name",
    avatarUrl: "https://cdn.discordapp.com/avatars/fixture/image.png", image: "https://example.invalid/avatar.png",
    roles: [{ discordRole: { id: "officer-role-fixture", name: "Lieutenant", permissions: [], position: 42, color: 123 } }],
  };
  const response = await profileRoute({ user: { id: user.id } }, user).GET();
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.avatarUrl, user.avatarUrl);
  assert.equal(body.roles[0].discordRole.name, "Lieutenant");
});
test("dashboard offers sign-in for an expired/environment-mismatched session", () => {
  const Page = load("../app/(dashboard)/dashboard/page.tsx", {
    "next/link": ({ children, ...props }) => React.createElement("a", props, children),
    "next/image": (props) => React.createElement("img", props),
    "@/contexts/DashboardContext": { useDashboardProfile: () => ({ user: null, loading: false, error: true, needsSignIn: true, refresh() {} }) },
    "@/lib/role-constants": { RANK_PRIORITY: [] },
  }).default;
  const html = renderToStaticMarkup(React.createElement(Page));
  assert.match(html, /href="\/auth\/signin"/);
  assert.match(html, /Sign in to load your Discord profile/);
  assert.doesNotMatch(html, /Check your connection/);
});
