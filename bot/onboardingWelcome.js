import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const backgroundPath = fileURLToPath(new URL("../public/images/global/Websitebgnew.png", import.meta.url));
const logoPath = fileURLToPath(new URL("../public/images/global/HWiconnew.png", import.meta.url));
const interestNames = {
  "bunker-running": "Bunker Running",
  "space-trucking": "Space Trucking",
  "bounty-hunting": "Bounty Hunting",
  "mining-49er": "Mining 49er",
  "loot-raiders": "Loot Raiders",
};

function escapeXml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);
}

function escapeMarkdown(value) {
  return value.replace(/[\\`*_{}[\]()<>#+.!|~]/g, "\\$&").replace(/@/g, "＠");
}

export async function renderWelcomeBanner(displayName, avatarBytes, options = {}) {
  const height = options.large ? 520 : 420;
  const offsetY = options.large ? 50 : 0;
  const avatarSize = options.large ? 216 : 180;
  const name = escapeXml(Array.from(displayName.replace(/[\u0000-\u001f\u007f]/g, "")).slice(0, 30).join(""));
  const title = escapeXml(options.title || "Welcome to the pack.");
  const kicker = escapeXml(options.kicker || "A NEW CHAPTER. A SHARED BANNER.");
  const footer = escapeXml(options.footer || "STRENGTH. HONOR. BROTHERHOOD.");
  const caption = escapeXml(options.caption || "ONE OF THE PACK");
  const overlay = Buffer.from(`<svg width="1200" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="shade"><stop stop-color="#080e13" stop-opacity=".94"/><stop offset="1" stop-color="#10191e" stop-opacity=".5"/></linearGradient><linearGradient id="line"><stop stop-color="#9b4942"/><stop offset="1" stop-color="#316c7b"/></linearGradient></defs>
    <rect width="1200" height="${height}" fill="url(#shade)"/><path d="M0 1H1200" stroke="url(#line)" stroke-width="4"/>
    <g transform="translate(0 ${offsetY})">
    <path d="M820 0L650 420M900 0L730 420" stroke="#79929e" stroke-opacity=".1"/>
    <rect x="26" y="26" width="1148" height="368" rx="8" fill="none" stroke="#79929e" stroke-opacity=".18"/>
    <text x="136" y="86" fill="#d7dfe3" font-family="sans-serif" font-size="18" font-weight="bold" letter-spacing="5">HOUSE WOLF</text>
    <text x="70" y="160" fill="#bf8980" font-family="monospace" font-size="13" letter-spacing="4">${kicker}</text>
    <text x="67" y="225" fill="#f2f4f5" font-family="sans-serif" font-size="${options.large ? 58 : 49}" font-weight="bold">${title}</text>
    <text x="70" y="279" fill="#b6c6cf" font-family="sans-serif" font-size="${options.large ? 38 : 32}">${name}</text>
    <path d="M70 319H680" stroke="#829eaa" stroke-opacity=".25"/>
    <text x="70" y="354" fill="#a0b2bb" font-family="monospace" font-size="12" letter-spacing="3">${footer}</text>
    <circle cx="990" cy="201" r="${options.large ? 122 : 103}" fill="#081218" stroke="#497584" stroke-width="2"/><circle cx="990" cy="201" r="${options.large ? 134 : 115}" fill="none" stroke="#497584" stroke-opacity=".25"/>
    <text x="990" y="355" text-anchor="middle" fill="#c18a80" font-family="monospace" font-size="12" letter-spacing="3">${caption}</text>
    </g>
  </svg>`);
  const avatar = await sharp(avatarBytes || logoPath).resize(avatarSize, avatarSize, { fit: "cover" }).composite([{ input: Buffer.from(`<svg width="${avatarSize}" height="${avatarSize}"><circle cx="${avatarSize / 2}" cy="${avatarSize / 2}" r="${avatarSize / 2}" fill="white"/></svg>`), blend: "dest-in" }]).png().toBuffer();
  const logo = await sharp(logoPath).resize(54, 54, { fit: "contain" }).png().toBuffer();
  return sharp(backgroundPath).resize(1200, height, { fit: "cover" }).composite([{ input: overlay }, { input: logo, left: 68, top: 48 + offsetY }, { input: avatar, left: 990 - avatarSize / 2, top: 201 + offsetY - avatarSize / 2 }]).png().toBuffer();
}

export function createWelcomeMessage(profile, discordId, displayName = "New Dragoon") {
  const interests = profile.interests.map((interest) => interestNames[interest]).filter(Boolean);
  const fields = [];
  if (interests.length) fields.push({ name: "STAR CITIZEN", value: interests.map((interest) => `▸ ${interest}`).join("\n"), inline: true });
  if (profile.otherGame) fields.push({ name: "BEYOND THE ’VERSE", value: `▸ ${escapeMarkdown(profile.otherGame)}`, inline: true });
  fields.push({ name: "\u200b", value: "Say hello, invite them to your next session, and help our newest member find their crew.", inline: false });
  return {
    allowedMentions: { parse: [], users: [discordId] },
    nonce: createHash("sha256").update(`onboarding:${profile.userId}:${profile.completedAt ? new Date(profile.completedAt).toISOString() : "initial"}`).digest("hex").slice(0, 24),
    enforceNonce: true,
    embeds: [
      { color: 0x470000, image: { url: "attachment://house-wolf-welcome.png", width: 1200, height: 520 } },
      { color: 0x114e62, author: { name: "HOUSE WOLF  /  COMMUNITY WELCOME" }, title: "A NEW DRAGOON · THE NEXT CHAPTER", description: `Meet **${escapeMarkdown(displayName)}**. A few shared interests are the beginning of a good squad.`, fields, footer: { text: "This is the Way!" } },
    ],
  };
}

export async function publishPendingWelcomes(client, prisma) {
  if (!client.isReady() || process.env.ONBOARDING_ENABLED !== "true" || !process.env.GENERAL_CHANNEL_ID || !process.env.DISCORD_GUILD_ID || !process.env.BUYER_ROLE_ID) return;
  const staleBefore = new Date(Date.now() - 5 * 60_000);
  const profiles = await prisma.onboardingProfile.findMany({
    where: { completedAt: { not: null }, welcomeMessageId: null, OR: [{ welcomeClaimedAt: null }, { welcomeClaimedAt: { lt: staleBefore } }] },
    include: { user: { select: { discordId: true, isActive: true } } },
    take: 10,
    orderBy: { completedAt: "asc" },
  });
  for (const profile of profiles) {
    if (!profile.user.isActive) continue;
    const claimedAt = new Date();
    const claim = await prisma.onboardingProfile.updateMany({ where: { userId: profile.userId, welcomeMessageId: null, OR: [{ welcomeClaimedAt: null }, { welcomeClaimedAt: { lt: staleBefore } }] }, data: { welcomeClaimedAt: claimedAt } });
    if (!claim.count) continue;
    try {
      const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
      const member = await guild.members.fetch(profile.user.discordId);
      if (member.roles.cache.has(process.env.BUYER_ROLE_ID)) throw new Error("Buyer role is present; welcome is withheld");
      const channel = await client.channels.fetch(process.env.GENERAL_CHANNEL_ID);
      if (!channel?.isTextBased() || channel.guildId !== guild.id || typeof channel.send !== "function") throw new Error("GENERAL_CHANNEL_ID must be a writable channel in the configured guild");
      let avatarBytes;
      try {
        const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 });
        const avatarResponse = await fetch(avatarUrl, { signal: AbortSignal.timeout(8_000) });
        if (avatarResponse.ok) avatarBytes = Buffer.from(await avatarResponse.arrayBuffer());
      } catch {}
      const banner = await renderWelcomeBanner(member.displayName, avatarBytes, { large: true, footer: "This is the Way!" });
      const message = await channel.send({ ...createWelcomeMessage(profile, member.id, member.displayName), files: [{ attachment: banner, name: "house-wolf-welcome.png" }] });
      await prisma.onboardingProfile.update({ where: { userId: profile.userId }, data: { welcomeMessageId: message.id, welcomeLastError: null } });
    } catch (error) {
      console.error(`Onboarding welcome pending for ${profile.userId}:`, error.message);
      await prisma.onboardingProfile.updateMany({ where: { userId: profile.userId, welcomeClaimedAt: claimedAt, welcomeMessageId: null }, data: { welcomeLastError: String(error.message).slice(0, 500) } });
    }
  }
}

export function startOnboardingWelcomes(client, prisma) {
  if (process.env.ONBOARDING_ENABLED !== "true") return;
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try { await publishPendingWelcomes(client, prisma); }
    catch (error) { console.error("Onboarding welcome worker failed:", error.message); }
    finally { running = false; }
  };
  void run();
  const timer = setInterval(() => void run(), 15_000);
  timer.unref();
}
