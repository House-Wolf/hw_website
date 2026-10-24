import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(file, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports,
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return loaded.exports;
}

const divisions = load("../lib/divisions/divisionConfig.ts");
const subdivisions = load("../lib/subdivisions/subdivisionConfig.ts");
const { DIVISION_SPECIALTIES, getAssignedUnitRoster, getDivisionSpecialty } = load("../lib/divisions/specialtyConfig.ts", {
  "@/lib/subdivisions/subdivisionConfig": subdivisions,
});

test("only configured division slugs are accepted, including prototype-like input", () => {
  for (const slug of ["arcops", "locops", "specops", "tacops"]) assert.equal(divisions.isDivisionSlug(slug), true);
  for (const slug of ["constructor", "toString", "__proto__", "unknown", ""]) assert.equal(divisions.isDivisionSlug(slug), false);
});

test("each specialty has a unique assignment slug and a repository-owned patch", () => {
  const slugs = new Set();
  for (const [division, units] of Object.entries(DIVISION_SPECIALTIES)) {
    assert.ok(units.length > 0);
    for (const unit of units) {
      assert.ok(unit.slug.startsWith(division + "-"));
      assert.equal(slugs.has(unit.slug), false);
      slugs.add(unit.slug);
      assert.ok(unit.title && unit.focus && unit.description && unit.patchAlt);
      assert.ok(unit.patchImagePath.startsWith("/images/divisions/"));
      assert.ok(existsSync(new URL("../public" + unit.patchImagePath, import.meta.url)), unit.patchImagePath);
    }
  }
  assert.equal(slugs.size, 14);
});

test("a unit cannot be opened through a different division", () => {
  assert.ok(getDivisionSpecialty("arcops", "arcops-wayfinders"));
  assert.equal(getDivisionSpecialty("locops", "arcops-wayfinders"), undefined);
  assert.equal(getDivisionSpecialty("arcops", "constructor"), undefined);
  assert.equal(getDivisionSpecialty("arcops", "missing"), undefined);
});

test("unit rosters retain officer and staff order while excluding other assignments", () => {
  const member = (id, subdivisionSlug) => ({ id, subdivisionSlug });
  const roster = {
    commandRoster: [member("command", "arcops-command"), member("captain", "arcops-wayfinders")],
    officers: [member("officer", "arcops-wayfinders"), member("other-officer", "arcops-chimeras")],
    members: [member("first", "arcops-wayfinders"), member("other", "arcops-chimeras"), member("unassigned", null), member("last", "arcops-wayfinders")],
  };
  const result = getAssignedUnitRoster(roster, "arcops-wayfinders");
  assert.deepEqual(Array.from(result.officers, (m) => m.id), ["captain", "officer"]);
  assert.deepEqual(Array.from(result.members, (m) => m.id), ["first", "last"]);
  assert.equal(roster.members.length, 4);
});

test("a specialty without assignments has an empty roster", () => {
  const result = getAssignedUnitRoster({ commandRoster: [], officers: [], members: [] }, "locops-merchant");
  assert.equal(result.officers.length, 0);
  assert.equal(result.members.length, 0);
});
