/** Reuse crew-only Discord identities after a successful Discord OAuth flow.
 * The roster import never creates OAuth accounts, sessions, permissions or a last-login date.
 * @param {any} prisma
 * @param {any} profile
 */
export async function createDiscordOAuthUser(prisma, profile) {
  if (!/^\d{17,20}$/.test(profile.discordId || "") || typeof profile.discordUsername !== "string") throw new Error("A verified Discord profile is required.");
  const fields = ["discordId", "discordUsername", "discordDisplayName", "avatarUrl", "name", "email", "emailVerified", "image"];
  const data = Object.fromEntries(fields.filter(key => profile[key] !== undefined).map(key => [key, profile[key]]));
  const user = await prisma.user.upsert({ where: { discordId: profile.discordId }, create: data, update: data });
  if (!user.isActive) throw new Error("This account is suspended.");
  return user;
}
