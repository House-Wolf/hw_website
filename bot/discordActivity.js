import { createHash, randomUUID } from "node:crypto";
import { gzipSync } from "node:zlib";
import { addCalendarMonths, OFFICER_ROLE_IDS, PERSONNEL_ROLES, SERVICE_RANKS } from "../lib/personnel/policy.js";

export const ACTIVITY_RECIPIENTS = ["486733578483269652", "371697279704236043"];
const memberRoles = new Set([PERSONNEL_ROLES.member, PERSONNEL_ROLES.houseWolf, ...OFFICER_ROLE_IDS, ...SERVICE_RANKS.map(rank => rank.roleId)]);

export function activityPeriod(at, startedAt) {
  let start = new Date(startedAt), end = addCalendarMonths(start, 3);
  while (at >= end) { start = end; end = addCalendarMonths(start, 3); }
  return { start, end };
}

export function activitySnapshot(state, people, activity, generatedAt) {
  const start = new Date(state.periodStartedAt), end = new Date(state.nextReportAt);
  const latest = new Map();
  for (const record of activity) {
    const at = new Date(record.lastActiveAt);
    if (at >= end || at < new Date(state.trackingStartedAt)) continue;
    if (!latest.has(record.discordId) || at > new Date(latest.get(record.discordId).lastActiveAt)) latest.set(record.discordId, record);
  }
  const members = [...people.values()].filter(member => !member.user.bot && (!member.joinedTimestamp || member.joinedTimestamp < end.getTime())
    && [...member.roles.cache.keys()].some(id => memberRoles.has(id))).map(member => {
    const record = latest.get(member.id);
    return { discordId: member.id, name: member.displayName, joinedAt: member.joinedTimestamp ? new Date(member.joinedTimestamp).toISOString() : null,
      lastActiveAt: record ? new Date(record.lastActiveAt).toISOString() : null, source: record?.source || null,
      inactive: !record || new Date(record.lastActiveAt) < start };
  }).sort((a, b) => Number(b.inactive) - Number(a.inactive) || a.name.localeCompare(b.name));
  return { start: start.toISOString(), end: end.toISOString(), trackingStartedAt: new Date(state.trackingStartedAt).toISOString(), generatedAt: generatedAt.toISOString(), members };
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text) || /^\d{16,20}$/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function activityReportMessage(delivery) {
  const report = delivery.report;
  const inactive = report.members.filter(member => member.inactive).length;
  const csv = "\uFEFF" + [["Discord name", "Discord ID", "Last observed activity (UTC)", "Activity type", "Period status", "Server join date (UTC)"],
    ...report.members.map(member => [member.name, member.discordId, member.lastActiveAt || "No activity recorded since tracking began", member.source || "Unknown",
      member.inactive ? "No recorded activity in this period" : "Activity observed in this period", member.joinedAt || "Unknown"])]
    .map(row => row.map(csvCell).join(",")).join("\r\n");
  const file = Buffer.from(csv, "utf8");
  const large = file.length > 7_000_000;
  return {
    allowedMentions: { parse: [] },
    nonce: createHash("sha256").update(`activity:${delivery.id}`).digest("hex").slice(0, 24), enforceNonce: true,
    embeds: [{ color: 0x114e62, author: { name: "HOUSE WOLF  /  OFFICER CORPS" }, title: "QUARTERLY MUSTER · ACTIVITY REVIEW",
      description: "Commanders, the three-month activity review is ready. The attached roster lists each member's last observed activity, with inactive members first.",
      thumbnail: { url: "https://www.housewolf.co/images/global/HWiconnew.png" },
      fields: [
        { name: "REVIEW PERIOD · UTC", value: `${report.start.slice(0, 10)} to ${report.end.slice(0, 10)} (end exclusive)` },
        { name: "MEMBERS", value: String(report.members.length), inline: true },
        { name: "ACTIVITY OBSERVED", value: String(report.members.length - inactive), inline: true },
        { name: "NO RECORDED ACTIVITY", value: String(inactive), inline: true },
        { name: "WHAT THIS MEASURES", value: "Last server message, command/button interaction, or observed voice participation. Message contents and counts are not stored. AFK channels, bots and private DMs are excluded." },
        { name: "COVERAGE", value: `Tracking began ${report.trackingStartedAt.slice(0, 10)}. Only activity visible to the bot while it is connected is included. No recorded activity does not prove absence; review leave and recent join dates before taking action.` },
      ], footer: { text: "Strength, Honor, Death · House Wolf Command" }, timestamp: report.generatedAt }],
    files: [{ attachment: large ? gzipSync(file) : file, name: `house-wolf-activity-${report.end.slice(0, 10)}.csv${large ? ".gz" : ""}` }],
  };
}

export function createDiscordActivityService({ client, prisma, guildId, logger = console, now = () => new Date() }) {
  let running = false, timer, started = false;
  let scheduleLogged = false;
  const handlers = [];
  async function state() {
    const time = now();
    return prisma.discordActivityState.upsert({ where: { guildId }, create: { guildId, trackingStartedAt: time, periodStartedAt: time, nextReportAt: addCalendarMonths(time, 3) }, update: {} });
  }
  async function record(discordId, source, at = now()) {
    const settings = await state();
    if (at < new Date(settings.trackingStartedAt) || at > now()) return;
    const periodStartedAt = activityPeriod(at, settings.trackingStartedAt).start;
    const key = { guildId, discordId, periodStartedAt };
    await prisma.discordMemberActivity.upsert({ where: { guildId_discordId_periodStartedAt: key }, create: { ...key, lastActiveAt: at, source }, update: {} });
    // Late/replayed events must never move last activity backwards.
    await prisma.discordMemberActivity.updateMany({ where: { ...key, lastActiveAt: { lt: at } }, data: { lastActiveAt: at, source } });
  }
  async function prepareReport(settings) {
    const people = await (await client.guilds.fetch(guildId)).members.fetch();
    const activity = await prisma.discordMemberActivity.findMany({ where: { guildId, periodStartedAt: { lt: settings.nextReportAt } } });
    const report = activitySnapshot(settings, people, activity, now());
    await prisma.$transaction(async transaction => {
      const lock = `discord-activity:${guildId}`;
      await transaction.$queryRaw`SELECT 1 AS "locked" FROM pg_advisory_xact_lock(hashtextextended(${lock}, 0))`;
      const current = await transaction.discordActivityState.findUnique({ where: { guildId } });
      if (new Date(current.nextReportAt).getTime() !== new Date(settings.nextReportAt).getTime()) return;
      for (const recipientId of ACTIVITY_RECIPIENTS) {
        const key = { guildId, recipientId, periodEndedAt: current.nextReportAt };
        await transaction.discordActivityDelivery.upsert({ where: { guildId_recipientId_periodEndedAt: key }, create: { ...key, periodStartedAt: current.periodStartedAt, report, nextAttemptAt: now() }, update: {} });
      }
      await transaction.discordActivityState.update({ where: { guildId }, data: { periodStartedAt: current.nextReportAt, nextReportAt: addCalendarMonths(current.nextReportAt, 3) } });
    });
  }
  async function deliver(delivery) {
    const token = randomUUID();
    const claim = await prisma.discordActivityDelivery.updateMany({ where: { id: delivery.id, sentAt: null, nextAttemptAt: { lte: now() }, OR: [{ processingUntil: null }, { processingUntil: { lt: now() } }] }, data: { processingToken: token, processingUntil: new Date(now().getTime() + 120_000) } });
    if (!claim.count) return;
    try {
      const user = await client.users.fetch(delivery.recipientId);
      const message = await user.send(activityReportMessage(delivery));
      await prisma.discordActivityDelivery.updateMany({ where: { id: delivery.id, processingToken: token }, data: { sentAt: now(), messageId: message.id, processingUntil: null, processingToken: null, lastError: null } });
      logger.log(`Quarterly activity report delivered to ${delivery.recipientId}.`);
    } catch (error) {
      await prisma.discordActivityDelivery.updateMany({ where: { id: delivery.id, processingToken: token }, data: { processingToken: null, processingUntil: null, nextAttemptAt: new Date(now().getTime() + (Number(error.code) === 50007 ? 86_400_000 : 3_600_000)), lastError: String(error.message).slice(0, 450) } });
      logger.error(`Quarterly activity DM pending for ${delivery.recipientId}:`, error.message);
    }
  }
  async function poll() {
    if (running || !client.isReady()) return;
    running = true;
    try {
      const settings = await state();
      if (!scheduleLogged) {
        logger.log(`Discord activity tracking began ${new Date(settings.trackingStartedAt).toISOString()}; next private report ${new Date(settings.nextReportAt).toISOString()}.`);
        scheduleLogged = true;
      }
      // An occupied non-AFK voice channel is observable participation. This
      // does not measure speaking time or infer activity while disconnected.
      const server = await client.guilds.fetch(guildId);
      for (const voice of server.voiceStates.cache.values()) if (voice.channelId && voice.channelId !== server.afkChannelId && voice.member && !voice.member.user.bot) await record(voice.id, "VOICE");
      if (new Date(settings.nextReportAt) <= now()) await prepareReport(settings);
      const pending = await prisma.discordActivityDelivery.findMany({ where: { guildId, sentAt: null, nextAttemptAt: { lte: now() } }, take: 10, orderBy: { periodEndedAt: "asc" } });
      for (const delivery of pending) await deliver(delivery);
    } catch (error) { logger.error("Discord activity tracking/reporting will retry:", error.message); }
    finally { running = false; }
  }
  function start() {
    if (started) return;
    started = true;
    const on = (event, action) => {
      const handler = (...args) => { Promise.resolve().then(() => action(...args)).catch(error => logger.error("Discord last-activity update failed:", error.message)); };
      client.on(event, handler); handlers.push([event, handler]);
    };
    on("messageCreate", message => {
      if (message.guildId === guildId && !message.author.bot && !message.webhookId) return record(message.author.id, "MESSAGE", new Date(message.createdTimestamp));
    });
    on("interactionCreate", interaction => {
      if (interaction.guildId === guildId && !interaction.user.bot && (interaction.isChatInputCommand() || interaction.isButton())) return record(interaction.user.id, "INTERACTION");
    });
    on("voiceStateUpdate", (previous, next) => {
      if (next.guild.id === guildId && next.channelId && next.channelId !== next.guild.afkChannelId && previous.channelId !== next.channelId && next.member && !next.member.user.bot) return record(next.id, "VOICE");
    });
    void poll(); timer = setInterval(() => void poll(), 60_000); timer.unref?.();
    logger.log("Discord last-activity tracking enabled; private reports are scheduled every three calendar months.");
  }
  function stop() {
    clearInterval(timer); for (const [event, handler] of handlers) client.off(event, handler); handlers.length = 0; started = false;
  }
  return { start, stop, poll, record };
}
