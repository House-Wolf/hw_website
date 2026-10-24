import { CommandError } from "./access.js";
import { effectiveChannelPermissions } from "./channels.js";
export async function validateGuildVoiceChannel(guildId, channelId, discord) {
  const channel = await discord(`/channels/${channelId}`);
  if (!channel || channel.guild_id !== guildId || channel.type !== 2) throw new CommandError(422, "INVALID_VOICE_CHANNEL", "Select an existing voice channel in this guild.");
  return channel;
}
export async function nativePreflight(guildId, input, discord) {
  if (input.visibility !== "GUILD") throw new CommandError(422, "PRIVATE_NATIVE_UNSUPPORTED", "Restricted operations cannot be published as guild-wide Discord native events.");
  const [roles, bot, guild] = await Promise.all([discord(`/guilds/${guildId}/roles`), discord("/users/@me"), discord(`/guilds/${guildId}`)]);
  if (!guild || guild.id !== guildId || !Array.isArray(roles) || !bot?.id) throw new CommandError(503, "DISCORD_UNAVAILABLE", "Guild and bot permissions could not be verified.");
  const member = await discord(`/guilds/${guildId}/members/${bot.id}`);
  if (!member?.user?.id) throw new CommandError(422, "BOT_NOT_MEMBER", "The bot is not a member of the configured guild.");
  let channel = { permission_overwrites: [] };
  if (input.entityType === "VOICE") {
    channel = await validateGuildVoiceChannel(guildId, input.channelId, discord);
  }
  const permissions = guild.owner_id === bot.id ? (1n << 53n) - 1n : effectiveChannelPermissions({ guildId, roles, member, channel });
  const create = 1n << 44n, admin = 1n << 3n;
  const voice = (1n << 10n) | (1n << 20n);
  if (!(permissions & admin) && (!(permissions & create) || (input.entityType === "VOICE" && (permissions & voice) !== voice)))
    throw new CommandError(422, "BOT_EVENT_PERMISSIONS", "The bot needs Create Events; voice events also need View Channel and Connect. Administrator is unnecessary.");
  return true;
}
