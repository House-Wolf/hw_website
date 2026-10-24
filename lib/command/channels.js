import { CommandError } from "./access.js";

const VIEW = 1n << 10n, SEND = 1n << 11n, EMBED = 1n << 14n, ADMIN = 1n << 3n;
export function effectiveChannelPermissions({ guildId, roles, member, channel }) {
  const everyone = roles.find((role) => role.id === guildId);
  if (!everyone || !Array.isArray(member.roles)) throw new CommandError(503, "INVALID_PROVIDER_RESPONSE", "Channel permissions could not be verified.");
  let permissions = BigInt(everyone.permissions);
  for (const role of roles) if (member.roles.includes(role.id)) permissions |= BigInt(role.permissions);
  if ((permissions & ADMIN) === ADMIN) return (1n << 53n) - 1n;
  const overwrites = channel.permission_overwrites || [];
  const apply = (deny, allow) => { permissions = (permissions & ~deny) | allow; };
  const base = overwrites.find((row) => row.type === 0 && row.id === guildId);
  if (base) apply(BigInt(base.deny), BigInt(base.allow));
  let deny = 0n, allow = 0n;
  for (const row of overwrites) if (row.type === 0 && member.roles.includes(row.id)) { deny |= BigInt(row.deny); allow |= BigInt(row.allow); }
  apply(deny, allow);
  const own = overwrites.find((row) => row.type === 1 && row.id === member.user.id);
  if (own) apply(BigInt(own.deny), BigInt(own.allow));
  return permissions;
}

/** Read-only preflight. Restricted publication requires a separate audience proof. */
export async function validateTextDestination({ guildId, channelId, discord }) {
  if (!channelId) throw new CommandError(422, "CHANNEL_REQUIRED", "Configure the events text channel before publishing.");
  const [channel, roles, bot] = await Promise.all([discord(`/channels/${channelId}`), discord(`/guilds/${guildId}/roles`), discord("/users/@me")]);
  if (!channel || channel.guild_id !== guildId || channel.type !== 0)
    throw new CommandError(422, "INVALID_CHANNEL", "Select a text channel in the configured House Wolf guild.");
  const member = await discord(`/guilds/${guildId}/members/${bot.id}`);
  const required = VIEW | SEND | EMBED;
  if ((effectiveChannelPermissions({ guildId, roles, member, channel }) & required) !== required)
    throw new CommandError(422, "BOT_PERMISSIONS", "The bot requires View Channel, Send Messages and Embed Links in that channel.");
  return { channelId, guildId, type: "text", verified: true };
}
