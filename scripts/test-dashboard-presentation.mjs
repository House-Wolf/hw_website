import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(path, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, require: name => {
    if (name in dependencies) return dependencies[name];
    if (["react", "react/jsx-runtime", "lucide-react"].includes(name)) return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return loadedModule.exports;
}
const config = load("../lib/theme-config.ts");
function luminance(hex) {
  const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }

test("all four palettes keep body, metadata and accent text readable on every surface", () => {
  for (const theme of Object.values(config.themes)) {
    const c = theme.colors;
    for (const background of [c.backgroundBase, c.backgroundElevated, c.backgroundCard, c.backgroundSoft]) {
      for (const text of [c.textPrimary, c.textSecondary, c.textMuted, c.accentPrimary, c.accentSecondary]) {
        assert.ok(contrast(text, background) >= 4.5, `${theme.name}: ${text} on ${background} must meet 4.5:1`);
      }
    }
    assert.ok(contrast(c.textInverse, c.accentPrimary) >= 4.5, `${theme.name} button text`);
    assert.ok(contrast(c.textInverse, c.accentPrimaryHover) >= 4.5, `${theme.name} hovered button text`);
    for (const status of ["Success", "Warning", "Error", "Info"]) {
      assert.ok(contrast(c[`status${status}Text`], c[`status${status}`]) >= 4.5, `${theme.name} ${status} status text`);
    }
  }
});

test("Dragoon Space uses dark blue surfaces and all existing saved theme IDs remain valid", () => {
  assert.equal(config.themes.frost.colorScheme, "dark");
  assert.equal(config.themes.frost.displayName, "Dragoon Space");
  assert.ok(luminance(config.themes.frost.colors.backgroundBase) < .05);
  assert.ok(luminance(config.themes.frost.colors.textPrimary) > .8);
  for (const key of ["night", "kamposian", "ember", "frost"]) assert.ok(config.isThemeName(key));
});

test("invalid stored theme names safely resolve to the default palette", () => {
  for (const name of [null, undefined, "missing", "__proto__", "constructor"]) assert.equal(config.getTheme(name).name, "night");
  for (const name of Object.keys(config.themes)) assert.equal(config.getTheme(name).name, name);
});

const link = ({ children, ...props }) => React.createElement("a", props, children);
const image = props => React.createElement("img", props);
let profile = {
  id: "member", discordDisplayName: "Sentinel Wolf", discordUsername: "sentinel_wolf", createdAt: "2025-11-29", lastLoginAt: "2026-10-24",
  roles: [{ discordRole: { id: "role", name: "A role with no Discord color", color: 0, position: 1 } }],
  permissions: [{ key: "SITE_ADMIN", description: "Manage the website" }],
};
const profileContext = { useDashboardProfile: () => ({ user: profile, loading: false, error: false, refresh() {} }), DashboardProfileProvider: ({ children }) => children };
const themeContext = { useTheme: () => ({ theme: "night", isLoading: false, saveStatus: "saved", setTheme() {} }), ThemeProvider: ({ children }) => children };
const shared = { "next/link": link, "next/image": image, "@/contexts/DashboardContext": profileContext, "@/contexts/ThemeContext": themeContext,
  "@/lib/theme-config": config, "@/lib/role-constants": { RANK_PRIORITY: ["Hand of the Clan"] } };

test("overview renders useful destinations and neutral role text with readable permission names", () => {
  const Page = load("../app/(dashboard)/dashboard/page.tsx", shared).default;
  const html = renderToStaticMarkup(React.createElement(Page));
  for (const route of ["operations", "packtracker", "marketplace", "settings", "profile"]) assert.ok(html.includes(`href="/dashboard/${route}"`));
  assert.match(html, /A role with no Discord color/);
  assert.doesNotMatch(html, /#000000/);
  assert.match(html, /Site administration/);
  assert.doesNotMatch(html, /SITE_ADMIN/);
});

test("appearance offers four keyboard buttons with the current selection announced", () => {
  const Page = load("../app/(dashboard)/dashboard/settings/page.tsx", shared).default;
  const html = renderToStaticMarkup(React.createElement(Page));
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
  assert.equal((html.match(/aria-pressed="false"/g) || []).length, 3);
  assert.match(html, /Appearance saved to your account/);
  for (const theme of Object.values(config.themes)) assert.ok(html.includes(theme.displayName));
});

test("navigation highlights nested routes and keeps administration out of member navigation", () => {
  const Layout = load("../app/(dashboard)/dashboard/layout.tsx", { ...shared, "./dashboard.css": {},
    "next/navigation": { usePathname: () => "/dashboard/packtracker/requests" }, "next-auth/react": { signOut() {} } }).default;
  const adminHtml = renderToStaticMarkup(React.createElement(Layout, null, "Content"));
  assert.match(adminHtml, /href="\/dashboard\/packtracker"[^>]*aria-current="page"/);
  assert.match(adminHtml, /href="\/dashboard\/admin"/);
  assert.match(adminHtml, /Skip to content/);
  assert.match(adminHtml, /aria-label="Open navigation"/);
  const original = profile;
  try {
    profile = { ...profile, permissions: [] };
    assert.doesNotMatch(renderToStaticMarkup(React.createElement(Layout, null, "Content")), /href="\/dashboard\/admin"/);
  } finally { profile = original; }
});
