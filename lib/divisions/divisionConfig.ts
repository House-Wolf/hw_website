/**
 * @component DivisionConfig
 * @description Canonical configuration for House Wolf divisions.
 *              Enforces slug casing, metadata consistency, and shared identity.
 * @author House Wolf Dev Team
 */

export type DivisionSlug = "arcops" | "locops" | "specops" | "tacops";
export interface DivisionDefinition {
  slug: DivisionSlug;
  name: string;
  divsionQuote: string;
  description: string;     
  navDescription: string;  
  patchImagePath: string;
  patchAlt: string;
  ogImage: string;
}

export const DIVISIONS: Record<DivisionSlug, DivisionDefinition> = {
  arcops: {
    slug: "arcops",
    name: "ARCOPS",
    navDescription: "Advanced Research & Cartography Operations",
    divsionQuote: "“We map the unknown so others may conquer it.”",
    description:
      "ARCOPS is the forward edge of House Wolf—venturing into uncharted systems to explore, analyze, and understand what lies beyond known space.Through scientific study, data collection, and advanced crafting, ARCOPS transforms discovery into capability, providing the knowledge, technology, and equipment that empower every other command to succeed.",
    patchImagePath: "/images/divisions/arcops/arcops.png",
    patchAlt: "ARCOPS Patch",
    ogImage: "/images/og/arcops-og.png",
  },
  locops: {
    slug: "locops",
    name: "LOCOPS",
    navDescription: "Logistics and Command Operations",
    divsionQuote: "“Wars are won by those who can sustain them.”",
    description:
      "LOCOPS is the industrial and logistical backbone of House Wolf. Through mining, engineering, merchant operations, salvage, and heavy-lift logistics, LOCOPS secures the resources that fuel every campaign. They turn raw material into operational strength—building, moving, repairing, and supplying wherever endurance decides victory.",
    patchImagePath: "/images/divisions/locops/locops.png",
    patchAlt: "LOCOPS Patch",
    ogImage: "/images/og/locops-og.png",
  },
  specops: {
    slug: "specops",
    name: "SPECOPS",
    navDescription: "Elite Special Operations and Covert Missions",
    divsionQuote: "“Silent when needed. Relentless when unleashed.”",
    description:
      "SPECOPS operates beyond the reach of conventional forces. Composed of special forces operators, combat medics, and reconnaissance elements, they conduct infiltration, intelligence gathering, precision strikes, and critical extractions. When missions demand stealth, speed, and absolute control, SPECOPS moves unseen—and leaves no margin for failure.",
    patchImagePath: "/images/divisions/specops/specops.png",
    patchAlt: "SPECOPS Patch",
    ogImage: "/images/og/specops-og.png",
  },
  tacops: {
    slug: "tacops",
    name: "TACOPS",
    navDescription: "Frontline Air Superiority and Bombardment",
    divsionQuote: "“When the battle ignites, we lead the charge.”",
    description:
      "TACOPS is the decisive combat arm of House Wolf. Through coordinated fighter wings, support wings, and heavy bomber elements, TACOPS dominates the battlespace from atmosphere to vacuum. Whether securing air superiority, delivering close support, or executing strategic strikes, TACOPS brings disciplined firepower to bear until victory is assured.",
    patchImagePath: "/images/divisions/tacops/tacops.png",
    patchAlt: "TACOPS Patch",
    ogImage: "/images/og/tacops-og.png",
  },
};

export const DIVISION_GLOW: Record<DivisionSlug, string> = {
  tacops: "#9a4a1f",  
  specops: "#2f4b3a", 
  locops: "#8a7a2a",  
  arcops: "#1f4e5f",  
};

