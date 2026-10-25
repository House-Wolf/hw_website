import { CommandError } from "./access.js";
import { crewMember, textField } from "./staffingPolicy.js";

export const discordAttendanceId = value => typeof value === "string" && /^discord:\d{17,20}$/.test(value);
const snowflake = value => typeof value === "string" && /^\d{17,20}$/.test(value);
function eligible(member) {
  if (!member || !snowflake(member.user?.id) || typeof member.user.username !== "string" || !member.user.username || !Array.isArray(member.roles) || member.roles.some(role => typeof role !== "string")) return false;
  return !member.user.bot && !member.pending && crewMember({ roleIds: member.roles });
}
const profile = member => ({ discordId: member.user.id, discordUsername: member.user.username, discordDisplayName: member.nick || member.user.global_name || member.user.username });

/** Search never creates identities. An identity is created only within an audited attendance save. */
export function createAttendanceMembers({ prisma, discord }) {
  async function current(guildId, discordId) {
    const member = await discord(`/guilds/${guildId}/members/${discordId}`);
    if (!eligible(member) || member.user.id !== discordId) throw new CommandError(422, "INVALID_PARTICIPANT", "This person must be a current eligible House Wolf Discord member.");
    return member;
  }
  return {
    async search(guildId, query) {
      const search = textField(query, "Discord member search", 80);
      const exact = /^(?:<@!?)?(\d{17,20})>?$/.exec(search)?.[1];
      if (!exact && search.length < 2) throw new CommandError(422, "MEMBER_SEARCH_REQUIRED", "Enter at least two characters of a Discord username or server nickname, or paste a Discord user ID.");
      const response = await discord(exact ? `/guilds/${guildId}/members/${exact}` : `/guilds/${guildId}/members/search?query=${encodeURIComponent(search)}&limit=30`);
      const rows = exact ? response ? [response] : [] : response;
      if (!Array.isArray(rows) || rows.length > 30 || rows.some(member => !snowflake(member?.user?.id))) throw new CommandError(503, "INVALID_PROVIDER_RESPONSE", "Discord returned an invalid member search. Please retry.");
      const members = [...new Map(rows.filter(member => eligible(member) && (!exact || member.user.id === exact)).map(member => [member.user.id, member])).values()];
      const accounts = await prisma.user.findMany({ where: { discordId: { in: members.map(member => member.user.id) } }, select: { id: true, discordId: true, isActive: true } });
      return members.flatMap(member => {
        const account = accounts.find(user => user.discordId === member.user.id);
        if (account?.isActive === false) return [];
        return [{ id: account?.id || `discord:${member.user.id}`, name: profile(member).discordDisplayName, username: member.user.username }];
      }).sort((a, b) => a.name.localeCompare(b.name));
    },
    async resolve(tx, guildId, token) {
      if (!discordAttendanceId(token)) throw new CommandError(422, "INVALID_PARTICIPANT", "Choose a member from Discord search.");
      const discordId = token.slice("discord:".length);
      const member = await current(guildId, discordId);
      const existing = await tx.user.findUnique({ where: { discordId } });
      if (existing?.isActive === false) throw new CommandError(403, "ACCOUNT_INACTIVE", "This account is suspended.");
      // Do not manufacture OAuth accounts, sessions, roles or registration/last-login timestamps.
      const user = await tx.user.upsert({ where: { discordId }, create: profile(member), update: profile(member) });
      if (!user.isActive) throw new CommandError(403, "ACCOUNT_INACTIVE", "This account is suspended.");
      return user.id;
    },
    async recheck(tx, guildId, userId) {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { discordId: true, isActive: true } });
      if (!user?.isActive) throw new CommandError(403, "ACCOUNT_INACTIVE", "This account is unavailable or suspended.");
      await current(guildId, user.discordId);
    },
  };
}
