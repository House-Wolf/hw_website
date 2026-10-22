export function validateBotEnvironment(environment) {
  const required = ["DISCORD_BOT_TOKEN", "DISCORD_GUILD_ID", "BUYER_ROLE_ID", "DATABASE_URL"];
  if (environment.ONBOARDING_ENABLED === "true") required.push("GENERAL_CHANNEL_ID", "NEXTAUTH_URL");
  if (environment.BOT_HTTP_ENABLED !== "false" && environment.NODE_ENV === "production") required.push("BOT_SERVICE_TOKEN");
  const missing = required.filter((key) => !environment[key]?.trim());
  if (missing.length) throw new Error(`Bot startup blocked. Configure: ${missing.join(", ")}`);
}
