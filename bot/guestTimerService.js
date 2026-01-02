import { prisma } from "../prisma.js";
import { getDiscordClient } from "../client.js";
import ms from "ms";

const activeTimers = new Map();

/**
 * Schedules a guest record for expiration (3 days) + 48-hour warning
 */
export async function scheduleGuestTimer(record) {
  const { id, guildId, discordUserId, expiresAt, warningAt } = record;

  if (activeTimers.has(id)) {
    console.log(`⏭ Timer ${id} already exists, skipping.`);
    return;
  }

  const now = Date.now();
  const expiryDelay = new Date(expiresAt).getTime() - now;
  const warningDelay = new Date(warningAt).getTime() - now;

  // If already expired → process immediately
  if (expiryDelay <= 0) {
    console.log(`⚡ Guest ${discordUserId} already expired`);
    await expireGuest(record);
    return;
  }

  // Schedule 48-hour warning (only if still in future)
  if (warningDelay > 0) {
    setTimeout(() => sendWarning(record), warningDelay);
  }

  console.log(`⏳ Scheduling expiration for ${discordUserId} in ${ms(expiryDelay)}`);

  const timeout = setTimeout(() => expireGuest(record), expiryDelay);

  activeTimers.set(id, { timeout, guildId, discordUserId });
}

/**
 * Called when the guest hits 48 hours
 */
async function sendWarning(record) {
  const { guildId, discordUserId, expiresAt } = record;
  const client = getDiscordClient();

  try {
    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(discordUserId).catch(() => null);
    if (!member) return;

    const embed = {
      color: 0xfbbf24,
      title: "⚠️ Marketplace Access Expires Soon",
      description: `Your temporary marketplace access will expire in **24 hours**.`,
      fields: [
        {
          name: "⏰ Exact Expiration",
          value: `<t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:R>`
        }
      ]
    };

    await member.send({ embeds: [embed] }).catch(() => {});
    console.log(`⚠️ Warning sent to ${discordUserId}`);
  } catch (err) {
    console.error(`❌ Warning failed for ${discordUserId}:`, err);
  }
}

/**
 * Called when the guest hits 72 hours (kick + cleanup)
 */
async function expireGuest(record) {
  const { id, guildId, discordUserId } = record;
  const client = getDiscordClient();

  try {
    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(discordUserId).catch(() => null);

    if (member) {
      const embed = {
        color: 0xef4444,
        title: "👋 Marketplace Access Expired",
        description: `Your temporary 3-day marketplace access has now expired.`,
        fields: [
          {
            name: "What happened?",
            value: "You have been removed from the server."
          },
          {
            name: "Join House Wolf",
            value: "Visit [Roberts Space Industries](https://robertsspaceindustries.com/en/orgs/CUTTERWOLF) to join our organization."
          }
        ]
      };

      await member.send({ embeds: [embed] }).catch(() => {});
      await member.kick("Marketplace guest access expired after 3 days");

      console.log(`🔥 Guest ${discordUserId} removed (3-day expiry)`);
    }

    // Remove DB record
    await prisma.marketplaceGuest.delete({
      where: { id }
    });

  } catch (err) {
    console.error(`❌ Failed to expire guest ${discordUserId}:`, err);
  }

  activeTimers.delete(id);
}

/**
 * @function rescheduleAllMarketplaceGuestTimers
 * @description Loads all marketplace guest records from the database and reschedules their expiration timers.
 * This is typically called on bot startup to ensure all timers are active.
 * @returns {Promise<void>}
 * @author House Wolf Dev Team
 */
export async function rescheduleAllMarketplaceGuestTimers() {
  console.log("🔄 Loading marketplace guest timers from database…");

  try {
    const guests = await prisma.marketplaceGuest.findMany();

    for (const record of guests) {
      await scheduleGuestTimer(record);
    }

    console.log(`✔ Rescheduled ${guests.length} timers.`);
  } catch (err) {
    console.error("❌ Error rescheduling timers:", err);
  }
}
