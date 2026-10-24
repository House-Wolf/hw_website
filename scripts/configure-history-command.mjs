import { once } from "node:events";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { registerHistoryCommand } from "../bot/activityCommands.js";

const environment = process.env.NODE_ENV || "development";
dotenv.config({ path: [`.env.${environment}.local`, ".env.local", `.env.${environment}`, ".env"].map(path => fileURLToPath(new URL(`../${path}`, import.meta.url))), quiet: true });
for (const key of ["DISCORD_BOT_TOKEN", "DISCORD_GUILD_ID"]) {
  if (!process.env[key]) throw new Error(`Missing required configuration: ${key}`);
}
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
try {
  const ready = once(client, Events.ClientReady);
  await client.login(process.env.DISCORD_BOT_TOKEN);
  await ready;
  await registerHistoryCommand(client, process.env.DISCORD_GUILD_ID, process.env.DISCORD_COMMAND_PERMISSIONS_TOKEN);
  console.log("/history registered. No reports were sent and no member roles were changed.");
  console.log(process.env.DISCORD_COMMAND_PERMISSIONS_TOKEN ? "Visibility overrides applied for Clan Warlord and Hand of the Clan." : "Finish visibility setup: Server Settings > Integrations > HouseWolf-MP > /history. Deny @everyone; allow only Clan Warlord (1119791005382750288) and Hand of the Clan (1119837295097434263). Remove other user/role overrides. Discord administrators can still see commands, but the bot denies execution without an allowed role.");
} finally { client.destroy(); }
