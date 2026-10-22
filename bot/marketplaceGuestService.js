import { randomUUID } from "node:crypto";
import { EmbedBuilder } from "discord.js";
import { hasOnlyMarketplaceRoles, registerMarketplaceGuest } from "../lib/marketplace/guestRecords.js";

export function createMarketplaceGuestService({ client, prisma, config, now = () => new Date(), logger = console }) {
  const removableRoleIds = [...new Set([config.visitorRoleId, ...(config.onboardingRoleIds || [])].filter(Boolean))];
  let running = false;

  async function release(record, token, data) {
    await prisma.marketplaceGuest.updateMany({ where: { id: record.id, processingToken: token }, data: { processingToken: null, processingUntil: null, ...data } });
  }

  async function retire(record, token) {
    await prisma.marketplaceGuest.deleteMany({ where: { id: record.id, processingToken: token } });
  }

  async function fetchMember(guild, userId) {
    try { return await guild.members.fetch({ user: userId, force: true }); }
    catch (error) { if (Number(error.code) === 10007) return null; throw error; }
  }

  async function processGuest(record) {
    if (!config.buyerRoleId || !config.visitorRoleId || record.guildId !== config.guildId) return;
    if (removableRoleIds.includes(config.buyerRoleId)) throw new Error("Buyer cannot also be a removable onboarding role");
    const token = randomUUID();
    const startedAt = now();
    const claim = await prisma.marketplaceGuest.updateMany({
      where: { id: record.id, OR: [{ processingUntil: null }, { processingUntil: { lt: startedAt } }] },
      data: { processingToken: token, processingUntil: new Date(startedAt.getTime() + 120_000) },
    });
    if (!claim.count) return;
    try {
      const current = await prisma.marketplaceGuest.findUnique({ where: { id: record.id } });
      if (!current || current.processingToken !== token) return;
      const guild = await client.guilds.fetch(current.guildId);
      let member = await fetchMember(guild, current.discordUserId);
      if (!member) { await retire(current, token); return; }
      const roleIds = [...member.roles.cache.keys()];
      if (!hasOnlyMarketplaceRoles(roleIds, guild.id, config.buyerRoleId, removableRoleIds)) {
        if (roleIds.includes(config.buyerRoleId)) await member.roles.remove(config.buyerRoleId, "Marketplace guest became a regular member; preserve membership roles");
        await retire(current, token);
        return;
      }
      const rolesToRemove = removableRoleIds.filter((roleId) => member.roles.cache.has(roleId));
      if (rolesToRemove.length) await member.roles.remove(rolesToRemove, "Marketplace buyers skip Visitor and onboarding interest roles");
      if (new Date(current.expiresAt) <= now()) {
        member = await fetchMember(guild, current.discordUserId);
        if (!member) { await retire(current, token); return; }
        if (!hasOnlyMarketplaceRoles([...member.roles.cache.keys()], guild.id, config.buyerRoleId, removableRoleIds)) {
          await release(current, token, { nextCheckAt: now() });
          return;
        }
        const latest = await prisma.marketplaceGuest.findUnique({ where: { id: current.id } });
        if (!latest || latest.processingToken !== token || new Date(latest.processingUntil) <= now() || new Date(latest.expiresAt) > now()) {
          await release(current, token, { nextCheckAt: now() });
          return;
        }
        await member.kick("Marketplace guest access expired after 7 days");
        try {
          const farewell = new EmbedBuilder().setColor(0x470000).setTitle("Marketplace access expired")
            .setDescription("Your seven-day marketplace access has ended and you have been removed from the server. You can request access again by contacting a seller on House Wolf Marketplace.");
          await member.send({ embeds: [farewell] });
        } catch {}
        await retire(current, token);
        return;
      }
      const warningDue = new Date(current.warningAt) <= now() && !current.warningSentAt && !current.warningUnavailable;
      const canAttemptWarning = !current.warningAttemptedAt || now().getTime() - new Date(current.warningAttemptedAt).getTime() >= 300_000;
      if (warningDue && canAttemptWarning) {
        await prisma.marketplaceGuest.updateMany({ where: { id: current.id, processingToken: token }, data: { warningAttemptedAt: now() } });
        const embed = new EmbedBuilder().setColor(0xfbbf24).setTitle("Marketplace access expiring soon")
          .setDescription("Your temporary marketplace access is ending. Complete any pending transactions before your access expires.")
          .addFields({ name: "Access expires", value: `<t:${Math.floor(new Date(current.expiresAt).getTime() / 1000)}:F> (<t:${Math.floor(new Date(current.expiresAt).getTime() / 1000)}:R>)` })
          .setFooter({ text: "House Wolf Marketplace · Contact a moderator if you need more time." });
        try {
          await member.send({ embeds: [embed] });
          await prisma.marketplaceGuest.updateMany({ where: { id: current.id, processingToken: token }, data: { warningSentAt: now() } });
        } catch (error) {
          if (Number(error.code) !== 50007) throw error;
          await prisma.marketplaceGuest.updateMany({ where: { id: current.id, processingToken: token }, data: { warningUnavailable: true } });
        }
      }
      const nextCheck = Math.min(now().getTime() + 300_000, new Date(current.expiresAt).getTime(), ...(new Date(current.warningAt) > now() ? [new Date(current.warningAt).getTime()] : []));
      await release(current, token, { nextCheckAt: new Date(nextCheck), lastError: null });
    } catch (error) {
      logger.error(`Marketplace guest ${record.discordUserId} will be retried:`, error.message);
      await release(record, token, { nextCheckAt: new Date(now().getTime() + 60_000), lastError: String(error.message).slice(0, 500) });
    }
  }

  async function run() {
    if (running || !client.isReady() || !config.guildId || !config.buyerRoleId || !config.visitorRoleId) return;
    running = true;
    try {
      const records = await prisma.marketplaceGuest.findMany({ where: { guildId: config.guildId, nextCheckAt: { lte: now() } }, orderBy: { nextCheckAt: "asc" }, take: 100 });
      for (const record of records) await processGuest(record);
    } catch (error) { logger.error("Marketplace guest reconciliation failed:", error.message); }
    finally { running = false; }
  }

  async function reconcileMember(member) {
    if (member.guild.id !== config.guildId || member.user.bot) return false;
    const record = await prisma.marketplaceGuest.findUnique({ where: { discordUserId_guildId: { discordUserId: member.id, guildId: member.guild.id } } });
    if (!record) return false;
    await processGuest(record);
    return true;
  }

  async function track({ userId, guildId, userTag }) {
    if (!config.buyerRoleId || !config.visitorRoleId || guildId !== config.guildId || !/^\d{17,20}$/.test(userId) || typeof userTag !== "string" || !userTag || userTag.length > 100) throw new Error("Invalid marketplace guest configuration or identity");
    const guild = await client.guilds.fetch(guildId);
    const member = await fetchMember(guild, userId);
    if (!member || !hasOnlyMarketplaceRoles([...member.roles.cache.keys()], guildId, config.buyerRoleId, removableRoleIds)) throw new Error("Only Buyer-only marketplace guests can receive temporary access");
    await registerMarketplaceGuest(prisma, { userId, guildId, userTag }, now());
    await reconcileMember(member);
  }

  function start() {
    if (!config.guildId || !config.buyerRoleId || !config.visitorRoleId) {
      logger.error("Marketplace guest worker requires DISCORD_GUILD_ID, BUYER_ROLE_ID, and VISITOR_ROLE_ID");
      return () => {};
    }
    void run();
    const timer = setInterval(() => void run(), 15_000);
    timer.unref();
    return () => clearInterval(timer);
  }

  return { start, run, processGuest, reconcileMember, track };
}
