import { checkPublicRsiMembership, discordRsiHandleCandidates } from "./rsiMembership.js";

/** Read-only membership checks: a report never grants or removes member roles. */
export async function addActivityMembership(report, people, { prisma, guildId, apiKey, lookup = checkPublicRsiMembership, now = () => new Date() }) {
  const records = await prisma.personnelMember.findMany({ where: { guildId } });
  const linked = new Map(records.map(record => [record.discordId, record.rsiHandle?.toLowerCase()]));
  const claims = new Map();
  const claim = (handle, id) => {
    if (!handle) return;
    if (!claims.has(handle)) claims.set(handle, new Set());
    claims.get(handle).add(id);
  };
  for (const record of records) claim(record.rsiHandle?.toLowerCase(), record.discordId);
  for (const person of people.values()) {
    if (!person.user.bot) for (const handle of discordRsiHandleCandidates(person)) claim(handle, person.id);
  }
  const members = [...report.members];
  let cursor = 0;
  async function check() {
    while (cursor < members.length) {
      const index = cursor++;
      const member = members[index];
      const person = people.get(member.discordId);
      const candidates = linked.get(member.discordId) ? [linked.get(member.discordId)] : discordRsiHandleCandidates(person);
      const handles = candidates.filter(handle => claims.get(handle)?.size === 1);
      let membership = { status: "Needs verification", reason: "NO_UNIQUE_RSI_HANDLE", checkedAt: now().toISOString() };
      if (!apiKey) membership.reason = "API_NOT_CONFIGURED";
      else {
        const confirmed = [];
        const results = [];
        for (const handle of handles) {
          try {
            const result = await lookup(handle, { apiKey, now: now() });
            const status = result.confirmed ? "Confirmed CUTTERWOLF" : result.reason === "PRIMARY_ORGANIZATION_MISMATCH" ? "Other/no primary organization" : "Needs verification";
            const entry = { status, handle, reason: result.reason, primaryOrganization: result.primaryOrganizationSid ?? "", evidence: result.evidence,
              snapshotAt: result.verifiedAt ? new Date(result.verifiedAt).toISOString() : null, checkedAt: now().toISOString(), identity: linked.get(member.discordId) ? "Linked RSI handle" : "Exact Discord name match" };
            results.push(entry);
            if (result.confirmed) confirmed.push(entry);
          } catch {
            results.push({ status: "Needs verification", handle, reason: "LOOKUP_FAILED", checkedAt: now().toISOString() });
          }
        }
        if (confirmed.length === 1 && results.every(result => result.status === "Confirmed CUTTERWOLF" || ["RSI_HANDLE_NOT_FOUND", "PRIMARY_ORGANIZATION_MISMATCH"].includes(result.reason))) membership = confirmed[0];
        else if (results.length === 1) membership = results[0];
        else if (results.length) membership.reason = "AMBIGUOUS_OR_UNVERIFIED_RSI_HANDLE";
      }
      members[index] = { ...member, rsiMembership: membership };
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, members.length) }, check));
  return { ...report, members, membershipCheckedAt: now().toISOString() };
}
