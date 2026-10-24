import express from "express";
import dotenv from "dotenv";
import { Client, GatewayIntentBits, Partials, EmbedBuilder } from "discord.js";
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { welcomeOnboardingMember } from "./onboarding.js";
import { startOnboardingWelcomes } from "./onboardingWelcome.js";
import { createMarketplaceGuestService } from "./marketplaceGuestService.js";
import { createPersonnelService } from "./personnelService.js";
import { attachPersonnelInteractions, registerPersonnelCommand } from "./personnelCommands.js";
import { PERSONNEL_ROLES } from "../lib/personnel/policy.js";
import { createPersonnelStartup, validateBotEnvironment } from "./runtime.js";
import { createDiscordActivityService } from "./discordActivity.js";
import { captureRawBody, createBotServiceAuth, createGithubWebhookAuth } from "./httpSecurity.js";
import { createCommandWorker } from "./commandOperations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: [
  join(__dirname, '..', `.env.${process.env.NODE_ENV || "development"}.local`),
  join(__dirname, '..', '.env.local'),
  join(__dirname, '..', `.env.${process.env.NODE_ENV || "development"}`),
  join(__dirname, '..', '.env'),
] });

// Initialize Prisma client
validateBotEnvironment(process.env);
const prisma = new PrismaClient();

// Verify critical env vars are loaded
console.log('🔧 Environment check:');
console.log(`   - DISCORD_BOT_TOKEN: ${process.env.DISCORD_BOT_TOKEN ? '✅ SET' : '❌ MISSING'}`);
console.log(`   - DISCORD_GUILD_ID: ${process.env.DISCORD_GUILD_ID ? '✅ SET' : '❌ MISSING'}`);
console.log(`   - MARKETPLACE_CHANNEL_ID: ${process.env.MARKETPLACE_CHANNEL_ID ? '✅ SET' : '❌ MISSING'}`);
console.log(`   - DISCORD_INVITE_URL: ${process.env.DISCORD_INVITE_URL ? '✅ SET (' + process.env.DISCORD_INVITE_URL + ')' : '❌ MISSING'}`);
console.log(`   - MARKETPLACE_GUEST_ROLE: ${process.env.MARKETPLACE_GUEST_ROLE || 'Marketplace Guest (default)'}`);
console.log(`   - BUYER_ROLE_ID: ${process.env.BUYER_ROLE_ID ? '✅ SET' : '❌ MISSING'}`);
console.log(`   - DISCORD_BOT_CHANNEL_ID: ${process.env.DISCORD_BOT_CHANNEL_ID ? '✅ SET' : '❌ MISSING'}`);
console.log(`   - BOT_SERVICE_TOKEN: ${process.env.BOT_SERVICE_TOKEN ? '✅ SET' : '❌ MISSING'}`);

const BUYER_ROLE_ID = process.env.BUYER_ROLE_ID;
const app = express();
app.use(express.json({ verify: captureRawBody }));
const serviceAuth = createBotServiceAuth(process.env);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // Required for role fetching
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent, // For reading messages if needed
  ],
  partials: [Partials.Channel, Partials.Message],
});

const commandWorker = createCommandWorker({ prisma, client });
for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, () => {
  void commandWorker.stop().finally(() => { client.destroy(); void prisma.$disconnect().finally(() => process.exit(0)); });
});

const marketplaceGuests = createMarketplaceGuestService({
  client,
  prisma,
  config: {
    guildId: process.env.DISCORD_GUILD_ID,
    buyerRoleId: BUYER_ROLE_ID,
    visitorRoleId: process.env.VISITOR_ROLE_ID || PERSONNEL_ROLES.visitor,
    onboardingRoleIds: (process.env.MARKETPLACE_ONBOARDING_ROLE_IDS || "").split(",").map((roleId) => roleId.trim()).filter(Boolean),
  },
});

const personnelConfig = {
  guildId: process.env.DISCORD_GUILD_ID,
  buyerRoleId: BUYER_ROLE_ID,
  rsiApiKey: process.env.RSI_MEMBERSHIP_API_KEY,
  rsiCheckIntervalMs: process.env.RSI_MEMBERSHIP_CHECK_INTERVAL_MS,
};
const personnel = createPersonnelService({ client, prisma, config: personnelConfig });
const activityReports = createDiscordActivityService({ client, prisma, guildId: personnelConfig.guildId });
const personnelStartup = createPersonnelStartup({ client, personnel, registerCommands: (runtimeClient, guildId) => registerPersonnelCommand(runtimeClient, guildId, personnel), guildId: personnelConfig.guildId });
if (process.env.PERSONNEL_ENABLED === "true") attachPersonnelInteractions(client, personnel, personnelConfig);

client.once("ready", async () => {
  commandWorker.start();
  startOnboardingWelcomes(client, prisma);
  console.log(`🤖 Bot logged in as ${client.user.tag}`);
  console.log(`🔧 DISCORD_INVITE_URL configured: ${process.env.DISCORD_INVITE_URL ? 'YES ✅' : 'NO ❌'}`);
  if (process.env.DISCORD_INVITE_URL) {
    console.log(`🔗 Permanent invite link: ${process.env.DISCORD_INVITE_URL}`);
  }

  // Reschedule pending marketplace guest removals from database
  marketplaceGuests.start();
  if (process.env.DISCORD_ACTIVITY_ENABLED !== "false") activityReports.start();
  if (process.env.PERSONNEL_ENABLED === "true") {
    void personnelStartup.start();
  }
});

client.on("guildMemberAdd", async (member) => {
  try {
    const tracked = await marketplaceGuests.reconcileMember(member);
    if (!tracked && !member.roles.cache.has(BUYER_ROLE_ID)) await welcomeOnboardingMember(member);
  } catch (error) {
    console.error("Failed to reconcile joining member:", error.message);
  }
});

client.on("guildMemberUpdate", async (_previous, member) => {
  try { await marketplaceGuests.reconcileMember(member); }
  catch (error) { console.error("Failed to reconcile marketplace roles:", error.message); }
});

client.login(process.env.DISCORD_BOT_TOKEN);

// ✅ POST /create-transaction-thread — Post marketplace inquiry to channel
app.post("/create-transaction-thread", serviceAuth, async (req, res) => {
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

    // CRITICAL: If buyer is not in guild, don't create thread or post yet
    // OAuth callback will handle thread creation after they join
    if (!buyerMember) {
      console.log(`⚠️ Buyer ${buyerName} is not in guild - deferring to OAuth flow`);
      console.log(`⚠️ No thread or message will be created yet (prevents duplicates)`);
      console.log(`⚠️ OAuth callback will create everything after user joins`);

      return res.json({
        success: true,
        method: "invite_required",
        message: "Buyer needs to join Discord server first. They will be redirected to OAuth flow.",
      });
    }

    // Both users are in the guild - proceed with normal flow
    console.log(`✅ Both users in guild - creating inquiry post and thread...`);

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

    // Create thread from the inquiry message
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

      // Send DM notifications to both parties
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
      } catch {
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
app.post("/send-dm", serviceAuth, async (req, res) => {
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
app.post("/send-suspension-dm", serviceAuth, async (req, res) => {
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
app.post("/send-lift-suspension-dm", serviceAuth, async (req, res) => {
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
app.post("/get-member-roles", serviceAuth, async (req, res) => {
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
app.post("/track-marketplace-guest", serviceAuth, async (req, res) => {
  try {
    const { userId, guildId, userTag } = req.body;

    if (typeof userId !== "string" || !/^\d{17,20}$/.test(userId) || typeof guildId !== "string" || guildId !== process.env.DISCORD_GUILD_ID || typeof userTag !== "string" || !userTag || userTag.length > 100) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log(`📝 Tracking marketplace guest ${userTag} (${userId}) for auto-removal`);

    // Schedule the 7-day removal
    await marketplaceGuests.track({ userId, guildId, userTag });

    res.json({ success: true, message: "Guest tracked for auto-removal" });
  } catch (err) {
    console.error("❌ Failed to track marketplace guest:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST /github-webhook — Receive GitHub webhook events and post to Discord
app.post("/github-webhook", createGithubWebhookAuth(process.env), async (req, res) => {
  try {
    const event = req.headers['x-github-event'];
    const payload = req.body;

    // Get the Discord channel
    const GITHUB_UPDATES_CHANNEL_ID = process.env.DISCORD_BOT_CHANNEL_ID;
    if (!GITHUB_UPDATES_CHANNEL_ID) {
      console.error('❌ DISCORD_BOT_CHANNEL_ID not set in environment variables');
      return res.status(500).json({ error: 'Discord channel not configured' });
    }

    // Wait for Discord client to be ready
    if (!client.isReady()) {
      console.log('⏳ Waiting for Discord client to be ready...');
      return res.status(503).json({ error: 'Discord client not ready yet' });
    }

    const channel = await client.channels.fetch(GITHUB_UPDATES_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      console.error('❌ Could not fetch Discord channel or channel is not text-based');
      return res.status(404).json({ error: 'Discord channel not found' });
    }

    let embed = null;

    // Handle different GitHub events
    switch (event) {
      case 'pull_request': {
        const { action, pull_request, repository } = payload;

        // Only handle opened, closed, and reopened PRs
        if (!['opened', 'closed', 'reopened'].includes(action)) {
          return res.json({ success: true, message: 'Event ignored' });
        }

        const isMerged = pull_request.merged;
        const color = action === 'opened' ? 0x10b981 : // Green for opened
                     isMerged ? 0x8b5cf6 : // Purple for merged
                     action === 'closed' ? 0x6b7280 : // Gray for closed
                     0x3b82f6; // Blue for reopened

        const icon = action === 'opened' ? '🔀' :
                    isMerged ? '✅' :
                    action === 'closed' ? '❌' :
                    '🔄';

        const actionText = isMerged ? 'merged' : action;

        embed = new EmbedBuilder()
          .setColor(color)
          .setTitle(`${icon} Pull Request ${actionText}: ${pull_request.title}`)
          .setDescription(pull_request.body?.substring(0, 300) || 'No description provided')
          .addFields(
            { name: '👤 Author', value: pull_request.user.login, inline: true },
            { name: '🔢 PR Number', value: `#${pull_request.number}`, inline: true },
            { name: '🌿 Branch', value: `\`${pull_request.head.ref}\` → \`${pull_request.base.ref}\``, inline: false },
            { name: '📝 Changes', value: `+${pull_request.additions} / -${pull_request.deletions} lines`, inline: true },
            { name: '📂 Files', value: `${pull_request.changed_files} file(s)`, inline: true }
          )
          .setURL(pull_request.html_url)
          .setFooter({ text: repository.full_name })
          .setTimestamp();
        break;
      }

      case 'push': {
        const { ref, commits, repository, pusher, compare } = payload;

        // Ignore non-branch pushes
        if (!ref.startsWith('refs/heads/')) {
          return res.json({ success: true, message: 'Event ignored' });
        }

        const branch = ref.replace('refs/heads/', '');
        const commitCount = commits.length;

        if (commitCount === 0) {
          return res.json({ success: true, message: 'No commits to report' });
        }

        // Build commit list (max 5)
        const commitList = commits.slice(0, 5).map(commit =>
          `• [\`${commit.id.substring(0, 7)}\`](${commit.url}) ${commit.message.split('\n')[0]}`
        ).join('\n');

        const moreCommits = commitCount > 5 ? `\n*...and ${commitCount - 5} more commit(s)*` : '';

        embed = new EmbedBuilder()
          .setColor(0x3b82f6) // Blue
          .setTitle(`📌 ${commitCount} new commit${commitCount > 1 ? 's' : ''} pushed to \`${branch}\``)
          .setDescription(`${commitList}${moreCommits}`)
          .addFields(
            { name: '👤 Pushed by', value: pusher.name, inline: true },
            { name: '🌿 Branch', value: `\`${branch}\``, inline: true }
          )
          .setURL(compare)
          .setFooter({ text: repository.full_name })
          .setTimestamp();
        break;
      }

      case 'issues': {
        const { action, issue, repository } = payload;

        // Only handle opened and closed issues
        if (!['opened', 'closed', 'reopened'].includes(action)) {
          return res.json({ success: true, message: 'Event ignored' });
        }

        const color = action === 'opened' ? 0x22c55e : // Green
                     action === 'closed' ? 0xef4444 : // Red
                     0x3b82f6; // Blue

        const icon = action === 'opened' ? '🐛' :
                    action === 'closed' ? '✅' :
                    '🔄';

        embed = new EmbedBuilder()
          .setColor(color)
          .setTitle(`${icon} Issue ${action}: ${issue.title}`)
          .setDescription(issue.body?.substring(0, 300) || 'No description provided')
          .addFields(
            { name: '👤 Author', value: issue.user.login, inline: true },
            { name: '🔢 Issue Number', value: `#${issue.number}`, inline: true }
          )
          .setURL(issue.html_url)
          .setFooter({ text: repository.full_name })
          .setTimestamp();
        break;
      }

      case 'release': {
        const { action, release, repository } = payload;

        if (action !== 'published') {
          return res.json({ success: true, message: 'Event ignored' });
        }

        embed = new EmbedBuilder()
          .setColor(0xfbbf24) // Amber
          .setTitle(`🚀 New Release: ${release.name || release.tag_name}`)
          .setDescription(release.body?.substring(0, 500) || 'No release notes provided')
          .addFields(
            { name: '🏷️ Tag', value: release.tag_name, inline: true },
            { name: '👤 Published by', value: release.author.login, inline: true }
          )
          .setURL(release.html_url)
          .setFooter({ text: repository.full_name })
          .setTimestamp();
        break;
      }

      case 'pull_request_review': {
        const { action, review, pull_request, repository } = payload;

        if (action !== 'submitted') {
          return res.json({ success: true, message: 'Event ignored' });
        }

        const state = review.state.toLowerCase();
        const color = state === 'approved' ? 0x10b981 : // Green
                     state === 'changes_requested' ? 0xef4444 : // Red
                     0x6b7280; // Gray

        const icon = state === 'approved' ? '✅' :
                    state === 'changes_requested' ? '🔄' :
                    '💬';

        const stateText = state.replace('_', ' ');

        embed = new EmbedBuilder()
          .setColor(color)
          .setTitle(`${icon} PR Review: ${stateText}`)
          .setDescription(`**PR:** ${pull_request.title}\n\n${review.body || 'No comment provided'}`)
          .addFields(
            { name: '👤 Reviewer', value: review.user.login, inline: true },
            { name: '🔢 PR', value: `#${pull_request.number}`, inline: true }
          )
          .setURL(review.html_url)
          .setFooter({ text: repository.full_name })
          .setTimestamp();
        break;
      }

      default:
        console.log(`ℹ️ Unhandled GitHub event: ${event}`);
        return res.json({ success: true, message: 'Event type not configured for Discord notifications' });
    }

    // Send the embed to Discord
    if (embed) {
      await channel.send({ embeds: [embed] });
      console.log(`✅ Posted GitHub ${event} update to Discord`);
    }

    console.log(`✅ Posted GitHub ${req.headers['x-github-event']} event to Discord`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Failed to process GitHub webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 4000;
if (process.env.BOT_HTTP_ENABLED !== "false") {
  app.listen(port, () =>
    console.log(`✅ Bot service running on http://localhost:${port}`)
  );
} else {
  console.log("Discord background worker started without inbound HTTP. Website-to-bot HTTP endpoints require a separate transport.");
}
