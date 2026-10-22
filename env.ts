const requiredEnvVars = [
  "DATABASE_URL",
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_BOT_TOKEN",
  "DISCORD_GUILD_ID",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "BOT_SERVICE_URL",
  "BUYER_ROLE_ID",
  "MARKETPLACE_CHANNEL_ID",
] as const;

const globalForEnvValidation = globalThis as unknown as {
  hwMissingEnvWarned?: boolean;
};

function isNextProductionBuild() {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/**
 * Validate presence of required environment variables at startup.
 * Throws with a clear list of missing keys at production runtime.
 */
export function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const message =
      `Missing required environment variables: ${missing.join(", ")}\n` +
      "Please check your .env file.";

    if (
      process.env.STRICT_ENV_VALIDATION === "true" ||
      (process.env.NODE_ENV === "production" && !isNextProductionBuild())
    ) {
      throw new Error(message);
    }

    if (!globalForEnvValidation.hwMissingEnvWarned) {
      globalForEnvValidation.hwMissingEnvWarned = true;
      console.warn(message);
    }
  }
}
