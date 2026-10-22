export function validateBotEnvironment(environment) {
  const required = ["DISCORD_BOT_TOKEN", "DISCORD_GUILD_ID", "BUYER_ROLE_ID", "DATABASE_URL"];
  if (environment.ONBOARDING_ENABLED === "true") required.push("GENERAL_CHANNEL_ID", "NEXTAUTH_URL");
  if (environment.BOT_HTTP_ENABLED !== "false" && environment.NODE_ENV === "production") required.push("BOT_SERVICE_TOKEN");
  const missing = required.filter((key) => !environment[key]?.trim());
  if (missing.length) throw new Error(`Bot startup blocked. Configure: ${missing.join(", ")}`);
}

export function createPersonnelStartup({ client, personnel, registerCommands, guildId, logger = console, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let timer = null;
  let starting = false;
  let started = false;
  let stopped = false;
  let failures = 0;
  let stopWorker;

  async function start() {
    if (stopped || started || starting || timer !== null) return;
    starting = true;
    try {
      if (!client.isReady()) throw new Error("Discord is not ready");
      for (const result of await personnel.ensureCommandsConfigured()) logger.log(result);
      if (stopped) return;
      if (!client.isReady()) throw new Error("Discord disconnected during personnel setup");
      await registerCommands(client, guildId);
      if (stopped) return;
      if (!client.isReady()) throw new Error("Discord disconnected during command registration");
      stopWorker = personnel.start();
      started = true;
      logger.log("Personnel setup complete; background worker started.");
    } catch (error) {
      if (stopped) return;
      const delay = Math.min(5_000 * 2 ** Math.min(failures++, 4), 60_000);
      logger.error(`Personnel setup failed; retrying in ${delay / 1000}s:`, error.message);
      timer = setTimer(() => {
        timer = null;
        void start();
      }, delay);
      timer.unref?.();
    } finally {
      starting = false;
    }
  }

  function stop() {
    stopped = true;
    if (timer !== null) clearTimer(timer);
    timer = null;
    if (started) {
      started = false;
      stopWorker?.();
    }
  }

  return { start, stop };
}
