/**
 * @component SubdivisionConfig
 * @description Subdivision patch image paths for House Wolf subdivisions
 * @author House Wolf Dev Team
 */

export interface SubdivisionPatchConfig {
  slug: string;
  name: string;
  patchImagePath: string;
  patchAlt: string;
}

/**
 * ARCOPS Subdivisions
 */
export const ARCOPS_SUBDIVISIONS: Record<string, SubdivisionPatchConfig> = {
  "arcops-command": {
    slug: "arcops-command",
    name: "ARCOPS - Command",
    patchImagePath: "/images/divisions/arcops/arcops.png",
    patchAlt: "ARCOPS Command Patch",
  },
  "arcops-chimeras": {
    slug: "arcops-chimeras",
    name: "ARCOPS - Chimeras",
    patchImagePath: "/images/divisions/arcops/chimeras.png",
    patchAlt: "ARCOPS Chimeras Patch",
  },
  "arcops-wayfinders": {
    slug: "arcops-wayfinders",
    name: "ARCOPS - Wayfinders",
    patchImagePath: "/images/divisions/arcops/wayfinders.png",
    patchAlt: "ARCOPS Wayfinders Patch",
  },
  "arcops-replicators": {
    slug: "arcops-replicators",
    name: "ARCOPS - Replicators",
    patchImagePath: "/images/divisions/arcops/replicators.png",
    patchAlt: "ARCOPS Replicators Patch",
  },
};

/**
 * LOCOPS Subdivisions
 */
export const LOCOPS_SUBDIVISIONS: Record<string, SubdivisionPatchConfig> = {
  "locops-command": {
    slug: "locops-command",
    name: "LOCOPS - Command",
    patchImagePath: "/images/divisions/locops/locops.png",
    patchAlt: "LOCOPS Command Patch",
  },
  "locops-heavy-lift": {
    slug: "locops-heavy-lift",
    name: "LOCOPS - Heavy Lift",
    patchImagePath: "/images/divisions/locops/heavy.png",
    patchAlt: "LOCOPS Heavy Lift Patch",
  },
  "locops-salvage": {
    slug: "locops-salvage",
    name: "LOCOPS - Salvage",
    patchImagePath: "/images/divisions/locops/salvage.png",
    patchAlt: "LOCOPS Salvage Patch",
  },
  "locops-mining": {
    slug: "locops-mining",
    name: "LOCOPS - Mining",
    patchImagePath: "/images/divisions/locops/mining.png",
    patchAlt: "LOCOPS Mining Patch",
  },
  "locops-engineer": {
    slug: "locops-engineer",
    name: "LOCOPS - Engineer",
    patchImagePath: "/images/divisions/locops/locops.png",
    patchAlt: "LOCOPS Engineer Patch",
  },
};

/**
 * SPECOPS Subdivisions
 */
export const SPECOPS_SUBDIVISIONS: Record<string, SubdivisionPatchConfig> = {
  "specops-command": {
    slug: "specops-command",
    name: "SPECOPS - Command",
    patchImagePath: "/images/divisions/specops/specops.png",
    patchAlt: "SPECOPS Command Patch",
  },
  "specops-wolfen": {
    slug: "specops-wolfen",
    name: "SPECOPS - Wolfen",
    patchImagePath: "/images/divisions/specops/wolfen.png",
    patchAlt: "SPECOPS Wolfen Patch",
  },
  "specops-medic": {
    slug: "specops-medic",
    name: "SPECOPS - Medic",
    patchImagePath: "/images/divisions/specops/medic.png",
    patchAlt: "SPECOPS Medic Patch",
  },
  "specops-inquisitor": {
    slug: "specops-inquisitor",
    name: "SPECOPS - Inquisitor",
    patchImagePath: "/images/divisions/specops/inquistor.png",
    patchAlt: "SPECOPS Inquisitor Patch",
  },
};

/**
 * TACOPS Subdivisions
 */
export const TACOPS_SUBDIVISIONS: Record<string, SubdivisionPatchConfig> = {
  "tacops-command": {
    slug: "tacops-command",
    name: "TACOPS - Command",
    patchImagePath: "/images/divisions/tacops/tacops.png",
    patchAlt: "TACOPS Command Patch",
  },
  "tacops-dire-wolfs": {
    slug: "tacops-dire-wolfs",
    name: "TACOPS - Dire Wolfs",
    patchImagePath: "/images/divisions/tacops/dierwolf.png",
    patchAlt: "TACOPS Dire Wolfs Patch",
  },
  "tacops-howlers": {
    slug: "tacops-howlers",
    name: "TACOPS - Howlers",
    patchImagePath: "/images/divisions/tacops/howlers.png",
    patchAlt: "TACOPS Howlers Patch",
  },
};

/**
 * House Wolf Command Subdivisions
 */
export const COMMAND_SUBDIVISIONS: Record<string, SubdivisionPatchConfig> = {
  "leadership-core": {
    slug: "leadership-core",
    name: "Leadership Core",
    patchImagePath: "/images/divisions/leadership.png",
    patchAlt: "Leadership Core Patch",
  },
  officers: {
    slug: "officers",
    name: "Officers",
    patchImagePath: "/images/divisions/leadership.png",
    patchAlt: "Officers Patch",
  },
  "non-commissioned-officers": {
    slug: "non-commissioned-officers",
    name: "Non-Commissioned Officers",
    patchImagePath: "/images/divisions/leadership.png",
    patchAlt: "Non-Commissioned Officers Patch",
  },
};

/**
 * Combined subdivision patch configuration
 */
export const SUBDIVISION_PATCHES: Record<string, SubdivisionPatchConfig> = {
  ...ARCOPS_SUBDIVISIONS,
  ...LOCOPS_SUBDIVISIONS,
  ...SPECOPS_SUBDIVISIONS,
  ...TACOPS_SUBDIVISIONS,
  ...COMMAND_SUBDIVISIONS,
};

/**
 * Helper function to get subdivision patch by slug
 */
export function getSubdivisionPatch(slug: string | null): string | null {
  if (!slug) return null;
  const normalized = slug.toLowerCase().trim();
  return SUBDIVISION_PATCHES[normalized]?.patchImagePath || null;
}

/**
 * Helper function to get subdivision patch alt text
 */
export function getSubdivisionPatchAlt(slug: string | null): string {
  if (!slug) return "Subdivision Patch";
  const normalized = slug.toLowerCase().trim();
  return SUBDIVISION_PATCHES[normalized]?.patchAlt || "Subdivision Patch";
}
