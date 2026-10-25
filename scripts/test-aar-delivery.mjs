import assert from "node:assert/strict";
import { test } from "node:test";
import { aarMessage } from "../lib/command/aarDelivery.js";
import { validateTextDestination } from "../lib/command/channels.js";

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
