import "server-only";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_IDS } from "@/lib/role-constants";
import { OFFICER_ROLE_IDS, PERSONNEL_ROLES } from "@/lib/personnel/policy.js";
import { CommandError, createAuthorizer } from "./access.js";
import { validateTextDestination } from "./channels.js";
import { createSettingsService } from "./settings.js";
import { createSettingsRepository } from "./settingsRepository";

export async function discordRead(path: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new CommandError(503, "DISCORD_UNCONFIGURED", "Discord verification is not configured.");
  try {
    const response = await fetch(`https://discord.com/api/v10${path}`, {
      headers: { Authorization: `Bot ${token}` }, cache: "no-store", signal: AbortSignal.timeout(8_000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Provider unavailable");
    return await response.json();
  } catch { throw new CommandError(503, "DISCORD_UNAVAILABLE", "Discord verification is unavailable. Please retry."); }
}

export const authorize = createAuthorizer({
  guildId: process.env.DISCORD_GUILD_ID,
  loadAccount: (id: string) => prisma.user.findUnique({ where: { id }, select: { id: true, discordId: true, isActive: true } }),
  async loadMember(guildId: string, discordId: string) {
    const data = await discordRead(`/guilds/${guildId}/members/${discordId}`);
    return data ? { guildId, userId: data.user?.id, roleIds: data.roles } : null;
  },
  async loadPermissions(roleIds: string[]) {
    const roles = await prisma.discordRole.findMany({ where: { id: { in: roleIds } }, include: { permissions: { include: { permission: true } } } });
    const permissions = new Set(roles.flatMap((role) => role.permissions.map((row) => row.permission.key)));
    if (roleIds.includes(ROLE_IDS.SITE_ADMIN)) permissions.add("SITE_ADMIN");
    if (roleIds.includes(ROLE_IDS.MARKETPLACE_ADMIN)) permissions.add("MARKETPLACE_ADMIN");
    if (roleIds.some((id) => id !== PERSONNEL_ROLES.lieutenant && OFFICER_ROLE_IDS.includes(id))) permissions.add("DOSSIER_ADMIN");
    return [...permissions];
  },
});

export async function getFreshCommandActor(officer = false) {
  const session = await auth();
  return authorize(session?.user?.id, { officer });
}
// React cache is request/render scoped; write/commit/worker checks use authorize directly.
export const getRequestCommandActor = cache(getFreshCommandActor);

async function validateChannel(guildId: string, channelId: string, kind: string) {
  if (kind === "text") return validateTextDestination({ guildId, channelId, discord: discordRead });
  const channel = await discordRead(`/channels/${channelId}`);
  if (!channel || channel.guild_id !== guildId || channel.type !== 2)
    throw new CommandError(422, "INVALID_VOICE_CHANNEL", "Select a voice channel in the configured House Wolf guild.");
  return { channelId, guildId, type: "voice", verified: true };
}

export const commandSettings = createSettingsService({
  authorize,
  validateChannel,
  repository: createSettingsRepository(prisma),
});
