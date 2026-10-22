import { once } from "node:events";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { PrismaClient } from "@prisma/client";
import { createPersonnelService } from "../bot/personnelService.js";
import { registerPersonnelCommand } from "../bot/personnelCommands.js";
import { COMMAND_DEFINITIONS } from "../lib/personnel/policy.js";

const environment = process.env.NODE_ENV || "development";
dotenv.config({ path: [`.env.${environment}.local`, ".env.local", `.env.${environment}`, ".env"].map(path => fileURLToPath(new URL(`../${path}`, import.meta.url))), quiet: true });
for (const key of ["DISCORD_BOT_TOKEN", "DISCORD_GUILD_ID", "BUYER_ROLE_ID", "DATABASE_URL"]) {
  if (!process.env[key]) throw new Error(`Missing required configuration: ${key}`);
}
const prisma = new PrismaClient();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
try {
  const ready = once(client, Events.ClientReady);
  await client.login(process.env.DISCORD_BOT_TOKEN);
  await ready;
  const service = createPersonnelService({ client, prisma, config: { guildId: process.env.DISCORD_GUILD_ID, buyerRoleId: process.env.BUYER_ROLE_ID } });
  for (const result of await service.ensureCommandsConfigured()) console.log(result);
  let incomplete = false;
  for (const definition of COMMAND_DEFINITIONS) {
    const choices = await service.commandRoleChoices(definition.key);
    console.log(`${definition.name}: ${choices.map(choice => choice.name).join(", ") || "No selectable specialist roles"}`);
    if (choices.length !== definition.roles.length) incomplete = true;
  }
  if (incomplete) throw new Error("Some specialist choices are unavailable. Review missing/duplicate role names, bot hierarchy, and specialist permissions.");
  if (!process.argv.includes("--verify-only")) {
    await registerPersonnelCommand(client, process.env.DISCORD_GUILD_ID, service);
    console.log("Personnel and /tacops, /specops, /locops, /arcops commands updated; assignment no longer uses a division dropdown.");
  } else {
    console.log("Verification only: Discord slash-command registrations were not changed.");
  }
  console.log("All four division mappings and specialist role choices are ready. No member roles were changed.");
} finally {
  client.destroy();
  await prisma.$disconnect();
}
