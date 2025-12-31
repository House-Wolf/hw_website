/**
 * @component DivisionConfig
 * @description Canonical configuration for House Wolf divisions.
 *              Enforces slug casing, metadata consistency, and shared identity.
 * @author House Wolf Dev Team
 */

export type DivisionSlug = "arccops" | "locops" | "specops" | "tacops";

export interface DivisionDefinition {
  slug: DivisionSlug;
  name: string;
  description: string;
  patchImagePath: string;
  patchAlt: string;
  ogImage: string;
}

export const DIVISIONS: Record<DivisionSlug, DivisionDefinition> = {
  arccops: {
    slug: "arccops",
    name: "ARCCOPS",
    description:
      "The Advanced Research & Cartography Operations Division (ARCCOPS) serves as the organization's forward edge into the unknown...",
    patchImagePath: "/images/divisions/arccops/arccops.png",
    patchAlt: "ARCCOPS Patch",
    ogImage: "/images/og/arccops-og.png",
  },
  locops: {
    slug: "locops",
    name: "LOCOPS",
    description:
      "The Logistics and Command Operations Division ensures sustained operations...",
    patchImagePath: "/images/divisions/locops/locops.png",
    patchAlt: "LOCOPS Patch",
    ogImage: "/images/og/locops-og.png",
  },
  specops: {
    slug: "specops",
    name: "SPECOPS",
    description:
      "House Wolf’s elite specialists executing high-risk missions...",
    patchImagePath: "/images/divisions/specops/specops.png",
    patchAlt: "SPECOPS Patch",
    ogImage: "/images/og/specops-og.png",
  },
  tacops: {
    slug: "tacops",
    name: "TACOPS",
    description:
      "The frontline warriors of House Wolf delivering overwhelming force...",
    patchImagePath: "/images/divisions/tacops/tacops.png",
    patchAlt: "TACOPS Patch",
    ogImage: "/images/og/tacops-og.png",
  },
};
