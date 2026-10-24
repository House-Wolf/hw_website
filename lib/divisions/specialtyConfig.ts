import type { DivisionSlug } from "./divisionConfig";
import type { DivisionRosterResponse } from "./getDivisionsRoster";
import { SUBDIVISION_PATCHES, type SubdivisionPatchConfig } from "@/lib/subdivisions/subdivisionConfig";

export interface DivisionSpecialty extends SubdivisionPatchConfig {
  title: string;
  focus: string;
  description: string;
}

function specialty(slug: string, title: string, focus: string, description: string): DivisionSpecialty {
  return { ...SUBDIVISION_PATCHES[slug], title, focus, description };
}

/** Public unit guides use repository-owned patches and the assignment slugs. */
export const DIVISION_SPECIALTIES: Record<DivisionSlug, DivisionSpecialty[]> = {
  arcops: [
    specialty("arcops-wayfinders", "Wayfinders", "Exploration & cartography",
      "Scout unfamiliar systems, survey points of interest, and chart the routes that guide House Wolf into the unknown."),
    specialty("arcops-chimeras", "Chimeras", "Science & research",
      "Investigate discoveries, gather field data, and turn scientific research into knowledge the whole pack can use."),
    specialty("arcops-replicators", "Replicators", "Crafting & technology",
      "Turn research and resources into useful equipment, developing the tools and technology that support the mission."),
  ],
  locops: [
    specialty("locops-mining", "Mining", "Resource extraction",
      "Locate and extract the raw materials that supply House Wolf's industry and keep its operations moving."),
    specialty("locops-engineer", "Engineering", "Maintenance & repair",
      "Keep ships, equipment, and operational systems ready for duty through engineering support, maintenance, and repair."),
    specialty("locops-salvage", "Salvage", "Recovery & reclamation",
      "Recover valuable materials and equipment, turning wreckage and abandoned assets into resources for the pack."),
    specialty("locops-heavy-lift", "Heavy Lift", "Transport & logistics",
      "Move cargo, equipment, and supplies where they are needed, sustaining the fleet across long campaigns."),
    specialty("locops-merchant", "Merchant", "Trade & supply",
      "Connect resources with demand through trade, procurement, and supply planning that strengthen House Wolf's economy."),
  ],
  specops: [
    specialty("specops-wolfen", "Wolfen", "Special forces",
      "Conduct demanding ground operations, precision strikes, and critical extractions with a disciplined special-forces team."),
    specialty("specops-medic", "Combat Medics", "Medical support & rescue",
      "Stabilize casualties, support teams under fire, and bring wounded members home through coordinated rescue and medical care."),
    specialty("specops-inquisitor", "Inquisitor", "Reconnaissance & intelligence",
      "Observe the battlespace, gather intelligence, and provide the information that lets the pack act with precision."),
  ],
  tacops: [
    specialty("tacops-howlers", "Howlers", "Heavy air wing",
      "Bring coordinated heavy firepower to priority targets through bomber operations and planned strike missions."),
    specialty("tacops-dire-wolfs", "Dire Wolfs", "Fighter wing",
      "Contest enemy fighters, escort friendly ships, and secure the air and space around House Wolf's operations."),
    specialty("tacops-timber-wolfs", "Timber Wolfs", "Support wing",
      "Support the combat wings with coordinated flight operations and the assistance needed to keep the formation effective."),
  ],
};

export function getDivisionSpecialty(divisionSlug: DivisionSlug, unitSlug: string) {
  return DIVISION_SPECIALTIES[divisionSlug].find((unit) => unit.slug === unitSlug);
}

/** Retain the division's officer/staff ordering and exclude other units. */
export function getAssignedUnitRoster(roster: DivisionRosterResponse, unitSlug: string) {
  return {
    officers: [...roster.commandRoster, ...roster.officers].filter((member) => member.subdivisionSlug === unitSlug),
    members: roster.members.filter((member) => member.subdivisionSlug === unitSlug),
  };
}
