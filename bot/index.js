import express from "express";
import dotenv from "dotenv";
import { Client, GatewayIntentBits, Partials, ChannelType, EmbedBuilder } from "discord.js";
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: join(__dirname, '..', '.env') });

// Initialize Prisma client
const prisma = new PrismaClient();

// Verify critical env vars are loaded
console.log('🔧 Environment check:');
console.log(`   - DISCORD_BOT_TOKEN: ${process.env.DISCORD_BOT_TOKEN ? '✅ SET' : '❌ MISSING'}`);
console.log(`   - DISCORD_GUILD_ID: ${process.env.DISCORD_GUILD_ID ? '✅ SET' : '❌ MISSING'}`);
console.log(`   - MARKETPLACE_CHANNEL_ID: ${process.env.MARKETPLACE_CHANNEL_ID ? '✅ SET' : '❌ MISSING'}`);
console.log(`   - DISCORD_INVITE_URL: ${process.env.DISCORD_INVITE_URL ? '✅ SET (' + process.env.DISCORD_INVITE_URL + ')' : '❌ MISSING'}`);
console.log(`   - MARKETPLACE_GUEST_ROLE: ${process.env.MARKETPLACE_GUEST_ROLE || 'Marketplace Guest (default)'}`);
console.log(`   - BUYER_ROLE_ID: ${process.env.BUYER_ROLE_ID ? '✅ SET' : '❌ MISSING'}`);

const MARKETPLACE_GUEST_ROLE_NAME = process.env.MARKETPLACE_GUEST_ROLE || 'Marketplace Guest';
const BUYER_ROLE_ID = process.env.BUYER_ROLE_ID;
const app = express();
app.use(express.json());

/**
 * Helper function to get the marketplace guest role from a guild
 * Prefers role ID lookup (more reliable), falls back to name search
 */
function getMarketplaceGuestRole(guild) {
  let role = null;

  if (BUYER_ROLE_ID) {
    role = guild.roles.cache.get(BUYER_ROLE_ID);
    if (role) {
      console.log(`🔍 Found role by ID: ${BUYER_ROLE_ID} (${role.name})`);
      return role;
    }
  }

  role = guild.roles.cache.find(r => r.name === MARKETPLACE_GUEST_ROLE_NAME);
  if (role) {
    console.log(`🔍 Found role by name: "${MARKETPLACE_GUEST_ROLE_NAME}"`);
  }

  return role;
}

// ✅ Discord.js client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // Required for role fetching
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent, // For reading messages if needed
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.once("ready", async () => {
  console.log(`🤖 Bot logged in as ${client.user.tag}`);
  console.log(`🔧 DISCORD_INVITE_URL configured: ${process.env.DISCORD_INVITE_URL ? 'YES ✅' : 'NO ❌'}`);
  if (process.env.DISCORD_INVITE_URL) {
    console.log(`🔗 Permanent invite link: ${process.env.DISCORD_INVITE_URL}`);
  }

  // Reschedule pending marketplace guest removals from database
  await rescheduleMarketplaceGuestTimers();
});

// Track marketplace buyers who need the guest role
const pendingMarketplaceBuyers = new Set();

// Track marketplace guests with their join timestamp for auto-removal
const marketplaceGuestTimestamps = new Map(); // userId -> { timestamp, timeoutId, guildId }

// 7 days in milliseconds
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
// 6 days in milliseconds (for warning)
const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;

// Function to reschedule timers from database on bot startup
async function rescheduleMarketplaceGuestTimers() {
  console.log('🔄 Rescheduling marketplace guest timers from database...');

  try {
    // Get all active marketplace guests
    const guests = await prisma.marketplaceGuest.findMany();
    console.log(`📊 Found ${guests.length} marketplace guests in database`);

    const now = Date.now();
    let rescheduled = 0;
    let expired = 0;
    let warned = 0;

    for (const guest of guests) {
      const expiresAt = new Date(guest.expiresAt).getTime();
      const warningAt = new Date(guest.warningAt).getTime();
      const timeUntilExpiry = expiresAt - now;
      const timeUntilWarning = warningAt - now;

      // If already expired, remove them immediately
      if (timeUntilExpiry <= 0) {
        console.log(`⏰ Guest ${guest.discordUserId} already expired, processing removal...`);

        try {
          const guild = await client.guilds.fetch(guest.guildId);
          const member = await guild.members.fetch(guest.discordUserId).catch(() => null);

          if (member) {
            // Send farewell DM
            try {
              const farewellEmbed = new EmbedBuilder()
                .setColor(0xef4444)
                .setTitle("👋 Marketplace Access Expired")
                .setDescription(`Your 7-day marketplace guest access has expired while the bot was offline.`)
                .addFields(
                  { name: "✅ What happened?", value: "You've been removed from the House Wolf Discord server as your temporary marketplace access has ended.", inline: false },
                  { name: "🔄 Need access again?", value: "You can rejoin anytime by contacting another seller on our marketplace!", inline: false }
                )
                .setFooter({ text: "House Wolf - Home of the Dragoons" });

              await member.send({ embeds: [farewellEmbed] }).catch(() => {});
            } catch (e) {}

            await member.kick("Marketplace guest access expired after 7 days");
            console.log(`✅ Removed expired guest ${guest.discordUserId}`);
          }

          // Delete from database
          await prisma.marketplaceGuest.delete({
            where: { discordUserId: guest.discordUserId }
          });
          expired++;
        } catch (error) {
          console.error(`❌ Error processing expired guest ${guest.discordUserId}:`, error.message);
        }
        continue;
      }

      // If warning time passed but not yet expired, send warning now
      if (timeUntilWarning <= 0 && timeUntilExpiry > 0) {
        console.log(`⚠️ Guest ${guest.discordUserId} missed warning, sending now...`);

        try {
          const guild = await client.guilds.fetch(guest.guildId);
          const member = await guild.members.fetch(guest.discordUserId).catch(() => null);

          if (member) {
            const warningEmbed = new EmbedBuilder()
              .setColor(0xfbbf24)
              .setTitle("⚠️ Marketplace Access Expiring Soon")
              .setDescription(`Your marketplace guest access will expire soon!`)
              .addFields(
                { name: "📅 Expires", value: `<t:${Math.floor(expiresAt / 1000)}:R>`, inline: false },
                { name: "💡 What happens?", value: "• You'll be removed from the server\n• Your access to marketplace threads will end\n• Complete any pending transactions before this time", inline: false }
              )
              .setFooter({ text: "This is an automated reminder from House Wolf Marketplace." });

            await member.send({ embeds: [warningEmbed] }).catch(() => {});
          }
          warned++;
        } catch (error) {
          console.error(`❌ Error sending missed warning to ${guest.discordUserId}:`, error.message);
        }
      }

      // Schedule future warning (if not yet sent)
      if (timeUntilWarning > 0) {
        setTimeout(async () => {
          try {
            const guild = await client.guilds.fetch(guest.guildId);
            const member = await guild.members.fetch(guest.discordUserId).catch(() => null);

            if (member) {
              const warningEmbed = new EmbedBuilder()
                .setColor(0xfbbf24)
                .setTitle("⚠️ Marketplace Access Expiring Soon")
                .setDescription(`Your marketplace guest access will expire in **24 hours**.`)
                .addFields(
                  { name: "📅 Expires", value: `<t:${Math.floor(expiresAt / 1000)}:R>`, inline: false },
                  { name: "💡 What happens?", value: "• You'll be removed from the server\n• Your access to marketplace threads will end\n• Complete any pending transactions before this time", inline: false }
                )
                .setFooter({ text: "This is an automated reminder from House Wolf Marketplace." });

              await member.send({ embeds: [warningEmbed] }).catch(() => {});
            }
          } catch (error) {
            console.error(`Error sending warning:`, error);
          }
        }, timeUntilWarning);
      }

      // Schedule removal
      setTimeout(async () => {
        try {
          const guild = await client.guilds.fetch(guest.guildId);
          const member = await guild.members.fetch(guest.discordUserId).catch(() => null);

          if (member) {
            // Send farewell DM
            try {
              const farewellEmbed = new EmbedBuilder()
                .setColor(0xef4444)
                .setTitle("👋 Marketplace Access Expired")
                .setDescription(`Your 7-day marketplace guest access has expired.`)
                .addFields(
                  { name: "✅ What happened?", value: "You've been removed from the House Wolf Discord server as your temporary marketplace access has ended.", inline: false },
                  { name: "🔄 Need access again?", value: "You can rejoin anytime by contacting another seller on our marketplace!", inline: false }
                )
                .setFooter({ text: "House Wolf - Home of the Dragoons" });

              await member.send({ embeds: [farewellEmbed] }).catch(() => {});
            } catch (e) {}

            await member.kick("Marketplace guest access expired after 7 days");
            console.log(`✅ Removed ${guest.discordUserId} (scheduled from db)`);
          }

          // Delete from database
          await prisma.marketplaceGuest.delete({
            where: { discordUserId: guest.discordUserId }
          });
          marketplaceGuestTimestamps.delete(guest.discordUserId);
        } catch (error) {
          console.error(`Error removing marketplace guest:`, error);
        }
      }, timeUntilExpiry);

      // Track in memory
      marketplaceGuestTimestamps.set(guest.discordUserId, {
        timestamp: new Date(guest.joinedAt).getTime(),
        guildId: guest.guildId
      });

      rescheduled++;
      console.log(`⏰ Rescheduled timers for ${guest.discordUserId} (expires in ${Math.round(timeUntilExpiry / 1000 / 60 / 60)} hours)`);
    }

    console.log(`✅ Timer rescheduling complete:`);
    console.log(`   - ${rescheduled} guests rescheduled`);
    console.log(`   - ${expired} expired guests removed`);
    console.log(`   - ${warned} missed warnings sent`);
  } catch (error) {
    console.error('❌ Error rescheduling marketplace guest timers:', error);
  }
}

// Function to schedule marketplace guest removal
async function scheduleMarketplaceGuestRemoval(userId, guildId, userTag) {
  console.log(`⏰ Scheduling auto-removal for user ${userId} in 7 days`);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SEVEN_DAYS_MS);
  const warningAt = new Date(now.getTime() + SIX_DAYS_MS);

  // Save to database for persistence across bot restarts
  try {
    await prisma.marketplaceGuest.upsert({
      where: { discordUserId: userId },
      create: {
        discordUserId: userId,
        discordTag: userTag,
        guildId: guildId,
        joinedAt: now,
        expiresAt: expiresAt,
        warningAt: warningAt
      },
      update: {
        expiresAt: expiresAt,
        warningAt: warningAt,
        joinedAt: now
      }
    });
    console.log(`💾 Saved marketplace guest ${userId} to database (expires: ${expiresAt.toISOString()})`);
  } catch (dbError) {
    console.error(`❌ Failed to save marketplace guest to database:`, dbError);
  }

  // Schedule 6-day warning
  const warningTimeoutId = setTimeout(async () => {
    try {
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId).catch(() => null);

      if (member) {
        const marketplaceGuestRole = getMarketplaceGuestRole(member.guild);

        if (marketplaceGuestRole && member.roles.cache.has(marketplaceGuestRole.id)) {
          console.log(`⚠️ Sending 24-hour warning to ${member.user.tag}`);

          try {
            const warningEmbed = new EmbedBuilder()
              .setColor(0xfbbf24) // Amber
              .setTitle("⚠️ Marketplace Access Expiring Soon")
              .setDescription(`Your marketplace guest access will expire in **24 hours**.`)
              .addFields(
                { name: "📅 Expires", value: "<t:" + Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000) + ":R>", inline: false },
                { name: "💡 What happens?", value: "• You'll be removed from the server\n• Your access to marketplace threads will end\n• Complete any pending transactions before this time", inline: false },
                { name: "🔄 Need more time?", value: "Contact the seller or a server moderator if you need extended access.", inline: false }
              )
              .setFooter({ text: "This is an automated reminder from House Wolf Marketplace." });

            await member.send({ embeds: [warningEmbed] });
          } catch (dmError) {
            console.log(`⚠️ Could not send warning DM to ${member.user.tag}`);
          }
        }
      }
    } catch (error) {
      console.error("Error sending 24h warning:", error);
    }
  }, SIX_DAYS_MS);

  // Schedule 7-day removal
  const removalTimeoutId = setTimeout(async () => {
    try {
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId).catch(() => null);

      if (member) {
        const marketplaceGuestRole = getMarketplaceGuestRole(member.guild);

        if (marketplaceGuestRole && member.roles.cache.has(marketplaceGuestRole.id)) {
          console.log(`🚫 Removing ${member.user.tag} - 7 days expired`);

          // Send farewell DM before kicking
          try {
            const farewellEmbed = new EmbedBuilder()
              .setColor(0xef4444) // Red
              .setTitle("👋 Marketplace Access Expired")
              .setDescription(`Your 7-day marketplace guest access has expired.`)
              .addFields(
                { name: "✅ What happened?", value: "You've been removed from the House Wolf Discord server as your temporary marketplace access has ended.", inline: false },
                { name: "🔄 Need access again?", value: "You can rejoin anytime by contacting another seller on our marketplace!", inline: false },
                { name: "🙏 Thank you!", value: "Thanks for using House Wolf Marketplace. Fly safe, citizen!", inline: false }
              )
              .setFooter({ text: "House Wolf - Home of the Dragoons" });

            await member.send({ embeds: [farewellEmbed] });
          } catch (dmError) {
            console.log(`⚠️ Could not send farewell DM to ${member.user.tag}`);
          }

          // Wait a moment for DM to send, then kick
          await new Promise(resolve => setTimeout(resolve, 1000));

          await member.kick("Marketplace guest access expired after 7 days");
          console.log(`✅ Removed ${member.user.tag} from server (7-day expiry)`);
        }
      }

      // Clean up tracking from memory and database
      marketplaceGuestTimestamps.delete(userId);

      try {
        await prisma.marketplaceGuest.delete({
          where: { discordUserId: userId }
        });
        console.log(`💾 Removed marketplace guest ${userId} from database`);
      } catch (dbError) {
        console.error(`❌ Failed to remove marketplace guest from database:`, dbError);
      }
    } catch (error) {
      console.error("Error removing marketplace guest:", error);
    }
  }, SEVEN_DAYS_MS);

  // Clear any existing timeouts for this user to prevent duplicates
  const existing = marketplaceGuestTimestamps.get(userId);
  if (existing) {
    console.log(`⚠️ Clearing existing timers for ${userId} to prevent duplicates`);
    if (existing.warningTimeoutId) clearTimeout(existing.warningTimeoutId);
    if (existing.removalTimeoutId) clearTimeout(existing.removalTimeoutId);
  }

  // Store both timeout IDs
  marketplaceGuestTimestamps.set(userId, {
    timestamp: Date.now(),
    warningTimeoutId,
    removalTimeoutId,
    guildId
  });
}

// Auto-assign Marketplace Guest role when someone joins
client.on('guildMemberAdd', async (member) => {
  console.log(`👋 New member joined: ${member.user.tag} (${member.id})`);

  // Check if this user is a pending marketplace buyer
  if (pendingMarketplaceBuyers.has(member.id)) {
    console.log(`🛒 User ${member.user.tag} is a marketplace buyer, assigning guest role...`);

    const marketplaceGuestRole = getMarketplaceGuestRole(member.guild);

    if (marketplaceGuestRole) {
      try {
        await member.roles.add(marketplaceGuestRole);
        console.log(`✅ Assigned ${marketplaceGuestRole.name} role to ${member.user.tag}`);

        // Remove from pending set
        pendingMarketplaceBuyers.delete(member.id);

        // Schedule automatic removal after 7 days
        scheduleMarketplaceGuestRemoval(member.id, member.guild.id, member.user.tag);

        // Send welcome DM with 7-day warning
        try {
          const expiryTimestamp = Math.floor((Date.now() + SEVEN_DAYS_MS) / 1000);
          const welcomeEmbed = new EmbedBuilder()
            .setColor(0x10b981)
            .setTitle("🎉 Welcome to House Wolf!")
            .setDescription(`You've been granted **temporary** access to the marketplace transactions channel.`)
            .addFields(
              { name: "📱 What's Next?", value: "You can now view and participate in the marketplace transaction thread for your inquiry.", inline: false },
              { name: "⚠️ IMPORTANT: 7-Day Limit", value: `This is a **temporary guest role** that will automatically expire in 7 days.\n\n**Expires:** <t:${expiryTimestamp}:R> (<t:${expiryTimestamp}:F>)`, inline: false },
              { name: "🚫 What happens after 7 days?", value: "• You'll receive a 24-hour warning before removal\n• You'll be automatically removed from the server\n• Complete your transaction before the expiry date", inline: false },
              { name: "🔄 Need access again?", value: "You can always rejoin by contacting another seller!", inline: false }
            )
            .setFooter({ text: "This is a limited 7-day access role for marketplace transactions only." });

          await member.send({ embeds: [welcomeEmbed] });
        } catch (dmError) {
          console.log("⚠️ Could not send welcome DM to new member");
        }
      } catch (roleError) {
        console.error(`❌ Failed to assign Buyer role to ${member.user.tag}:`, roleError.message);
      }
    } else {
      console.error(`❌ Buyer role not found! Please ensure:`);
      console.error(`   - BUYER_ROLE_ID (${BUYER_ROLE_ID || 'NOT SET'}) points to valid role ID`);
      console.error(`   - OR a role named "${MARKETPLACE_GUEST_ROLE_NAME}" exists in Discord server`);
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

// ✅ POST /create-transaction-thread — Post marketplace inquiry to channel
app.post("/create-transaction-thread", async (req, res) => {
  try {
    const { buyerId, sellerId, buyerName, sellerName, itemTitle, itemPrice, itemImageUrl } = req.body;

    if (!buyerId || !sellerId) {
      return res.status(400).json({ error: "Missing buyer or seller ID" });
    }

    console.log(`🔍 Processing contact request for item: ${itemTitle}`);
    console.log(`   Buyer ID: ${buyerId} (${buyerName})`);
    console.log(`   Seller ID: ${sellerId} (${sellerName})`);

    // Fetch buyer and seller Discord users (works for anyone, not just guild members)
    const buyerUser = await client.users.fetch(buyerId).catch(() => null);
    const sellerUser = await client.users.fetch(sellerId).catch(() => null);

    if (!buyerUser || !sellerUser) {
      console.error(`❌ Failed to fetch Discord users - Buyer: ${!!buyerUser}, Seller: ${!!sellerUser}`);
      return res.status(404).json({ error: "Buyer or seller Discord account not found" });
    }

    console.log(`✅ Fetched Discord users successfully`);

    // Get the guild
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    if (!guild) {
      console.error(`❌ Guild not found: ${process.env.DISCORD_GUILD_ID}`);
      return res.status(404).json({ error: "Guild not found" });
    }

    console.log(`✅ Guild fetched: ${guild.name} (${guild.id})`);

    // Check if buyer is in the guild
    const buyerMember = await guild.members.fetch(buyerId).catch(() => null);
    const sellerMember = await guild.members.fetch(sellerId).catch(() => null);

    console.log(`🔍 Guild membership check:`);
    console.log(`   Buyer (${buyerName}): ${buyerMember ? '✅ IS member' : '❌ NOT member'}`);
    console.log(`   Seller (${sellerName}): ${sellerMember ? '✅ IS member' : '❌ NOT member'}`);

    // Get the specific marketplace transactions channel
    const MARKETPLACE_CHANNEL_ID = process.env.MARKETPLACE_CHANNEL_ID || "1437596965746774148";
    const channel = await client.channels.fetch(MARKETPLACE_CHANNEL_ID);

    if (!channel || !channel.isTextBased()) {
      return res.status(404).json({
        error: "Marketplace transactions channel not found or is not a text channel"
      });
    }

    // Create rich embed for the inquiry
    const embed = new EmbedBuilder()
      .setColor(0x6366f1) // Indigo
      .setTitle("🛒 New Marketplace Inquiry")
      .setDescription(`A buyer is interested in a listing!`)
      .addFields(
        { name: "📦 Item", value: itemTitle, inline: true },
        { name: "💰 Price", value: `${itemPrice.toLocaleString()} aUEC`, inline: true },
        { name: "\u200B", value: "\u200B" },
        { name: "👤 Buyer", value: `${buyerName}\nDiscord: ${buyerUser.tag}\nID: <@${buyerId}>`, inline: true },
        { name: "💼 Seller", value: `${sellerName}\nDiscord: ${sellerUser.tag}\nID: <@${sellerId}>`, inline: true },
        { name: "\u200B", value: "\u200B" },
        { name: "📱 Next Steps", value: `**<@${sellerId}>** - Seller, please DM the buyer to coordinate: <@${buyerId}>`, inline: false }
      )
      .setFooter({ text: "Sellers: Please contact the buyer directly via DM to coordinate the transaction." })
      .setTimestamp();

    if (itemImageUrl && itemImageUrl !== "/placeholder.png") {
      embed.setThumbnail(itemImageUrl);
    }

    // Post the inquiry to the channel (notify the seller)
    const message = await channel.send({
      content: `🔔 <@${sellerId}> - You have a new inquiry from <@${buyerId}>!`,
      embeds: [embed],
    });

    console.log(`✅ Posted marketplace inquiry to channel for ${itemTitle}`);

    // Create a public thread for the transaction (works for non-guild members!)
    const threadName = `💰 ${itemTitle.substring(0, 90)}`; // Thread name limit is 100 chars

    try {
      const thread = await message.startThread({
        name: threadName,
        autoArchiveDuration: 10080, // 7 days
        reason: `Marketplace transaction between ${buyerName} and ${sellerName}`
      });

      // Send welcome message in the thread
      const welcomeEmbed = new EmbedBuilder()
        .setColor(0x10b981) // Green
        .setTitle("💬 Transaction Thread Created!")
        .setDescription(`This is your private space to coordinate the transaction.`)
        .addFields(
          { name: "📦 Item", value: itemTitle, inline: true },
          { name: "💰 Price", value: `${itemPrice.toLocaleString()} aUEC`, inline: true },
          { name: "\u200B", value: "\u200B" },
          { name: "👤 Buyer", value: `<@${buyerId}> (${buyerUser.tag})`, inline: true },
          { name: "💼 Seller", value: `<@${sellerId}> (${sellerUser.tag})`, inline: true },
          { name: "\u200B", value: "\u200B" },
          { name: "📝 Guidelines", value: `• Be respectful and professional\n• Coordinate meetup location & time\n• Confirm payment and delivery\n• Report any issues to moderators\n\nThis thread will auto-archive after 7 days of inactivity.`, inline: false }
        )
        .setFooter({ text: "Communicate directly in this thread. Good luck with your transaction!" })
        .setTimestamp();

      if (itemImageUrl && itemImageUrl !== "/placeholder.png") {
        welcomeEmbed.setThumbnail(itemImageUrl);
      }

      await thread.send({
        content: `<@${buyerId}> <@${sellerId}>`,
        embeds: [welcomeEmbed]
      });

      console.log(`✅ Created transaction thread: ${thread.name} (${thread.id})`);

      const threadUrl = `https://discord.com/channels/${channel.guildId}/${thread.id}`;

      // Check if buyer is in the guild - if not, send them an invite
      if (!buyerMember) {
        console.log(`⚠️ Buyer ${buyerName} is not in guild, sending invite...`);
        console.log(`🔍 Checking env variable DISCORD_INVITE_URL: ${process.env.DISCORD_INVITE_URL || 'NOT SET'}`);

        let inviteUrl = null;

        try {
          // Create a temporary 3-day invite link
          const invite = await channel.createInvite({
            maxAge: 259200, // 3 days (in seconds: 3 * 24 * 60 * 60)
            maxUses: 1, // Single use only
            unique: true,
            reason: `Marketplace inquiry for ${itemTitle} by ${buyerName}`
          });
          inviteUrl = invite.url;
          console.log(`✅ Created temporary 3-day invite: ${inviteUrl}`);
          console.log(`   - Expires in: 3 days`);
          console.log(`   - Max uses: 1`);
        } catch (inviteError) {
          console.error("❌ Failed to create invite:", inviteError.message);
          console.error("❌ Error details:", inviteError);

          // Fallback to permanent invite link from env (emergency only)
          if (process.env.DISCORD_INVITE_URL) {
            inviteUrl = process.env.DISCORD_INVITE_URL;
            console.log(`⚠️ FALLBACK: Using permanent invite link from env: ${inviteUrl}`);
            console.log(`⚠️ This should not happen - check bot permissions!`);
          } else {
            console.error("❌ CRITICAL: No fallback invite available!");
            console.error("❌ Bot cannot create invites AND no DISCORD_INVITE_URL set");
            console.error("❌ Available env vars:", Object.keys(process.env).filter(k => k.includes('DISCORD')));
          }
        }

        console.log(`🔍 Final inviteUrl value: ${inviteUrl || 'NULL - NO INVITE AVAILABLE'}`);

        // Track this buyer so we can auto-assign the guest role when they join
        pendingMarketplaceBuyers.add(buyerId);
        console.log(`📝 Added buyer ${buyerId} to pending marketplace buyers list`);

        if (inviteUrl) {
          // Send DM to buyer with invite AND thread link
          try {
            const inviteExpiryTimestamp = Math.floor((Date.now() + (3 * 24 * 60 * 60 * 1000)) / 1000); // 3 days
            const accessExpiryTimestamp = Math.floor((Date.now() + SEVEN_DAYS_MS) / 1000); // 7 days
            const buyerInviteEmbed = new EmbedBuilder()
              .setColor(0xfbbf24) // Amber
              .setTitle("⚠️ Join Our Discord Server!")
              .setDescription(`Your inquiry for **${itemTitle}** has been posted!\n\nTo view the discussion thread and communicate with the seller, you need to join our Discord server first.`)
              .addFields(
                { name: "📦 Item", value: itemTitle, inline: true },
                { name: "💰 Price", value: `${itemPrice.toLocaleString()} aUEC`, inline: true },
                { name: "\u200B", value: "\u200B" },
                { name: "🔗 Step 1: Join Server", value: `[Click here to join](${inviteUrl})`, inline: false },
                { name: "⏰ Invite Expires", value: `This invite link expires <t:${inviteExpiryTimestamp}:R>. Join soon!`, inline: false },
                { name: "💬 Step 2: View Thread", value: `After joining, [click here to open the thread](${threadUrl})`, inline: false },
                { name: "\u200B", value: "\u200B" },
                { name: "⏰ IMPORTANT: 7-Day Access Limit", value: `You'll be granted **temporary guest access** for **7 days only**.\n\n**Access Expires:** <t:${accessExpiryTimestamp}:R>\n\nYou'll receive a warning 24 hours before removal. Complete your transaction within this timeframe!`, inline: false }
              )
              .setFooter({ text: "Invite expires in 3 days. Server access expires in 7 days." })
              .setTimestamp();

            if (itemImageUrl && itemImageUrl !== "/placeholder.png") {
              buyerInviteEmbed.setThumbnail(itemImageUrl);
            }

            await buyerUser.send({ embeds: [buyerInviteEmbed] }).catch((dmError) => {
              console.log("⚠️ Could not DM buyer (DMs may be disabled):", dmError.message);
            });

            console.log(`✅ Sent invite to non-member buyer via DM`);
          } catch (dmError) {
            console.error("❌ Failed to send DM to buyer:", dmError);
          }

          // Notify seller that buyer needs to join
          if (sellerMember) {
            try {
              const sellerNotification = new EmbedBuilder()
                .setColor(0x6366f1)
                .setTitle("🛒 New Inquiry Thread (Buyer Invited)")
                .setDescription(`A buyer is interested in **${itemTitle}**! They've been sent an invite to join the server.`)
                .addFields(
                  { name: "👤 Buyer", value: `${buyerName} (${buyerUser.tag})`, inline: false },
                  { name: "📱 Status", value: `Thread created, but buyer needs to join server first to access it. They've been sent an invite link.`, inline: false },
                  { name: "💬 Thread", value: `[Open Thread](${threadUrl})`, inline: false }
                )
                .setTimestamp();

              if (itemImageUrl && itemImageUrl !== "/placeholder.png") {
                sellerNotification.setThumbnail(itemImageUrl);
              }

              await sellerUser.send({ embeds: [sellerNotification] }).catch(() => {
                console.log("⚠️ Could not DM seller");
              });
            } catch (sellerDmError) {
              console.error("❌ Failed to send DM to seller:", sellerDmError);
            }
          }

          // Return both thread URL and invite URL
          console.log(`📤 ═══════════════════════════════════════════`);
          console.log(`📤 RETURNING RESPONSE TO FRONTEND:`);
          console.log(`📤   Method: invite_required`);
          console.log(`📤   Invite URL: ${inviteUrl}`);
          console.log(`📤   Thread URL: ${threadUrl}`);
          console.log(`📤   Thread Name: ${thread.name}`);
          console.log(`📤 ═══════════════════════════════════════════`);

          return res.json({
            success: true,
            method: "invite_required",
            threadId: thread.id,
            threadName: thread.name,
            threadUrl: threadUrl,
            inviteUrl: inviteUrl,
            message: "Thread created! You need to join our Discord server to access it. Check your DMs for an invite link!"
          });
        } else {
          console.error("❌ ═══════════════════════════════════════════");
          console.error("❌ CRITICAL: No invite URL available!");
          console.error("❌ This should not happen - check DISCORD_INVITE_URL env var");
          console.error("❌ ═══════════════════════════════════════════");
          return res.status(500).json({
            success: false,
            error: "Unable to generate Discord invite. Please contact an administrator for a server invite link.",
            threadUrl: threadUrl,
            threadId: thread.id
          });
        }
      }

      // Buyer is in guild - send normal notifications
      try {
        const buyerDM = new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle("✅ Transaction Thread Created!")
          .setDescription(`A discussion thread has been created for your inquiry about **${itemTitle}**!`)
          .addFields(
            { name: "💬 Where to Communicate", value: `Click the link below to open the thread and chat with the seller:\n\n🔗 [Open Thread](${threadUrl})`, inline: false }
          )
          .setTimestamp();

        await buyerUser.send({ embeds: [buyerDM] }).catch(() => {
          console.log("⚠️ Could not DM buyer (DMs disabled)");
        });

        const sellerDM = new EmbedBuilder()
          .setColor(0x6366f1)
          .setTitle("🛒 New Inquiry Thread!")
          .setDescription(`Someone is interested in your listing: **${itemTitle}**!`)
          .addFields(
            { name: "💬 Where to Respond", value: `Click the link below to open the thread and chat with the buyer:\n\n🔗 [Open Thread](${threadUrl})`, inline: false }
          )
          .setTimestamp();

        await sellerUser.send({ embeds: [sellerDM] }).catch(() => {
          console.log("⚠️ Could not DM seller (DMs disabled)");
        });
      } catch (dmError) {
        console.log("⚠️ DM notifications skipped (one or both users have DMs disabled)");
      }

      res.json({
        success: true,
        method: "thread",
        threadId: thread.id,
        threadName: thread.name,
        threadUrl: threadUrl,
        message: "Transaction thread created! Check the #marketplace-transactions channel."
      });

    } catch (threadError) {
      console.error("❌ Failed to create thread:", threadError);
      // Fallback: just post the message without a thread
      res.json({
        success: true,
        method: "channel",
        message: "Your inquiry has been posted! Check the #marketplace-transactions channel.",
        messageUrl: `https://discord.com/channels/${channel.guildId}/${channel.id}/${message.id}`
      });
    }
  } catch (err) {
    console.error("❌ Failed to post marketplace inquiry:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Legacy DM endpoint (kept for backwards compatibility)
app.post("/send-dm", async (req, res) => {
  try {
    const { sellerId, itemTitle, itemPrice, buyerName } = req.body;
    if (!sellerId) return res.status(400).json({ error: "Missing sellerId" });

    const sellerUser = await client.users.fetch(sellerId);
    if (!sellerUser) throw new Error("Seller not found on Discord");

    const message = `📦 **Marketplace Inquiry**
**Buyer:** ${buyerName || "Anonymous"}
**Item:** ${itemTitle}
**Price:** ${itemPrice} aUEC
Reply directly here to coordinate.`;

    await sellerUser.send(message);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to send DM:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST /send-suspension-dm — Send suspension notification DM
app.post("/send-suspension-dm", async (req, res) => {
  try {
    const { discordId, reason, durationDays, endDate, isPermanent } = req.body;
    if (!discordId) return res.status(400).json({ error: "Missing discordId" });

    const user = await client.users.fetch(discordId);
    if (!user) throw new Error("User not found on Discord");

    const durationText = isPermanent
      ? "**Permanent**"
      : `**${durationDays} days** (until ${new Date(endDate).toLocaleDateString()})`;

    const embed = new EmbedBuilder()
      .setColor(0xef4444) // Red
      .setTitle("🚫 Marketplace Access Suspended")
      .setDescription(
        `Your marketplace privileges on **House Wolf** have been suspended.`
      )
      .addFields(
        { name: "📋 Reason", value: reason, inline: false },
        { name: "⏰ Duration", value: durationText, inline: false },
        {
          name: "📦 Active Listings",
          value:
            "Your active listings will remain visible. Admins will facilitate any sales and reach out to you when needed. You may also request to have your listings removed.",
          inline: false,
        },
        {
          name: "ℹ️ What This Means",
          value:
            "• You can still view the marketplace\n• You cannot create or edit listings\n• Admins will handle your transactions\n• Check your settings page for details",
          inline: false,
        }
      )
      .setFooter({ text: "House Wolf - Home of the Dragoons" })
      .setTimestamp();

    await user.send({ embeds: [embed] });
    console.log(`✅ Sent suspension DM to ${user.tag}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to send suspension DM:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST /send-lift-suspension-dm — Send suspension lifted notification DM
app.post("/send-lift-suspension-dm", async (req, res) => {
  try {
    const { discordId, reason } = req.body;
    if (!discordId) return res.status(400).json({ error: "Missing discordId" });

    const user = await client.users.fetch(discordId);
    if (!user) throw new Error("User not found on Discord");

    const embed = new EmbedBuilder()
      .setColor(0x10b981) // Green
      .setTitle("✅ Marketplace Access Restored")
      .setDescription(
        `Your marketplace privileges on **House Wolf** have been restored!`
      )
      .addFields(
        { name: "📋 Reason for Lifting", value: reason, inline: false },
        {
          name: "🎉 You Can Now",
          value:
            "• Create new marketplace listings\n• Edit your existing listings\n• Manage your marketplace activity\n• Access the full marketplace dashboard",
          inline: false,
        }
      )
      .setFooter({ text: "House Wolf - Home of the Dragoons" })
      .setTimestamp();

    await user.send({ embeds: [embed] });
    console.log(`✅ Sent lift suspension DM to ${user.tag}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to send lift suspension DM:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST /get-member-roles — Fetch Discord member roles
app.post("/get-member-roles", async (req, res) => {
  try {
    const { discordUserId, guildId } = req.body;

    if (!discordUserId) {
      return res.status(400).json({ error: "Missing discordUserId" });
    }

    const targetGuildId = guildId || process.env.DISCORD_GUILD_ID;

    if (!targetGuildId) {
      return res.status(400).json({ error: "Missing guildId" });
    }

    console.log(`🔍 Fetching roles for user ${discordUserId} in guild ${targetGuildId}`);

    // Fetch the guild
    const guild = await client.guilds.fetch(targetGuildId);

    // Fetch the member
    const member = await guild.members.fetch(discordUserId).catch(() => null);

    if (!member) {
      console.log(`❌ Member ${discordUserId} not found in guild`);
      return res.json({
        success: true,
        isMember: false,
        roles: [],
      });
    }

    // Get role names (excluding @everyone) sorted by position (highest first)
    const roleNames = member.roles.cache
      .filter(role => role.name !== "@everyone")
      .sort((a, b) => b.position - a.position) // Sort by Discord position descending (highest position first)
      .map(role => role.name);

    console.log(`✅ Found ${roleNames.length} roles for ${member.user.tag}`);

    res.json({
      success: true,
      isMember: true,
      roles: roleNames,
      displayName: member.displayName,
      nickname: member.nickname,
    });
  } catch (err) {
    console.error("❌ Failed to fetch member roles:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST /track-marketplace-guest — Track OAuth2-added marketplace guest for auto-removal
app.post("/track-marketplace-guest", async (req, res) => {
  try {
    const { userId, guildId, userTag } = req.body;

    if (!userId || !guildId || !userTag) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log(`📝 Tracking marketplace guest ${userTag} (${userId}) for auto-removal`);

    // Schedule the 7-day removal
    await scheduleMarketplaceGuestRemoval(userId, guildId, userTag);

    res.json({ success: true, message: "Guest tracked for auto-removal" });
  } catch (err) {
    console.error("❌ Failed to track marketplace guest:", err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () =>
  console.log(`✅ Bot service running on http://localhost:${port}`)
);
