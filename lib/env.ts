const requiredEnvVars = [
  "DATABASE_URL",
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_BOT_TOKEN",
  "DISCORD_GUILD_ID",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "BOT_SERVICE_URL",
] as const;

/**
 * Validate presence of required environment variables at startup.
 * Throws with a clear list of missing keys to fail fast.
 */
export function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Please check your .env file."
    );
  }
}
