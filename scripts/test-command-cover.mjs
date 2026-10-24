import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import sharp from "sharp";
import { CommandError } from "../lib/command/access.js";
import { uploadEventCover } from "../lib/command/coverSelection.js";
import { validateEventInput } from "../lib/command/eventInput.js";
import { deliverNative } from "../lib/command/nativeDelivery.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";
import { randomBytes } from "node:crypto";
const loaded = { exports: {} };
const source = ts.transpileModule(readFileSync(new URL("../lib/command/cover.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
vm.runInNewContext(source, { module: loaded, exports: loaded.exports, Buffer, require(name) {
  if (name === "server-only") return {};
  if (name === "sharp") return sharp;
  if (name === "./access.js") return { CommandError };
  throw new Error("Unexpected dependency " + name);
} });
const { normalizeEventCover, normalizeEventCoverBytes } = loaded.exports;
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

test("selected PNG above the old 500 KB cap is normalized into validated operation input and sent to native Discord", async () => {
  const png = await sharp(randomBytes(1280 * 720 * 3), { raw: { width: 1280, height: 720, channels: 3 } }).png().toBuffer();
  assert.ok(png.length > 500000 && png.length < 4 * 1024 * 1024);
  const file = new Blob([png], { type: "application/octet-stream" }); // Valid PNG with a generic browser MIME declaration.
  let release;
  const completion = new Promise((resolve) => { release = resolve; });
  let finished = false;
  const upload = uploadEventCover(file, async (path, options) => {
    assert.equal(path, "/api/command/operations/cover"); assert.equal(options.body, file);
    await completion;
    return Response.json({ data: { imageData: await normalizeEventCoverBytes(Buffer.from(await options.body.arrayBuffer())) } });
  }).then((value) => { finished = true; return value; });
  await new Promise((resolve) => setImmediate(resolve)); assert.equal(finished, false);
  release(); const imageData = await upload;
  assert.ok(Buffer.from(imageData.split(",")[1], "base64").length <= 500000);
  const input = validateEventInput({ title: "Cover test", description: "Mock only", entityType: "EXTERNAL", location: "Test", timezone: "UTC", startLocal: "2099-01-01T18:00", endLocal: "2099-01-01T20:00", recurrence: "NONE", visibility: "GUILD", imageData, imageBehavior: "REPLACE" });
  const op = { id: "00000000-0000-4000-8000-000000000001", guildId: "test-guild", creatorId: "actor", managerIds: [], state: "PUBLISHED", syncState: "CLEAN", input };
  let sent;
  const result = await deliverNative({ operation: op, job: { actorId: "actor" }, baseUrl: "https://example.test", authorize: async () => ({ id: "actor", guildId: "test-guild", roleIds: [PERSONNEL_ROLES.lieutenant] }), preflight: async () => true, discord: {
    get: async () => [], post: async (_path, body) => { sent = body; return { ...body, id: "test-event", status: 1, image: "confirmed-cover-hash" }; },
  } });
  assert.equal(sent.image, imageData); assert.equal(result.nativeSnapshot.image, "confirmed-cover-hash");
});

test("cover upload failures reject rather than silently returning no image", async () => {
  const file = new Blob(["test"], { type: "image/png" });
  await assert.rejects(uploadEventCover(file, async () => Response.json({ error: "Image could not be decoded" }, { status: 422 })), /decoded/);
  await assert.rejects(uploadEventCover(file, async () => { throw new Error("Network unavailable"); }), /Network/);
  await assert.rejects(uploadEventCover(file, async () => Response.json({ data: {} })), /invalid/);
  await assert.rejects(uploadEventCover({ size: 4 * 1024 * 1024 + 1, type: "image/png" }), /4 MB/);
  await assert.rejects(normalizeEventCoverBytes(Buffer.alloc(4 * 1024 * 1024 + 1)), (e) => e.status === 422);
});
