import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import sharp from "sharp";
import { CommandError } from "../lib/command/access.js";
const loaded = { exports: {} };
const source = ts.transpileModule(readFileSync(new URL("../lib/command/cover.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
vm.runInNewContext(source, { module: loaded, exports: loaded.exports, Buffer, require(name) {
  if (name === "server-only") return {};
  if (name === "sharp") return sharp;
  if (name === "./access.js") return { CommandError };
  throw new Error("Unexpected dependency " + name);
} });
const { normalizeEventCover } = loaded.exports;
test("event cover decodes real pixels and emits a bounded JPEG without metadata", async () => {
  const png = await sharp({ create: { width: 32, height: 16, channels: 3, background: "#112233" } }).png().toBuffer();
  const result = await normalizeEventCover(`data:image/png;base64,${png.toString("base64")}`);
  assert.match(result, /^data:image\/jpeg;base64,/);
  const metadata = await sharp(Buffer.from(result.split(",")[1], "base64")).metadata();
  assert.equal(metadata.format, "jpeg"); assert.equal(metadata.exif, undefined); assert.equal(metadata.width, 32);
});
test("event cover rejects SSRF URLs, SVG, forged MIME, invalid pixels and oversized content", async () => {
  for (const value of ["http://127.0.0.1/private", "https://example.com/image.png", "data:image/svg+xml;base64,PHN2Zz4=", "data:image/png;base64,bm90IGFuIGltYWdl", "data:image/png;base64," + "A".repeat(750001)])
    await assert.rejects(normalizeEventCover(value), (e) => e.status === 422);
});
