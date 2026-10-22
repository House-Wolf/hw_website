import { createHash, randomUUID } from "node:crypto";
import { PermissionsBitField } from "discord.js";
import { addCalendarMonths, canManageCommand, COMMAND_DEFINITIONS, evaluatePromotionVotes, nextServiceRank, OFFICER_ROLE_IDS, PERSONNEL_CHANNELS, PERSONNEL_ROLES, promotionReviewDelay, promotionRoleChanges, SERVICE_RANKS, serviceRankFromRoles } from "../lib/personnel/policy.js";
import { promotionAnnouncement, promotionReviewMessage } from "./personnelMessages.js";
import { checkPublicRsiMembership } from "./rsiMembership.js";

const requestInclude = { member: true, votes: true };
const activeStates = ["REVIEW", "APPROVED", "EXECUTING", "RETRY"];
const protectedPermissions = ["Administrator", "ManageRoles", "ManageGuild", "ManageChannels", "ManageWebhooks", "BanMembers", "KickMembers", "ModerateMembers", "MentionEveryone", "ViewAuditLog", "ManageMessages"].map((key) => PermissionsBitField.Flags[key]);

export function createPersonnelService({ client, prisma, config, now = () => new Date(), logger = console }) {
  let running = false;

  async function guild() {
    if (!config.guildId || !config.buyerRoleId || Object.values(PERSONNEL_ROLES).includes(config.buyerRoleId)) throw new Error("Personnel requires the server ID and a Buyer role distinct from all membership, rank, and officer roles.");
    return client.guilds.fetch(config.guildId);
  }
  async function liveMember(discordId) { return (await guild()).members.fetch({ user: discordId, force: true }); }
  function roleIds(member) { return [...member.roles.cache.keys()]; }
  async function officer(discordId, warlordOnly = false) {
    const member = await liveMember(discordId);
    if (member.user.bot || !(warlordOnly ? member.roles.cache.has(PERSONNEL_ROLES.warlord) : OFFICER_ROLE_IDS.some((id) => member.roles.cache.has(id)))) throw new Error(warlordOnly ? "Only the Clan Warlord may perform this action." : "A current officer rank is required.");
    return member;
  }
  async function audit(action, memberDiscordId, details, actorDiscordId = null, requestId = null, database = prisma) {
    return database.personnelAudit.create({ data: { guildId: config.guildId, action, memberDiscordId, actorDiscordId, requestId, details } });
  }
  async function withRequest(id, operation) {
    return prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "promotion_requests" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const request = await transaction.promotionRequest.findUnique({ where: { id }, include: requestInclude });
      if (!request || request.member.guildId !== config.guildId) throw new Error("Promotion order not found in this server.");
      return operation(transaction, request);
    }, { maxWait: 5_000, timeout: 15_000 });
  }
  async function channel(id) {
    const result = await client.channels.fetch(id);
    if (!result?.isTextBased() || result.guildId !== config.guildId || typeof result.send !== "function") throw new Error("Personnel channel is missing or belongs to another server.");
    return result;
  }
  async function preflightRoles(ids, { specialist = false } = {}) {
    const server = await guild();
    await server.members.fetchMe();
    const roles = await server.roles.fetch();
    for (const id of ids) {
      const role = roles.get(id);
      if (!role || !role.editable || role.managed || id === server.id) throw new Error(`Role ${id} is missing, managed, or above the bot. No roles were changed.`);
      if (specialist && protectedPermissions.some((permission) => role.permissions.has(permission))) throw new Error("Specialist assignments cannot grant moderation or administrative permissions.");
    }
    return roles;
  }

  async function syncWebsiteRank(transaction, discordId, rank, changes, roles) {
    const user = await transaction.user.findUnique({ where: { discordId } });
    if (!user) return;
    for (const id of changes.add) {
      const role = roles.get(id);
      await transaction.discordRole.upsert({ where: { id }, create: { id, name: role.name, position: role.position, color: role.color, isManaged: role.managed }, update: { name: role.name, position: role.position, color: role.color, isManaged: role.managed } });
      await transaction.userRole.upsert({ where: { userId_discordRoleId: { userId: user.id, discordRoleId: id } }, create: { userId: user.id, discordRoleId: id }, update: {} });
    }
    await transaction.userRole.deleteMany({ where: { userId: user.id, discordRoleId: { in: changes.remove } } });
    const websiteRank = rank ? await transaction.rank.findFirst({ where: { name: { equals: rank.name, mode: "insensitive" } } }) : null;
    if (websiteRank) await transaction.mercenaryProfile.updateMany({ where: { userId: user.id }, data: { rankId: websiteRank.id } });
  }

  async function refreshReview(id) {
    const request = await prisma.promotionRequest.findUnique({ where: { id }, include: requestInclude });
    if (!request || request.approvalsRequired === 0) return;
    const member = await liveMember(request.member.discordId);
    const destination = await channel(config.officerChannelId || PERSONNEL_CHANNELS.officers);
    const payload = promotionReviewMessage(request, member);
    if (request.officerMessageId) {
      try { await (await destination.messages.fetch(request.officerMessageId)).edit(payload); return; }
      catch (error) {
        if (Number(error.code) !== 10008) throw error;
        await prisma.promotionRequest.updateMany({ where: { id, officerMessageId: request.officerMessageId }, data: { officerMessageId: null } });
      }
    }
    const token = randomUUID();
    const claim = await prisma.promotionRequest.updateMany({ where: { id, officerMessageId: null, OR: [{ processingUntil: null }, { processingUntil: { lt: now() } }] }, data: { processingToken: token, processingUntil: new Date(now().getTime() + 120_000) } });
    if (!claim.count) return;
    try {
      const message = await destination.send(payload);
      await prisma.promotionRequest.updateMany({ where: { id, processingToken: token }, data: { officerMessageId: message.id, processingToken: null, processingUntil: null, lastError: null } });
    } catch (error) {
      await prisma.promotionRequest.updateMany({ where: { id, processingToken: token }, data: { processingToken: null, processingUntil: new Date(now().getTime() + 60_000), lastError: `Review: ${String(error.message).slice(0, 450)}` } });
      throw error;
    }
  }

  async function castVote({ requestId, actorId, decision, messageId, channelId }) {
    if (!["APPROVE", "REJECT"].includes(decision)) throw new Error("Invalid ballot.");
    if (channelId !== (config.officerChannelId || PERSONNEL_CHANNELS.officers)) throw new Error("Use the promotion order in officer-chat.");
    const actor = await officer(actorId);
    const result = await withRequest(requestId, async (transaction, request) => {
      if (request.status !== "REVIEW") throw new Error("This decision is final. Voting has closed.");
      if (request.officerMessageId !== messageId) throw new Error("This is not the current promotion review message.");
      if (request.member.discordId === actorId) throw new Error("Officers cannot vote on their own promotion.");
      const isVeto = decision === "REJECT" && actor.roles.cache.has(PERSONNEL_ROLES.warlord);
      await transaction.promotionVote.upsert({ where: { requestId_voterDiscordId: { requestId, voterDiscordId: actorId } }, create: { requestId, voterDiscordId: actorId, decision, isVeto }, update: { decision, isVeto } });
      const votes = await transaction.promotionVote.findMany({ where: { requestId } });
      const tally = evaluatePromotionVotes(votes, request.approvalsRequired);
      const nextReviewReminderAt = tally.status === "REVIEW" && tally.rejections > 0
        ? request.nextReviewReminderAt || addCalendarMonths(now(), promotionReviewDelay(request.targetRankRoleId)) : null;
      const data = { status: tally.status, nextReviewReminderAt, ...(isVeto ? { vetoedBy: actorId } : {}), ...(tally.status === "APPROVED" ? { thresholdAt: now(), executeAfter: now() } : {}) };
      await transaction.promotionRequest.update({ where: { id: requestId }, data });
      await audit(isVeto ? "PROMOTION_VETOED" : "PROMOTION_VOTE", request.member.discordId, { decision, ...tally, authorityRoleIds: roleIds(actor).filter((id) => OFFICER_ROLE_IDS.includes(id)) }, actorId, requestId, transaction);
      return tally;
    });
    try { await refreshReview(requestId); } catch (error) { logger.error("Review message refresh pending:", error.message); }
    if (result.status === "APPROVED") await executeRequest(requestId);
    return result;
  }

  async function executeRequest(id) {
    const token = randomUUID();
    const request = await withRequest(id, async (transaction, current) => {
      if (!["APPROVED", "RETRY", "EXECUTING"].includes(current.status) || current.vetoedBy) return null;
      if (current.processingUntil && current.processingUntil > now()) return null;
      if (current.executeAfter && current.executeAfter > now()) return null;
      if (current.approvalsRequired > 0 && evaluatePromotionVotes(current.votes, current.approvalsRequired).status !== "APPROVED") throw new Error("The recorded vote does not authorize execution.");
      return transaction.promotionRequest.update({ where: { id }, data: { status: "EXECUTING", processingToken: token, processingUntil: new Date(now().getTime() + 300_000) }, include: requestInclude });
    });
    if (!request) return;
    try {
      const member = await liveMember(request.member.discordId);
      const target = SERVICE_RANKS.find((rank) => rank.roleId === request.targetRankRoleId);
      if (!target) throw new Error("Unknown target rank.");
      const founding = target.roleId === PERSONNEL_ROLES.foundling;
      const ranksPresent = SERVICE_RANKS.filter((rank) => member.roles.cache.has(rank.roleId));
      if ((founding && request.member.currentRankRoleId) || OFFICER_ROLE_IDS.some((roleId) => member.roles.cache.has(roleId)) || ranksPresent.some((rank) => ![request.sourceRankRoleId, request.targetRankRoleId].includes(rank.roleId))
        || (!founding && (!request.member.rankSince || new Date(request.member.rankSince).getTime() !== new Date(request.rankSince).getTime() || request.member.currentRankRoleId !== request.sourceRankRoleId || !ranksPresent.length))) {
        await prisma.promotionRequest.update({ where: { id }, data: { status: "STALE", processingToken: null, processingUntil: null, lastError: "Live rank or recorded tenure changed. Leadership review is required." } });
        await audit("PROMOTION_STALE", member.id, { roles: roleIds(member) }, null, id);
        try { await refreshReview(id); } catch (error) { logger.error("Stale promotion review refresh failed:", error.message); }
        return;
      }
      if (founding && (!request.member.applicationAcceptedAt || !request.member.membershipConfirmedAt || !request.member.membershipVerifiedBy || !request.member.rsiHandle)) throw new Error("Foundling requires both an accepted application and verified RSI membership identity.");
      const changes = promotionRoleChanges(target.roleId, founding ? null : request.sourceRankRoleId, config.buyerRoleId);
      const roles = await preflightRoles([...changes.add, ...changes.remove]);
      const latest = await prisma.promotionRequest.findUnique({ where: { id } });
      if (latest?.processingToken !== token || latest.status !== "EXECUTING" || latest.processingUntil <= now()) throw new Error("Promotion execution lease expired before role changes.");
      await audit("PROMOTION_ROLE_CHANGE_STARTED", member.id, changes, null, id);
      for (const roleId of changes.add) await member.roles.add(roleId, `House Wolf promotion order ${id}`);
      for (const roleId of changes.remove) if (member.roles.cache.has(roleId)) await member.roles.remove(roleId, `House Wolf promotion order ${id}`);
      const verified = await liveMember(member.id);
      if (!changes.add.every((roleId) => verified.roles.cache.has(roleId)) || changes.remove.some((roleId) => verified.roles.cache.has(roleId))) throw new Error("Discord role reconciliation is incomplete; this order will retry.");
      const effectiveAt = now();
      await withRequest(id, async (transaction, current) => {
        if (current.processingToken !== token || current.status !== "EXECUTING") throw new Error("Promotion order changed during execution.");
        await transaction.personnelMember.update({ where: { id: current.memberId }, data: { currentRankRoleId: target.roleId, rankSince: effectiveAt, rankSource: "PROMOTION_ORDER" } });
        await syncWebsiteRank(transaction, member.id, target, changes, roles);
        await transaction.marketplaceGuest.deleteMany({ where: { guildId: config.guildId, discordUserId: member.id } });
        await transaction.promotionRequest.update({ where: { id }, data: { status: "COMPLETED", completedAt: effectiveAt, processingToken: null, processingUntil: null, lastError: null } });
        await audit("PROMOTION_COMPLETED", member.id, { targetRoleId: target.roleId, effectiveAt: effectiveAt.toISOString() }, null, id, transaction);
      });
      await publishAnnouncement(id);
    } catch (error) {
      await prisma.promotionRequest.updateMany({ where: { id, processingToken: token }, data: { status: "RETRY", processingToken: null, processingUntil: null, executeAfter: new Date(now().getTime() + 60_000), lastError: String(error.message).slice(0, 500) } });
      logger.error(`Promotion ${id} requires a retry:`, error.message);
    }
    try { await refreshReview(id); } catch (error) { logger.error("Promotion review refresh failed:", error.message); }
  }

  async function publishAnnouncement(id) {
    const token = randomUUID();
    const claim = await prisma.promotionRequest.updateMany({ where: { id, status: "COMPLETED", announcementMessageId: null, OR: [{ processingUntil: null }, { processingUntil: { lt: now() } }] }, data: { processingToken: token, processingUntil: new Date(now().getTime() + 300_000) } });
    if (!claim.count) return;
    try {
      const request = await prisma.promotionRequest.findUnique({ where: { id }, include: requestInclude });
      const member = await liveMember(request.member.discordId);
      const destination = await channel(config.announcementChannelId || PERSONNEL_CHANNELS.announcements);
      const message = await destination.send(await promotionAnnouncement(request, member));
      await prisma.promotionRequest.updateMany({ where: { id, processingToken: token }, data: { announcementMessageId: message.id, processingToken: null, processingUntil: null, lastError: null } });
    } catch (error) {
      await prisma.promotionRequest.updateMany({ where: { id, processingToken: token }, data: { processingToken: null, processingUntil: new Date(now().getTime() + 60_000), lastError: `Announcement: ${String(error.message).slice(0, 450)}` } });
      logger.error(`Promotion announcement ${id} will retry:`, error.message);
    }
  }

  async function acceptApplication({ actorId, discordId, rsiHandle, evidence, rsiConfirmed = false }) {
    await officer(actorId);
    const handle = rsiHandle.trim().toLowerCase();
    if (!/^[a-z0-9_-]{3,60}$/.test(handle) || !evidence?.trim() || evidence.length > 1000) throw new Error("Provide a valid RSI handle and membership/application evidence.");
    const member = await liveMember(discordId);
    if (member.user.bot) throw new Error("Bots cannot be enlisted.");
    const observedRank = serviceRankFromRoles(roleIds(member));
    const existing = await prisma.personnelMember.findUnique({ where: { guildId_discordId: { guildId: config.guildId, discordId } } });
    if (existing?.rsiHandle && existing.rsiHandle !== handle) throw new Error("RSI identity is already linked. Correct it through an audited administrative migration.");
    const linked = await prisma.personnelMember.findUnique({ where: { guildId_rsiHandle: { guildId: config.guildId, rsiHandle: handle } } });
    if (linked && linked.discordId !== discordId) throw new Error("This RSI handle is already linked to another Discord member.");
    const record = await prisma.personnelMember.upsert({
      where: { guildId_discordId: { guildId: config.guildId, discordId } },
      create: { guildId: config.guildId, discordId, rsiHandle: handle, applicationAcceptedAt: now(), membershipEvidence: evidence, ...(observedRank ? { currentRankRoleId: observedRank.roleId } : {}), ...(rsiConfirmed ? { membershipConfirmedAt: now(), membershipVerifiedBy: actorId } : {}) },
      update: { applicationAcceptedAt: existing?.applicationAcceptedAt || now(), membershipEvidence: evidence, ...(rsiConfirmed ? { membershipConfirmedAt: existing?.membershipConfirmedAt || now(), membershipVerifiedBy: actorId } : {}) },
    });
    await audit("APPLICATION_ACCEPTED", discordId, { rsiHandle: handle, evidence, rsiConfirmed, identityAttestedBy: actorId }, actorId);
    await considerMember(record);
    return record;
  }

  async function recordHistory({ actorId, discordId, rankRoleId, since, evidence }) {
    await officer(actorId, true);
    const date = new Date(since);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(since) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== since || date > now() || !evidence?.trim() || evidence.length > 1000) throw new Error("Provide an actual YYYY-MM-DD service date and evidence.");
    const member = await liveMember(discordId);
    if (serviceRankFromRoles(roleIds(member))?.roleId !== rankRoleId) throw new Error("The imported service rank must match exactly one current non-officer rank.");
    const pending = await prisma.promotionRequest.findFirst({ where: { member: { guildId: config.guildId, discordId }, status: { in: activeStates } } });
    if (pending) throw new Error("Resolve the active promotion order before changing service history.");
    const record = await prisma.personnelMember.upsert({ where: { guildId_discordId: { guildId: config.guildId, discordId } }, create: { guildId: config.guildId, discordId, currentRankRoleId: rankRoleId, rankSince: date, rankSource: "VERIFIED_HISTORY" }, update: { currentRankRoleId: rankRoleId, rankSince: date, rankSource: "VERIFIED_HISTORY" } });
    await audit("SERVICE_HISTORY_RECORDED", discordId, { rankRoleId, since, evidence }, actorId);
    await considerMember(record);
  }

  async function considerMember(member) {
    if (member.guildId !== config.guildId) return;
    let sourceRoleId;
    let target;
    let started;
    if (!member.currentRankRoleId && member.applicationAcceptedAt && member.membershipConfirmedAt && member.membershipVerifiedBy) {
      sourceRoleId = PERSONNEL_ROLES.visitor;
      target = SERVICE_RANKS[0];
      started = member.applicationAcceptedAt;
    } else if (member.currentRankRoleId && member.rankSince) {
      sourceRoleId = member.currentRankRoleId;
      target = nextServiceRank(sourceRoleId);
      started = member.rankSince;
    }
    if (!target) return;
    const eligibleAt = addCalendarMonths(started, target.months);
    if (eligibleAt > now()) return;
    const live = await liveMember(member.discordId);
    if (OFFICER_ROLE_IDS.some((id) => live.roles.cache.has(id)) || (target.approvals > 0 && serviceRankFromRoles(roleIds(live))?.roleId !== sourceRoleId)) return;
    const request = await prisma.promotionRequest.upsert({ where: { memberId_sourceRankRoleId_rankSince: { memberId: member.id, sourceRankRoleId: sourceRoleId, rankSince: started } }, create: { memberId: member.id, sourceRankRoleId: sourceRoleId, targetRankRoleId: target.roleId, rankSince: started, eligibleAt, approvalsRequired: target.approvals, status: target.approvals === 0 ? "APPROVED" : "REVIEW", ...(target.approvals === 0 ? { executeAfter: now() } : {}) }, update: {}, include: requestInclude });
    if (request.approvalsRequired === 0 && request.status === "APPROVED") await executeRequest(request.id);
    else if (request.status === "REVIEW") await refreshReview(request.id);
  }

  async function initializeCommands(actorId) {
    await officer(actorId, true);
    const roles = await (await guild()).roles.fetch();
    const results = [];
    for (const definition of COMMAND_DEFINITIONS) {
      const names = [definition.commandRole, ...definition.roles];
      const resolved = names.map((name) => [...roles.values()].filter((role) => role.name === name));
      if (resolved.some((matches) => matches.length !== 1)) { results.push(`${definition.name}: exact role names missing or duplicated; skipped`); continue; }
      const commandRoleId = resolved[0][0].id;
      const allowedRoleIds = resolved.slice(1).map((matches) => matches[0].id);
      if ([commandRoleId, ...allowedRoleIds].some((id) => Object.values(PERSONNEL_ROLES).includes(id) || id === config.buyerRoleId)) throw new Error("Command definitions cannot include protected ranks.");
      await preflightRoles(allowedRoleIds, { specialist: true });
      const data = { name: definition.name, commandRoleId, allowedRoleIds, captainDiscordIds: definition.captainDiscordIds, updatedBy: actorId };
      await prisma.personnelCommand.upsert({ where: { guildId_key: { guildId: config.guildId, key: definition.key } }, create: { guildId: config.guildId, key: definition.key, ...data }, update: data });
      await audit("COMMAND_CONFIGURED", actorId, { key: definition.key, ...data }, actorId);
      results.push(`${definition.name}: specialist roles configured`);
    }
    return results;
  }

  async function commandRoleChoices(commandKey, search = "") {
    const definition = COMMAND_DEFINITIONS.find((item) => item.key === commandKey);
    if (!definition) return [];
    const command = await prisma.personnelCommand.findUnique({ where: { guildId_key: { guildId: config.guildId, key: commandKey } } });
    if (!command) return [];
    const roles = await (await guild()).roles.fetch();
    const query = search.trim().toLowerCase();
    return [...roles.values()]
      .filter((role) => definition.roles.includes(role.name) && command.allowedRoleIds.includes(role.id)
        && role.id !== command.commandRoleId && role.id !== config.buyerRoleId
        && !Object.values(PERSONNEL_ROLES).includes(role.id) && !role.managed && role.editable
        && !protectedPermissions.some((permission) => role.permissions.has(permission))
        && role.name.toLowerCase().includes(query))
      .sort((left, right) => left.name.localeCompare(right.name))
      .slice(0, 25).map((role) => ({ name: role.name, value: role.id }));
  }

  async function assignCommandRoleUnderLock({ actorId, discordId, commandKey, roleId, action }, database) {
    if (!["ADD", "REMOVE"].includes(action)) throw new Error("Invalid assignment action.");
    const actor = await liveMember(actorId);
    const member = await liveMember(discordId);
    const command = await database.personnelCommand.findUnique({ where: { guildId_key: { guildId: config.guildId, key: commandKey } } });
    if (!command || member.user.bot || !canManageCommand({ actorId, actorRoles: roleIds(actor), command, memberRoles: roleIds(member), roleId }) || roleId === config.buyerRoleId) throw new Error("You may only manage approved specialist roles for members within your own command.");
    const allCommands = await database.personnelCommand.findMany({ where: { guildId: config.guildId } });
    if (allCommands.some((other) => other.id !== command.id && (member.roles.cache.has(other.commandRoleId) || other.allowedRoleIds.some((id) => member.roles.cache.has(id)))) && !actor.roles.cache.has(PERSONNEL_ROLES.warlord)) throw new Error("This warrior belongs to another command. Cross-command transfers require the Clan Warlord.");
    if (allCommands.some((other) => other.commandRoleId === roleId)) throw new Error("Command authority cannot be assigned with specialist controls.");
    const roles = await preflightRoles([roleId], { specialist: true });
    await audit("COMMAND_ROLE_ATTEMPT", discordId, { commandKey, roleId, action }, actorId, null, database);
    try {
      if (action === "ADD") await member.roles.add(roleId, `Assigned within ${command.name} by ${actorId}`);
      else await member.roles.remove(roleId, `Removed within ${command.name} by ${actorId}`);
      const verified = await liveMember(discordId);
      if (verified.roles.cache.has(roleId) !== (action === "ADD")) throw new Error("Discord has not confirmed the assignment.");
      await syncWebsiteRank(database, discordId, null, { add: action === "ADD" ? [roleId] : [], remove: action === "REMOVE" ? [roleId] : [] }, roles);
      await audit("COMMAND_ROLE_COMPLETED", discordId, { commandKey, roleId, action }, actorId, null, database);
    } catch (error) {
      throw error;
    }
  }

  async function assignCommandRole(input) {
    try {
      await prisma.$transaction(async (transaction) => {
        const lockKey = `personnel-command:${config.guildId}:${input.discordId}`;
        await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
        await assignCommandRoleUnderLock(input, transaction);
      }, { maxWait: 5_000, timeout: 30_000 });
    } catch (error) {
      await audit("COMMAND_ROLE_FAILED", input.discordId, { commandKey: input.commandKey, roleId: input.roleId, action: input.action, error: String(error.message).slice(0, 500) }, input.actorId);
      throw error;
    }
  }

  async function remindReview(id) {
    const sent = await withRequest(id, async (transaction, request) => {
      if (request.status !== "REVIEW" || request.vetoedBy || !request.nextReviewReminderAt || new Date(request.nextReviewReminderAt) > now()) return false;
      const tally = evaluatePromotionVotes(request.votes, request.approvalsRequired);
      if (tally.status !== "REVIEW" || !tally.rejections) {
        await transaction.promotionRequest.update({ where: { id }, data: { nextReviewReminderAt: null } });
        return false;
      }
      const member = await liveMember(request.member.discordId);
      if (serviceRankFromRoles(roleIds(member))?.roleId !== request.sourceRankRoleId
        || request.member.currentRankRoleId !== request.sourceRankRoleId
        || new Date(request.member.rankSince).getTime() !== new Date(request.rankSince).getTime()) {
        await transaction.promotionRequest.update({ where: { id }, data: { status: "STALE", nextReviewReminderAt: null } });
        await audit("PROMOTION_REMINDER_CANCELLED", member.id, { reason: "Rank or tenure changed" }, null, id, transaction);
        return false;
      }
      if (!request.officerMessageId) return false;
      const destination = await channel(config.officerChannelId || PERSONNEL_CHANNELS.officers);
      const payload = promotionReviewMessage(request, member);
      const dueAt = new Date(request.nextReviewReminderAt).toISOString();
      const message = await destination.send({
        allowedMentions: { parse: [] },
        nonce: createHash("sha256").update(`reminder:${id}:${dueAt}`).digest("hex").slice(0, 24), enforceNonce: true,
        embeds: [{ ...payload.embeds[0], title: `${payload.embeds[0].title} · Review Reminder`,
          description: `**The Officer Corps is called to reconsider this Dragoon’s advancement.**\n\nThe review interval following an ordinary rejection has elapsed. Existing ballots remain recorded; officers may reconsider their own votes. No rank changes occur without the required approval.`,
          fields: payload.embeds[0].fields.filter((field) => field.name !== "NEXT REVIEW REMINDER"), timestamp: now().toISOString() }],
        components: [{ type: 1, components: [{ type: 2, style: 5, label: "Return to the officer ballot", url: `https://discord.com/channels/${config.guildId}/${destination.id || config.officerChannelId || PERSONNEL_CHANNELS.officers}/${request.officerMessageId}` }] }],
      });
      await transaction.promotionRequest.update({ where: { id }, data: { lastReviewReminderAt: now(), nextReviewReminderAt: addCalendarMonths(now(), promotionReviewDelay(request.targetRankRoleId)) } });
      await audit("PROMOTION_REVIEW_REMINDER", member.id, { messageId: message.id, dueAt }, null, id, transaction);
      return true;
    });
    if (sent) await refreshReview(id);
    return sent;
  }

  async function poll() {
    if (running || !client.isReady()) return;
    running = true;
    try {
      const pendingMembership = await prisma.personnelMember.findMany({ where: { guildId: config.guildId, applicationAcceptedAt: { not: null }, membershipConfirmedAt: null, rsiHandle: { not: null }, OR: [{ rsiCheckedAt: null }, { rsiCheckedAt: { lt: new Date(now().getTime() - 21_600_000) } }] }, take: 10 });
      if (config.rsiApiKey) for (const candidate of pendingMembership) {
        try {
          await prisma.personnelMember.update({ where: { id: candidate.id }, data: { rsiCheckedAt: now() } });
          const result = await checkPublicRsiMembership(candidate.rsiHandle, { apiKey: config.rsiApiKey, now: now() });
          if (result.confirmed) {
            await prisma.personnelMember.update({ where: { id: candidate.id }, data: { membershipConfirmedAt: now(), membershipVerifiedBy: "RSI_PUBLIC_PROVIDER", membershipEvidence: result.evidence } });
            await audit("RSI_MEMBERSHIP_CONFIRMED", candidate.discordId, { handle: candidate.rsiHandle, evidence: result.evidence, snapshotAt: result.verifiedAt.toISOString() });
          }
        } catch (error) { logger.error("RSI membership remains unverified:", error.message); }
      }
      const members = await prisma.personnelMember.findMany({ where: { guildId: config.guildId } });
      for (const member of members) {
        try { await considerMember(member); } catch (error) { logger.error(`Personnel eligibility pending for ${member.discordId}:`, error.message); }
      }
      const reminders = await prisma.promotionRequest.findMany({ where: { member: { guildId: config.guildId }, status: "REVIEW", vetoedBy: null, nextReviewReminderAt: { lte: now() } }, take: 50, orderBy: { nextReviewReminderAt: "asc" } });
      for (const request of reminders) {
        try { await remindReview(request.id); }
        catch (error) { logger.error(`Personnel review reminder ${request.id} pending:`, error.message); }
      }
      const dueLease = { OR: [{ processingUntil: null }, { processingUntil: { lt: now() } }] };
      const requests = await prisma.promotionRequest.findMany({ where: { member: { guildId: config.guildId }, status: { in: ["APPROVED", "RETRY", "EXECUTING"] }, AND: [dueLease, { OR: [{ executeAfter: null }, { executeAfter: { lte: now() } }] }] }, take: 50, orderBy: { createdAt: "asc" } });
      for (const request of requests) {
        try { await executeRequest(request.id); }
        catch (error) { logger.error(`Personnel order ${request.id} pending:`, error.message); }
      }
      const announcements = await prisma.promotionRequest.findMany({ where: { member: { guildId: config.guildId }, status: "COMPLETED", announcementMessageId: null, AND: [dueLease] }, take: 50, orderBy: { createdAt: "asc" } });
      for (const request of announcements) {
        try { await publishAnnouncement(request.id); }
        catch (error) { logger.error(`Personnel announcement ${request.id} pending:`, error.message); }
      }
    } catch (error) { logger.error("Personnel worker failed:", error.message); }
    finally { running = false; }
  }

  function start() {
    if (!config.guildId || !config.buyerRoleId) throw new Error("Personnel worker requires DISCORD_GUILD_ID and BUYER_ROLE_ID.");
    void poll();
    const timer = setInterval(() => void poll(), 60_000);
    timer.unref();
    return () => clearInterval(timer);
  }

  return { castVote, executeRequest, acceptApplication, recordHistory, initializeCommands, commandRoleChoices, assignCommandRole, considerMember, refreshReview, publishAnnouncement, remindReview, poll, start };
}
