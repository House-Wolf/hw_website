import "server-only";
import { prisma } from "@/lib/prisma";
import { authorize } from "./server";
import { createFleetService } from "./fleetService.js";
import { createCrewService } from "./crewService.js";
import { createFleetRegistryService } from "./fleetRegistryService.js";
import { getPublicFleetData } from "@/lib/fleetyards/client";
import { CommandError } from "./access.js";
export function requireStaffingEnabled() {
  if (process.env.COMMAND_STAFFING_ENABLED !== "true") throw new CommandError(503, "STAFFING_DISABLED", "Fleet readiness and crew assignment are not available yet.");
}
export const fleetService = createFleetService({ prisma, authorize });
export const crewService = createCrewService({ prisma, authorize });
export const fleetRegistryService = createFleetRegistryService({ prisma, authorize, loadFleet: async () => {
  const slug = process.env.NEXT_PUBLIC_FLEETYARDS_FLEET_SLUG;
  if (!slug) throw new CommandError(503, "FLEET_UNCONFIGURED", "FleetYards is not configured yet.");
  return getPublicFleetData(slug);
} });
