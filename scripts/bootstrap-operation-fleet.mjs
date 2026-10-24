import { readFileSync } from "node:fs";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { createAuthorizer } from "../lib/command/access.js";
import { matchRegistryOwners } from "../lib/command/fleetRegistryService.js";
import { crewMember, lockSchedule } from "../lib/command/staffingPolicy.js";

// Explicit maintenance command: dry-run unless --apply is supplied. Imports are
// system-audited declarations, never ownership verification or owner consent.
const args = process.argv.slice(2);
const option = (name) => args.includes(name) ? args[args.indexOf(name) + 1] : null;
const envFile = option("--env");
const fleetSlug = option("--fleet");
if (!envFile || !fleetSlug) throw new Error("Use --env <file> --fleet <existing public fleet slug> [--apply].");
const env = dotenv.parse(readFileSync(envFile));
if (!env.DATABASE_URL || !env.DISCORD_GUILD_ID || !env.DISCORD_BOT_TOKEN) throw new Error("Database and Discord member verification must be configured.");
const site = new URL(env.NEXTAUTH_URL || env.AUTH_URL);
if (site.protocol !== "https:") throw new Error("Use the configured HTTPS website.");
const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
const guildId = env.DISCORD_GUILD_ID;
const authorize = createAuthorizer({
  guildId,
  loadAccount: (id) => prisma.user.findUnique({ where: { id }, select: { id: true, discordId: true, isActive: true } }),
  async loadMember(guild, discordId) {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guild}/members/${discordId}`, {
      headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` }, signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Discord member verification unavailable.");
    const member = await response.json();
    return { guildId: guild, userId: member.user?.id, roleIds: member.roles };
  },
});
async function matches(client, vehicles) {
  const personnel = await client.personnelMember.findMany({ where: { guildId, membershipConfirmedAt: { not: null }, rsiHandle: { not: null } }, select: { discordId: true, rsiHandle: true, membershipConfirmedAt: true } });
  const users = await client.user.findMany({ where: { isActive: true, discordId: { in: personnel.map((member) => member.discordId) } }, select: { id: true, discordId: true, isActive: true } });
  return matchRegistryOwners(vehicles, personnel, users);
}
try {
  const response = await fetch(new URL("/api/fleetyards/fleet", site), { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error("Public fleet unavailable.");
  const fleet = await response.json();
  if (fleet.fleetSlug !== fleetSlug || fleet.sourceStatus !== "complete" || !Array.isArray(fleet.vehicles)) throw new Error("The complete public fleet must match the supplied fleet identifier.");
  const registry = await matches(prisma, fleet.vehicles);
  const selected = registry.filter(({ ownerId, vehicle }) => ownerId && vehicle.model?.name?.trim() && vehicle.model.name.trim().length <= 100);
  for (const ownerId of new Set(selected.map((row) => row.ownerId))) {
    if (!crewMember(await authorize(ownerId))) throw new Error("A matched owner is not an eligible current member; no import was applied.");
  }
  console.log(JSON.stringify({ mode: args.includes("--apply") ? "apply" : "dry-run", publicShips: fleet.vehicles.length, matchedShips: selected.length, matchedOwners: new Set(selected.map((row) => row.ownerId)).size, unmatched: registry.filter((row) => !row.ownerId).length }));
  if (args.includes("--apply")) {
    const result = await prisma.$transaction(async (tx) => {
      await lockSchedule(tx, guildId);
      const current = new Map((await matches(tx, fleet.vehicles)).map((row) => [row.vehicle.id, row.ownerId]));
      if (selected.some((row) => current.get(row.vehicle.id) !== row.ownerId)) throw new Error("Owner identities changed; no import was applied.");
      let imported = 0, existing = 0, conflicts = 0;
      for (const { vehicle, ownerId } of selected) {
        const externalRef = `fleetyards:${vehicle.id}`;
        const prior = await tx.commandShip.findUnique({ where: { guildId_externalRef: { guildId, externalRef } } });
        if (prior) { if (prior.ownerId === ownerId) existing++; else conflicts++; continue; }
        const model = vehicle.model.name.trim();
        const ship = await tx.commandShip.create({ data: { guildId, ownerId, externalRef, name: (vehicle.name?.trim() || model).slice(0, 100), model } });
        await tx.auditLog.create({ data: { action: "COMMAND_FLEET_REGISTRY_BOOTSTRAPPED", targetType: "CommandShip", targetId: ship.id, metadata: { source: "FleetYards public registry", authorization: "Operator-requested fleet setup", externalRef, ownerId, verification: "PENDING" } } });
        imported++;
      }
      for (const ownerId of new Set(selected.map((row) => row.ownerId))) {
        if (!crewMember(await authorize(ownerId))) throw new Error("Owner membership changed; no import was applied.");
      }
      return { imported, existing, conflicts, verification: "PENDING" };
    }, { timeout: 25000 });
    console.log(JSON.stringify(result));
  }
} finally { await prisma.$disconnect(); }
