import { CommandError } from "./access.js";

/** Never log credentials, member IDs, or Discord response bodies. */
export async function readDiscord(
  path: string,
  token: string | undefined,
  request: typeof fetch = fetch,
  report: (event: string, details: Record<string, unknown>) => void = console.warn,
) {
  if (!token) throw new CommandError(503, "DISCORD_UNCONFIGURED", "Discord verification is not configured.");
  const endpoint = path.startsWith("/guilds/") && path.includes("/members/") ? "guild-member" : path.startsWith("/channels/") ? "channel" : "guild";
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await request(`https://discord.com/api/v10${path}`, {
        headers: { Authorization: `Bot ${token}` }, cache: "no-store", signal: AbortSignal.timeout(8_000),
      });
    } catch {
      report("command.discord.failed", { endpoint, reason: "connection", attempt: attempt + 1 });
      if (attempt === 0) continue;
      throw new CommandError(503, "DISCORD_CONNECTION_FAILED", "The website could not reach Discord to verify your membership. Please retry shortly.");
    }
    if (response.status === 404) return null;
    if (!response.ok) {
      report("command.discord.failed", { endpoint, status: response.status, attempt: attempt + 1 });
      if (response.status >= 500 && attempt === 0) continue;
      if (response.status === 401) throw new CommandError(503, "DISCORD_BOT_AUTH_FAILED", "Discord rejected the website's bot credentials. A site administrator needs to check the production bot configuration.");
      if (response.status === 403) throw new CommandError(503, "DISCORD_BOT_ACCESS_DENIED", "The website's bot cannot access the required Discord server or resource. A site administrator needs to check its access.");
      if (response.status === 429) throw new CommandError(503, "DISCORD_RATE_LIMITED", "Discord is rate limiting the website's verification requests. Please wait before retrying.");
      throw new CommandError(503, "DISCORD_UNAVAILABLE", "Discord verification is unavailable. Please retry shortly.");
    }
    try { return await response.json(); }
    catch {
      report("command.discord.failed", { endpoint, reason: "invalid-json", attempt: attempt + 1 });
      throw new CommandError(503, "INVALID_PROVIDER_RESPONSE", "Discord returned an unreadable verification response. Please retry shortly.");
    }
  }
}
