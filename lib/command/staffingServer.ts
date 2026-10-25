import "server-only";
import { prisma } from "@/lib/prisma";
import { authorize, discordRead } from "./server";
import { createDiscordInterestService } from "./discordInterestService.js";
import { createFleetService } from "./fleetService.js";
import { createCrewService } from "./crewService.js";
import { createFleetRegistryService } from "./fleetRegistryService.js";
import { createFleetProductionService } from "./fleetProductionService.js";
import { getPublicFleetData } from "@/lib/fleetyards/client";
import { CommandError } from "./access.js";
export function requireStaffingEnabled() {
  if (process.env.COMMAND_STAFFING_ENABLED !== "true") throw new CommandError(503, "STAFFING_DISABLED", "Fleet readiness and crew assignment are not available yet.");
}
async function loadFleet() {
  const slug = process.env.NEXT_PUBLIC_FLEETYARDS_FLEET_SLUG;
  if (!slug) throw new CommandError(503, "FLEET_UNCONFIGURED", "FleetYards is not configured yet.");
  return getPublicFleetData(slug);
}
const refreshProduction = createFleetProductionService({ prisma, loadFleet });
export const fleetService = createFleetService({ prisma, authorize, refreshProduction });
const interests = createDiscordInterestService({ prisma, authorize, discord: discordRead });
export const crewService = createCrewService({ prisma, authorize, refreshProduction, interests, advanced: (process.env.COMMAND_ADVANCED_OPERATIONS_ENABLED === "true" && process.env.COMMAND_STAFFING_ENABLED === "true") });
export const fleetRegistryService = createFleetRegistryService({ prisma, authorize, loadFleet });
