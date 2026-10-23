import { discordRsiHandleCandidates, checkPublicRsiMembership } from "./rsiMembership.js";
import { PERSONNEL_ROLES, OFFICER_ROLE_IDS, SERVICE_RANKS } from "../lib/personnel/policy.js";

export function rsiSyncInterval(value) {
  if (value === undefined || value === "") return 60_000;
  const interval = Number(value);
  if (!Number.isSafeInteger(interval) || interval < 60_000) throw new Error("RSI_MEMBERSHIP_CHECK_INTERVAL_MS must be an integer of at least 60000.");
  return interval;
}

/** Public membership discovery, not a scraper of private RSI applications. */
export function createRsiMembershipSync({ client, prisma, config, reconcile, membershipLookup = checkPublicRsiMembership, now = () => new Date(), logger = console }) {
  const interval = rsiSyncInterval(config.rsiCheckIntervalMs);
  let lastRosterAt = 0;
  let roster;

  async function poll() {
    if (!config.rsiApiKey) return;
    const server = await client.guilds.fetch(config.guildId);
    // Full roster is needed to reject duplicate display-name claims, including
    // users who do not yet have a website or personnel record.
    if (!roster || now().getTime() - lastRosterAt >= 60_000) {
      roster = await server.members.fetch();
      lastRosterAt = now().getTime();
    }
    const people = [...roster.values()].filter(member => !member.user.bot);
    const records = await prisma.personnelMember.findMany({ where: { guildId: config.guildId } });
    const byDiscord = new Map(records.map(record => [record.discordId, record]));
    const byHandle = new Map(records.filter(record => record.rsiHandle).map(record => [record.rsiHandle.toLowerCase(), record.discordId]));
    const claimants = new Map();
    for (const member of people) for (const handle of discordRsiHandleCandidates(member)) {
      if (!claimants.has(handle)) claimants.set(handle, new Set());
      claimants.get(handle).add(member.id);
    }

    let checked = 0, confirmed = 0, repaired = 0;
    for (const member of people) {
      const record = byDiscord.get(member.id);
      if (!record?.membershipConfirmedAt || !record.applicationAcceptedAt || !record.rsiHandle || !record.membershipVerifiedBy) continue;
      const higherRank = OFFICER_ROLE_IDS.some(id => member.roles.cache.has(id)) || SERVICE_RANKS.slice(1).some(rank => member.roles.cache.has(rank.roleId));
      const missing = !member.roles.cache.has(PERSONNEL_ROLES.member) || !member.roles.cache.has(PERSONNEL_ROLES.houseWolf)
        || (!higherRank && !record.currentRankRoleId && !member.roles.cache.has(PERSONNEL_ROLES.foundling))
        || (!higherRank && record.currentRankRoleId === PERSONNEL_ROLES.foundling && !member.roles.cache.has(PERSONNEL_ROLES.foundling))
        || member.roles.cache.has(PERSONNEL_ROLES.visitor) || member.roles.cache.has(config.buyerRoleId);
      // Periodic reconciliation also retries a website mirror failure after
      // Discord already applied the roles, including after a worker restart.
      const dueForReconciliation = !record.rsiCheckedAt || now().getTime() - new Date(record.rsiCheckedAt).getTime() >= interval;
      if (missing || dueForReconciliation) {
        try {
          await reconcile(record);
          await prisma.personnelMember.update({ where: { id: record.id }, data: { rsiCheckedAt: now() } });
          repaired++;
        }
        catch (error) { logger.error(`RSI role reconciliation pending for ${member.id}:`, error.message); }
      }
    }

    const due = people.filter(member => {
      const record = byDiscord.get(member.id);
      // Accepted, officer-linked pending records use the existing verification
      // loop. Discovery covers the formerly invisible members without one.
      return !record?.membershipConfirmedAt && !(record?.applicationAcceptedAt && record.rsiHandle)
        && (!record?.rsiCheckedAt || now().getTime() - new Date(record.rsiCheckedAt).getTime() >= interval);
    }).sort((a, b) => new Date(byDiscord.get(a.id)?.rsiCheckedAt || 0) - new Date(byDiscord.get(b.id)?.rsiCheckedAt || 0));

    for (const member of due.slice(0, 10)) {
      const existing = byDiscord.get(member.id);
      const candidates = existing?.rsiHandle ? [existing.rsiHandle.toLowerCase()] : discordRsiHandleCandidates(member)
        .filter(handle => claimants.get(handle)?.size === 1 && (!byHandle.has(handle) || byHandle.get(handle) === member.id));
      try {
        // Persist the attempt before the provider call so restarts respect the
        // cooldown. A placeholder is not application acceptance or identity proof.
        const tracked = await prisma.personnelMember.upsert({
          where: { guildId_discordId: { guildId: config.guildId, discordId: member.id } },
          create: { guildId: config.guildId, discordId: member.id, rsiCheckedAt: now() }, update: { rsiCheckedAt: now() },
        });
        const matches = [];
        let lookupFailed = false;
        for (const handle of candidates) {
          checked++;
          try {
            const result = await membershipLookup(handle, { apiKey: config.rsiApiKey, now: now() });
            if (result.confirmed) matches.push({ handle, result });
          } catch (error) { lookupFailed = true; logger.error(`RSI discovery lookup pending for ${member.id}:`, error.message); }
        }
        if (lookupFailed) continue;
        if (matches.length !== 1) {
          logger.log(`RSI discovery ${member.id}: ${matches.length > 1 ? "multiple matching RSI accounts; officer identity verification required" : candidates.length ? "CUTTERWOLF membership not confirmed" : "no unambiguous RSI name; officer identity verification required"}`);
          continue;
        }
        const { handle, result } = matches[0];
        if (byHandle.has(handle) && byHandle.get(handle) !== member.id) continue;
        const record = await prisma.$transaction(async transaction => {
          // Serialize identity registration with existing specialist assignments.
          const lock = `personnel-command:${config.guildId}:${member.id}`;
          await transaction.$queryRaw`SELECT 1 AS "locked" FROM pg_advisory_xact_lock(hashtextextended(${lock}, 0))`;
          const latest = await transaction.personnelMember.findUnique({ where: { guildId_discordId: { guildId: config.guildId, discordId: member.id } } });
          if (!latest || (latest.rsiHandle && latest.rsiHandle.toLowerCase() !== handle) || latest.membershipConfirmedAt) return null;
          const saved = await transaction.personnelMember.update({ where: { id: tracked.id }, data: {
            rsiHandle: handle, applicationAcceptedAt: latest.applicationAcceptedAt || now(), membershipConfirmedAt: now(),
            membershipVerifiedBy: "RSI_PUBLIC_NAME_MATCH", membershipEvidence: result.evidence,
            ...(!latest.currentRankRoleId && SERVICE_RANKS.filter(rank => member.roles.cache.has(rank.roleId)).length === 1
              ? { currentRankRoleId: SERVICE_RANKS.find(rank => member.roles.cache.has(rank.roleId)).roleId } : {}),
          } });
          await transaction.personnelAudit.create({ data: { guildId: config.guildId, action: "RSI_MEMBERSHIP_DISCOVERED", memberDiscordId: member.id,
            details: { handle, evidence: result.evidence, snapshotAt: result.verifiedAt.toISOString(), identitySource: existing?.rsiHandle ? "LINKED_RSI_HANDLE" : "UNIQUE_EXACT_DISCORD_NAME", acceptanceSource: "OBSERVED_CUTTERWOLF_MEMBERSHIP", observedAt: now().toISOString() } } });
          return saved;
        });
        if (!record) continue;
        byHandle.set(handle, member.id);
        confirmed++;
        logger.log(`RSI membership confirmed for ${member.id}; Discord roles queued for reconciliation.`);
        await reconcile(record);
      } catch (error) { logger.error(`RSI discovery pending for ${member.id}:`, error.message); }
    }
    if (checked || confirmed || repaired) logger.log(`RSI membership sync: ${checked} lookup(s), ${confirmed} newly confirmed, ${repaired} existing member reconciliation(s).`);
  }
  return { poll };
}
