import { CommandError, mayManageOperation } from "./access.js";
import { crewMember, uuid } from "./staffingPolicy.js";
import { lockOperation } from "./operations.js";

const snowflake = value => typeof value === "string" && /^\d{17,20}$/.test(value);
const key = op => `command:${op.guildId}:interested:${op.id}`;
const supported = op => !!op.nativeEventId && op.input.visibility === "GUILD" && ["PUBLISHED", "ACTIVE"].includes(op.state);
const freshManager = async (authorize, userId, op) => {
  const actor = await authorize(userId, { officer: true });
  if (!mayManageOperation(actor, op)) throw new CommandError(403, "MANAGER_REQUIRED", "Only this operation's managers may pull Discord Interested members.");
  return actor;
};

/** All pages must succeed before a roster replaces the previous snapshot. No attendance is inferred. */
export async function readInterested(discord, op) {
  const deadline = Date.now() + 25000;
  if (!supported(op) || !snowflake(op.nativeEventId)) throw new CommandError(409, "DISCORD_EVENT_REQUIRED", "Publish and link a guild-visible Discord event before pulling Interested members.");
  const event = await discord(`/guilds/${op.guildId}/scheduled-events/${op.nativeEventId}`);
  if (!event || event.id !== op.nativeEventId || event.guild_id !== op.guildId || ![1, 2].includes(event.status)) throw new CommandError(409, "DISCORD_EVENT_CHANGED", "The linked Discord event is unavailable or closed. Review its sync status.");
  const members = [], seen = new Set();
  let after = "";
  for (let page = 0; page < 50; page++) {
    if (Date.now() >= deadline) throw new CommandError(503, "INTERESTED_INCOMPLETE", "Discord's Interested roster took too long to read. The previous roster was kept.");
    const rows = await discord(`/guilds/${op.guildId}/scheduled-events/${op.nativeEventId}/users?limit=100&with_member=true${after ? `&after=${after}` : ""}`);
    if (!Array.isArray(rows) || rows.length > 100) throw new CommandError(503, "INTERESTED_INCOMPLETE", "Discord returned an incomplete Interested roster. The previous roster was kept.");
    let highest = after ? BigInt(after) : 0n;
    for (const row of rows) {
      if (row.guild_scheduled_event_id !== op.nativeEventId || !snowflake(row.user?.id) || typeof row.user.username !== "string" || seen.has(row.user.id) || (after && BigInt(row.user.id) <= BigInt(after))) throw new CommandError(503, "INTERESTED_INCOMPLETE", "Discord returned inconsistent Interested records. The previous roster was kept.");
      seen.add(row.user.id);
      if (BigInt(row.user.id) > highest) highest = BigInt(row.user.id);
      if (!row.user.bot && Array.isArray(row.member?.roles) && crewMember({ roleIds: row.member.roles })) members.push({ discordId: row.user.id, username: row.user.username.slice(0, 100), name: (row.member.nick || row.user.global_name || row.user.username).slice(0, 100) });
    }
    if (rows.length < 100) return members;
    if (highest.toString() === after) break;
    after = highest.toString();
  }
  throw new CommandError(503, "INTERESTED_INCOMPLETE", "Discord's Interested roster exceeds the sync limit. The previous roster was kept.");
}

/** @param {any} adapters */
export function createDiscordInterestService({ prisma, authorize, discord }) {
  async function authorizeMember(tx, userId, guildId) {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, discordId: true, isActive: true } });
    if (!user?.isActive) throw new CommandError(403, "ACCOUNT_INACTIVE", "This account is unavailable or suspended.");
    const member = await discord(`/guilds/${guildId}/members/${user.discordId}`);
    if (!member || member.user?.id !== user.discordId || !Array.isArray(member.roles) || member.roles.some(role => typeof role !== "string")) throw new CommandError(403, "MEMBER_INELIGIBLE", "Current guild membership could not be verified.");
    return { id: user.id, guildId, roleIds: member.roles };
  }
  async function snapshot(client, op) {
    const setting = await client.siteSetting.findUnique({ where: { key: key(op) } });
    return setting?.value?.eventId === op.nativeEventId ? setting.value : { eventId: op.nativeEventId, members: [] };
  }
  return {
    authorizeMember,
    async candidates(actor, op) {
      if (!mayManageOperation(actor, op) || !supported(op)) return { members: [], supported: supported(op), checkedAt: null, nextRefreshAt: null };
      const saved = await snapshot(prisma, op);
      const accounts = await prisma.user.findMany({ where: { discordId: { in: saved.members.map(member => member.discordId) } }, select: { id: true, discordId: true, isActive: true } });
      const blocked = await prisma.commandSignup.findMany({ where: { operationId: op.id, status: { not: "COMMITTED" }, userId: { in: accounts.map(account => account.id) } }, select: { userId: true } });
      return { supported: true, checkedAt: saved.checkedAt || null, nextRefreshAt: saved.nextRefreshAt || null,
        members: saved.members.filter(member => { const account = accounts.find(account => account.discordId === member.discordId); return account?.isActive !== false && !blocked.some(row => row.userId === account?.id); }).map(member => ({ userId: `discord:${member.discordId}`, discordId: member.discordId, name: member.name, preferences: "", qualifications: [], source: "DISCORD_INTERESTED" })) };
    },
    async refresh(userId, operationId) {
      if (!uuid(operationId)) throw new CommandError(404, "NOT_FOUND", "Operation not found.");
      const actor = await authorize(userId, { officer: true });
      const reservation = await prisma.$transaction(async tx => {
        const op = await lockOperation(tx, operationId, actor.guildId);
        await freshManager(authorize, userId, op);
        if (!supported(op)) throw new CommandError(409, "DISCORD_EVENT_REQUIRED", "Publish and link a guild-visible Discord event before pulling Interested members.");
        const saved = await snapshot(tx, op);
        if (Date.parse(saved.nextRefreshAt || "") > Date.now()) return { cached: true, count: saved.members.length, nextRefreshAt: saved.nextRefreshAt };
        const startedAt = new Date().toISOString(), nextRefreshAt = new Date(Date.now() + 60000).toISOString();
        const value = { ...saved, startedAt, nextRefreshAt };
        await tx.siteSetting.upsert({ where: { key: key(op) }, create: { key: key(op), value }, update: { value } });
        return { op, startedAt };
      }, { timeout: 20000 });
      if (reservation.cached) return reservation;
      let members;
      try { members = await readInterested(discord, reservation.op); }
      catch (error) {
        // Retain the last complete roster, including on a later-page failure or a 429.
        await prisma.$transaction(async tx => {
          const op = await lockOperation(tx, operationId, actor.guildId), saved = await snapshot(tx, op);
          if (saved.startedAt === reservation.startedAt) await tx.siteSetting.update({ where: { key: key(op) }, data: { value: { ...saved, nextRefreshAt: new Date(Date.now() + Math.max(60000, Number(error.retryAfter || 0) * 1000)).toISOString() } } });
        });
        throw error;
      }
      return prisma.$transaction(async tx => {
        const op = await lockOperation(tx, operationId, actor.guildId);
        await freshManager(authorize, userId, op);
        if (!supported(op) || op.nativeEventId !== reservation.op.nativeEventId) throw new CommandError(409, "DISCORD_EVENT_CHANGED", "The linked event changed. Pull its new roster.");
        const saved = await snapshot(tx, op);
        if (saved.startedAt !== reservation.startedAt) throw new CommandError(409, "INTERESTED_SYNC_CHANGED", "A newer roster refresh is in progress.");
        const value = { ...saved, members, checkedAt: new Date().toISOString() };
        await tx.siteSetting.update({ where: { key: key(op) }, data: { value } });
        await tx.commandOperation.update({ where: { id: op.id }, data: { crewRevision: { increment: 1 } } });
        await tx.auditLog.create({ data: { actorId: actor.id, action: "COMMAND_DISCORD_INTERESTED_PULLED", targetType: "CommandOperation", targetId: op.id, metadata: { nativeEventId: op.nativeEventId, eligibleCount: members.length } } });
        return { cached: false, count: members.length, nextRefreshAt: value.nextRefreshAt };
      }, { timeout: 20000 });
    },
    async confirm(tx, actor, op, token) {
      const discordId = token.slice("discord:".length);
      if (!snowflake(discordId) || !supported(op)) throw new CommandError(422, "INTERESTED_REQUIRED", "Choose an Interested member from this operation's Discord event.");
      const saved = await snapshot(tx, op);
      if (!saved.members.some(member => member.discordId === discordId)) throw new CommandError(409, "INTERESTED_CHANGED", "Pull Discord Interested again before assigning this member.");
      // The saved list supplies choices; a fresh provider read establishes current interest.
      const current = (await readInterested(discord, op)).find(member => member.discordId === discordId);
      if (!current) throw new CommandError(409, "INTERESTED_CHANGED", "This member is no longer Interested or eligible. Pull the roster again.");
      const account = await tx.user.findUnique({ where: { discordId } });
      if (account?.isActive === false) throw new CommandError(403, "ACCOUNT_INACTIVE", "This account is suspended and cannot be assigned.");
      const user = account || await tx.user.upsert({ where: { discordId }, update: {}, create: { discordId, discordUsername: current.username, discordDisplayName: current.name } });
      if (!user.isActive || !crewMember(await authorizeMember(tx, user.id, op.guildId))) throw new CommandError(403, "MEMBER_INELIGIBLE", "Current House Wolf membership is required for assignment.");
      const prior = await tx.commandSignup.findUnique({ where: { operationId_userId: { operationId: op.id, userId: user.id } } });
      if (prior && prior.status !== "COMMITTED") throw new CommandError(409, "EXPLICIT_COMMITMENT_REQUIRED", "This member chose tentative, reserve or withdrawn. They must confirm a committed place before assignment.");
      if (!prior) {
        const plan = await tx.commandOperationPlan.findUnique({ where: { operationId: op.id } });
        const [count, waiting] = await Promise.all([tx.commandSignup.count({ where: { operationId: op.id, status: "COMMITTED" } }), tx.commandOperationWaitlist.count({ where: { operationId: op.id } })]);
        if (plan?.capacity != null && count >= plan.capacity) throw new CommandError(409, "CAPACITY_FULL", "Free a committed place before assigning an Interested member.");
        if (waiting) throw new CommandError(409, "WAITLIST_ORDER", "Give the next waitlisted member their available place first.");
        await tx.commandSignup.create({ data: { operationId: op.id, userId: user.id, status: "COMMITTED", source: "DISCORD_INTERESTED" } });
        await tx.auditLog.create({ data: { actorId: actor.id, action: "COMMAND_DISCORD_INTERESTED_CONFIRMED", targetType: "CommandOperation", targetId: op.id, metadata: { userId: user.id, nativeEventId: op.nativeEventId, source: "DISCORD_INTERESTED" } } });
      }
      return user.id;
    },
  };
}
