import assert from "node:assert/strict";
import { test } from "node:test";
import { aarMessage } from "../lib/command/aarDelivery.js";
import { validateTextDestination } from "../lib/command/channels.js";
import { aarContext, aarFooter, aarSections, validAarBanner } from "../lib/command/aarPresentation.js";

test("Discord AAR payload contains only explicit public fields, suppresses mentions and links full long reports", () => {
  const payload = aarMessage({ operationId: "00000000-0000-4000-8000-000000000001", title: "Mission @everyone", summary: "Public summary ".repeat(700), privateNotes: "NEVER SEND", reviewRevision: 4, baseUrl: "https://example.test" });
  assert.ok(payload.embeds[0].description.length < 4096);
  assert.match(payload.embeds[0].description, /Read the full approved report/);
  assert.ok(!JSON.stringify(payload).includes("NEVER SEND"));
  assert.ok(!JSON.stringify(payload).includes("@everyone"));
  assert.deepEqual(payload.allowed_mentions, { parse: [] });
});

test("AAR delivery requires message history access for safe recovery of interrupted posts", async () => {
  const discord = async path => path.startsWith("/channels/") ? { guild_id: "guild", type: 0 } : path.endsWith("/roles") ? [{ id: "guild", permissions: "19456" }] : path === "/users/@me" ? { id: "bot" } : { user: { id: "bot" }, roles: ["guild"] };
  await validateTextDestination({ guildId: "guild", channelId: "channel", discord });
  await assert.rejects(validateTextDestination({ guildId: "guild", channelId: "channel", discord, requireHistory: true }), error => error.code === "BOT_PERMISSIONS");
});

test("AAR has its banner first, then the report and finalized attendance without the brief", () => {
  const bannerUrl = "https://cdn.discordapp.com/guild-events/900000000000000001/0123456789abcdef0123456789abcdef.png?size=1024";
  const payload = aarMessage({ operationId: "op", title: "Black Breach", brief: "Secure objectives", summary: "Extraction complete", reviewRevision: 2, baseUrl: "https://example.test", bannerUrl, attendance: { present: 6, absent: 1, excused: 0 } });
  assert.equal(payload.embeds[0].image.url, bannerUrl);
  assert.equal(payload.embeds[0].url, undefined); // Discord deduplicates embeds with the same URL.
  const report = payload.embeds[1];
  assert.doesNotMatch(report.description, /Mission brief|Secure objectives/); assert.match(report.description, /Extraction complete/);
  assert.equal(report.footer.text, aarFooter("op"));
  assert.deepEqual(report.fields.slice(0, 3).map(f => f.value), ["6", "1", "0"]);
});

test("saved covers use an attachment and arbitrary remote image URLs are rejected", () => {
  const imageData = "data:image/jpeg;base64,/9j/2Q==";
  const context = aarContext({ input: { title: "Cover", description: "Brief", imageData } });
  assert.equal(context.bannerUrl, imageData);
  const payload = aarMessage({ operationId: "op", ...context, summary: "Summary", reviewRevision: 1, baseUrl: "https://example.test" });
  assert.equal(payload.embeds[0].image.url, "attachment://operation-banner.jpg");
  assert.deepEqual(payload.attachments, [{ id: 0, filename: "operation-banner.jpg" }]);
  for (const url of ["https://example.test/image.jpg", "javascript:alert(1)", "http://127.0.0.1/", "data:image/svg+xml;base64,PHN2Zz4="]) assert.equal(validAarBanner(url), false);
  assert.equal(aarContext({ input: { imageData, imageBehavior: "REMOVE" } }).bannerUrl, null);
});

test("preview and Discord use the same bounded public sections, including mention expansion", () => {
  const input = { title: "@".repeat(300), brief: "@".repeat(700), summary: "@".repeat(10000) };
  const section = aarSections(input), payload = aarMessage({ operationId: "op", ...input, reviewRevision: 1, baseUrl: "https://example.test" });
  const report = payload.embeds[0];
  assert.equal(report.title, section.title); assert.equal(section.brief, undefined); assert.ok(report.description.includes(section.summary));
  assert.ok(report.description.length <= 4096); assert.ok(report.title.length <= 256);
  assert.ok(report.title.length + report.description.length + report.author.name.length + report.footer.text.length + report.fields.reduce((n, f) => n + f.name.length + f.value.length, 0) <= 6000);
  assert.ok(section.truncated);
});
