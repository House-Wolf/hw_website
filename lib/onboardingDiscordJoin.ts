type JoinAccount = {
  provider: string;
  access_token?: string;
  scope?: string;
};

export function hasOnboardingJoinConsent(account: JoinAccount) {
  return account.provider === "discord" && Boolean(account.access_token)
    && Boolean(account.scope?.split(/\s+/).includes("guilds.join"));
}

/** Join with Discord's consented token; roles are granted only by completion. */
export async function joinDiscordForOnboarding(account: JoinAccount, discordId: string) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!hasOnboardingJoinConsent(account) || !/^\d{17,20}$/.test(discordId)
    || process.env.ONBOARDING_ENABLED !== "true" || !guildId || !botToken) return false;

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
      method: "PUT",
      headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: account.access_token }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 201 || response.status === 204) return true;
    console.error("Onboarding Discord join failed", { status: response.status });
  } catch {
    console.error("Onboarding Discord join unavailable");
  }
  return false;
}
