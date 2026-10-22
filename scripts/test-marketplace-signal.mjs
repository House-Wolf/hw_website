import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const file = "../app/(root)/marketplace/components/MarketPlaceHero.tsx";
const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function mount(reduced = false) {
  const effects = [], updates = [], timers = new Map(), listeners = new Set();
  let id = 0;
  const motion = { matches: reduced, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  const loaded = { exports: {} };
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports,
    Math: Object.assign(Object.create(Math), { random: () => 0.5 }),
    window: { matchMedia: () => motion },
    setTimeout(fn, delay) { timers.set(++id, { fn, delay }); return id; },
    clearTimeout(timer) { timers.delete(timer); },
    require(name) {
      if (name === "react") return { useState: (initial) => [initial, (value) => updates.push(value)], useEffect: (fn) => effects.push(fn), useRef: () => ({ current: null }) };
      if (name === "react/jsx-runtime") return require(name);
      if (name.endsWith(".module.css")) return {};
      if (name === "@/components/utils/SafeImage") return { SafeImage: () => null };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  loaded.exports.default();
  const cleanup = effects.at(-1)();
  return {
    timers, updates, listeners, cleanup,
    fire(delay) {
      const entry = [...timers].find(([, timer]) => timer.delay === delay);
      assert.ok(entry, `Missing timer with delay ${delay}`);
      timers.delete(entry[0]); entry[1].fn();
    },
    reduce(value) { motion.matches = value; for (const listener of listeners) listener(); },
  };
}

test("original randomized timing: first interruption, five-second recovery, then recurring interruption", () => {
  const banner = mount();
  banner.fire(450000);
  assert.deepEqual(banner.updates, [true]);
  banner.fire(5000);
  assert.deepEqual(banner.updates, [true, false]);
  banner.fire(750000);
  assert.deepEqual(banner.updates, [true, false, true]);
  banner.cleanup();
});
test("leaving before the first interruption cancels its timer and preference listener", () => {
  const banner = mount(); banner.cleanup();
  assert.equal(banner.timers.size, 0); assert.equal(banner.listeners.size, 0);
});
test("leaving during an interruption cancels both recovery and subsequent interruption", () => {
  const banner = mount(); banner.fire(450000); banner.cleanup();
  assert.equal(banner.timers.size, 0);
});
test("leaving after a recurring interruption cancels all timers", () => {
  const banner = mount(); banner.fire(450000); banner.fire(5000); banner.fire(750000); banner.cleanup();
  assert.equal(banner.timers.size, 0);
});
test("reduced motion prevents signal interruptions", () => {
  const banner = mount(true);
  assert.equal(banner.timers.size, 0); banner.cleanup();
});
test("changing motion preference stops an active interruption and can restart cleanly", () => {
  const banner = mount(); banner.fire(450000); banner.reduce(true);
  assert.equal(banner.timers.size, 0); assert.equal(banner.updates.at(-1), false);
  banner.reduce(false); assert.equal(banner.timers.size, 1);
  banner.fire(450000); assert.equal(banner.updates.at(-1), true);
  banner.cleanup(); assert.equal(banner.timers.size, 0);
});
