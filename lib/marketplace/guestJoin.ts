import "server-only";
import { prisma } from "@/lib/prisma";
import { hasOnlyMarketplaceRoles, marketplaceGuestWhere, registerMarketplaceGuest } from "./guestRecords.js";

export async function prepareMarketplaceGuest(input: {
  userId: string;
  guildId: string;
  userTag: string;
  buyerRoleId: string;
  visitorRoleId: string;
  onboardingRoleIds: string[];
  botToken: string;
  newlyJoined: boolean;
}) {
  const { userId, guildId, userTag, buyerRoleId, visitorRoleId, botToken } = input;
  const removableRoleIds = [...new Set([visitorRoleId, ...input.onboardingRoleIds].filter(Boolean))];
  if (removableRoleIds.includes(buyerRoleId)) throw new Error("Buyer must be distinct from Visitor and removable onboarding roles");
  const memberUrl = `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`;
  const headers = { Authorization: `Bot ${botToken}` };
  const response = await fetch(memberUrl, { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Failed to verify marketplace membership (${response.status})`);
  const member = await response.json() as { roles?: unknown };
  if (!Array.isArray(member.roles) || !member.roles.every((roleId) => typeof roleId === "string")) throw new Error("Invalid Discord member roles");
  const roleIds = member.roles as string[];
  const existing = await prisma.marketplaceGuest.findUnique({ where: marketplaceGuestWhere(userId, guildId) });
  if (existing?.processingUntil && existing.processingUntil > new Date()) throw new Error("Guest access is being processed. Please retry in a moment.");
  if (!hasOnlyMarketplaceRoles(roleIds, guildId, buyerRoleId, removableRoleIds)) {
    if (input.newlyJoined && !roleIds.includes(buyerRoleId)) throw new Error("Discord did not assign the required Buyer role");
    if (existing || roleIds.includes(buyerRoleId)) {
      if (roleIds.includes(buyerRoleId)) {
        const result = await fetch(`${memberUrl}/roles/${buyerRoleId}`, { method: "DELETE", headers, signal: AbortSignal.timeout(10_000) });
        if (!result.ok) throw new Error(`Could not retire temporary Buyer role (${result.status})`);
      }
      await prisma.marketplaceGuest.deleteMany({ where: { discordUserId: userId, guildId, OR: [{ processingUntil: null }, { processingUntil: { lt: new Date() } }] } });
    }
    return false;
  }
  await registerMarketplaceGuest(prisma, { userId, guildId, userTag });
  for (const roleId of removableRoleIds.filter((candidate) => roleIds.includes(candidate))) {
    const result = await fetch(`${memberUrl}/roles/${roleId}`, {
      method: "DELETE", headers: { ...headers, "X-Audit-Log-Reason": "Marketplace buyers skip Visitor and onboarding roles" }, signal: AbortSignal.timeout(10_000),
    });
    if (!result.ok) throw new Error(`Could not remove marketplace onboarding role (${result.status})`);
  }
  return true;
}
