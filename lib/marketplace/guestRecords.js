const DAY_MS = 24 * 60 * 60 * 1000;

export function marketplaceGuestWhere(discordUserId, guildId) {
  return { discordUserId_guildId: { discordUserId, guildId } };
}

export function hasOnlyMarketplaceRoles(roleIds, guildId, buyerRoleId, removableRoleIds = []) {
  const allowed = new Set([guildId, buyerRoleId, ...removableRoleIds]);
  return Boolean(buyerRoleId) && roleIds.includes(buyerRoleId) && roleIds.every((roleId) => allowed.has(roleId));
}

export async function registerMarketplaceGuest(prisma, { userId, guildId, userTag }, now = new Date()) {
  const where = marketplaceGuestWhere(userId, guildId);
  const existing = await prisma.marketplaceGuest.findUnique({ where });
  const dates = { joinedAt: now, expiresAt: new Date(now.getTime() + 7 * DAY_MS), warningAt: new Date(now.getTime() + 6 * DAY_MS), nextCheckAt: now, warningSentAt: null, warningAttemptedAt: null, warningUnavailable: false, lastError: null };
  if (existing) {
    const result = await prisma.marketplaceGuest.updateMany({
      where: { discordUserId: userId, guildId, OR: [{ processingUntil: null }, { processingUntil: { lt: now } }] },
      data: { ...dates, discordTag: userTag, processingToken: null, processingUntil: null },
    });
    if (!result.count) throw new Error("Guest access is being processed. Please retry in a moment.");
    return dates;
  }
  await prisma.marketplaceGuest.create({ data: { discordUserId: userId, guildId, discordTag: userTag, ...dates } });
  return dates;
}
