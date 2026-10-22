import "server-only";
import { createHash } from "node:crypto";
import { normalizeImageSource } from "@/lib/imageSource";
import { createMarketplaceThreadPayload, type ContactableMarketplaceListing } from "./server";

export class MarketplaceMessagingError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}

type DiscordData = { id: string; guild_id?: string; type?: number; code?: number; thread?: { id: string } };
const safeText = (text: string) => text.replace(/[\\`*_{}[\]()<>#+.!|~]/g, "\\$&").replace(/@/g, "＠");

export async function contactMarketplaceSeller(listing: ContactableMarketplaceListing, buyer: Parameters<typeof createMarketplaceThreadPayload>[1]) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const channelId = process.env.MARKETPLACE_CHANNEL_ID;
  if (!token || !guildId || !channelId) throw new MarketplaceMessagingError("Marketplace messaging is not configured. Please contact a moderator.", 503);
  const payload = createMarketplaceThreadPayload(listing, buyer);
  if (payload.buyerId === payload.sellerId) throw new MarketplaceMessagingError("You cannot contact yourself.", 400);

  async function request(endpoint: string, body?: unknown): Promise<DiscordData> {
    let response: Response;
    try {
      response = await fetch(`https://discord.com/api/v10${endpoint}`, {
        method: body === undefined ? "GET" : "POST",
        headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        cache: "no-store", signal: AbortSignal.timeout(8_000),
      });
    } catch {
      throw new MarketplaceMessagingError("Discord is temporarily unavailable. Please try again shortly.");
    }
    const data = await response.json().catch(() => ({})) as DiscordData;
    if (!response.ok) {
      console.error("Marketplace Discord request failed", { endpoint, status: response.status, code: data.code });
      if (response.status === 401) throw new MarketplaceMessagingError("Discord bot authentication failed. A server administrator needs to update the bot token.", 503);
      throw Object.assign(new MarketplaceMessagingError(response.status === 429 ? "Discord is busy. Please wait a moment and retry." : "Discord could not complete this inquiry. Please contact a moderator.", response.status === 429 ? 429 : 502), { discordCode: data.code });
    }
    return data;
  }

  try {
    await request(`/guilds/${guildId}/members/${payload.buyerId}`);
  } catch (error) {
    if (error && typeof error === "object" && "discordCode" in error && error.discordCode === 10007) {
      return { success: true, method: "invite_required" as const, message: "Join Discord to contact this seller." };
    }
    throw error;
  }
  const channel = await request(`/channels/${channelId}`);
  if (channel.guild_id !== guildId || ![0, 5].includes(channel.type ?? -1)) throw new MarketplaceMessagingError("The marketplace channel must be a text channel in the House Wolf server.", 503);
  const item = safeText(payload.itemTitle).slice(0, 250);
  const nonce = (kind: string) => createHash("sha256").update(`${kind}:${listing.id}:${payload.buyerId}:${payload.sellerId}:${Math.floor(Date.now() / 30_000)}`).digest("hex").slice(0, 24);
  const mentions = { parse: [], users: [payload.buyerId, payload.sellerId] };
  let thumbnail: { url: string } | undefined;
  try {
    const image = new URL(normalizeImageSource(payload.itemImageUrl || ""));
    if (image.protocol === "https:") thumbnail = { url: image.href };
  } catch {}
  const inquiry = await request(`/channels/${channelId}/messages`, {
    content: `<@${payload.sellerId}>, you have a new inquiry from <@${payload.buyerId}>!`,
    allowed_mentions: mentions, nonce: nonce("inquiry"), enforce_nonce: true,
    embeds: [{ color: 0x114e62, title: "New Marketplace Inquiry", fields: [
      { name: "Item", value: item, inline: true },
      { name: "Price", value: `${payload.itemPrice.toLocaleString()} aUEC`, inline: true },
      { name: "Buyer", value: `<@${payload.buyerId}>`, inline: true },
      { name: "Seller", value: `<@${payload.sellerId}>`, inline: true },
    ], ...(thumbnail ? { thumbnail } : {}) }],
  });
  const messageUrl = `https://discord.com/channels/${guildId}/${channelId}/${inquiry.id}`;
  let conversationUrl = messageUrl;
  let method: "thread" | "channel" = "channel";
  let threadName: string | undefined;
  try {
    const thread = inquiry.thread || await request(`/channels/${channelId}/messages/${inquiry.id}/threads`, {
      name: payload.itemTitle.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 95) || "Marketplace inquiry", auto_archive_duration: 1440,
    });
    conversationUrl = `https://discord.com/channels/${guildId}/${thread.id}`;
    threadName = payload.itemTitle;
    method = "thread";
    if (!inquiry.thread) {
      try {
        await request(`/channels/${thread.id}/messages`, { content: `<@${payload.buyerId}> <@${payload.sellerId}>\nCoordinate your **${item}** transaction here. Confirm your meetup, payment, and delivery.`, allowed_mentions: mentions });
      } catch { console.error("Marketplace thread introduction failed; inquiry remains available"); }
    }
  } catch { console.error("Marketplace thread unavailable; using the posted inquiry instead"); }

  async function notify(recipientId: string, title: string) {
    try {
      const dm = await request("/users/@me/channels", { recipient_id: recipientId });
      await request(`/channels/${dm.id}/messages`, {
        embeds: [{ color: 0x114e62, title, description: `**${item}**\n\n[Open your marketplace conversation](${conversationUrl})` }],
        allowed_mentions: { parse: [] }, nonce: nonce(`dm:${recipientId}`), enforce_nonce: true,
      });
      return true;
    } catch { return false; }
  }
  const notifications = await Promise.allSettled([notify(payload.buyerId, "Your marketplace inquiry"), notify(payload.sellerId, "New inquiry about your listing")]);
  const delivered = notifications.map(result => result.status === "fulfilled" && result.value);
  return { success: true, method, threadName, threadUrl: conversationUrl, message: "Your inquiry is ready in Discord.", dmNotifications: { buyer: delivered[0], seller: delivered[1] } };
}
