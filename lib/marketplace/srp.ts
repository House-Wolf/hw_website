/**
 * SRP (Suggested Retail Price) Calculator
 * Based on HouseWolf SRP V3.0 formula
 */

export type SrpItemType = "Guns" | "Armor" | "Components" | "Ship Weapons";

export type SrpCalculatorValues = {
  condition: number;
  gun: number;
  armor: number;
  size: number;
  shipWeapon: number;
  component: number;
};

export type RankOption = {
  label: string;
  value: number;
};

// Floor Base Values by item type
export const FBV_BY_ITEM_TYPE: Record<SrpItemType, number> = {
  Guns: 2500,
  Armor: 10000,
  Components: 25000,
  "Ship Weapons": 35000,
};

// Constants
export const SRP_MARKUP = 0.35;
export const RARITY_COEFFICIENT_INCREMENT = 0.09;
export const MAX_RARITY_SCORE = 15;

// Condition Options (C1-C4)
export const CONDITION_OPTIONS: RankOption[] = [
  { label: "C1 Purchasable", value: 0 },
  { label: "C2 Not Purchasable", value: 1 },
  { label: "C3 Pledged", value: 2 },
  { label: "C4 Event / Unique", value: 3 },
];

// Gun Options (G1-G10)
export const GUN_OPTIONS: RankOption[] = [
  { label: "G1 Knife", value: 1 },
  { label: "G2 Pistol", value: 2 },
  { label: "G3 SMG / PDW", value: 3 },
  { label: "G4 Shotgun", value: 4 },
  { label: "G5 Carbine", value: 5 },
  { label: "G6 Rifle", value: 6 },
  { label: "G7 LMG", value: 7 },
  { label: "G8 Sniper", value: 8 },
  { label: "G9 Launcher", value: 9 },
  { label: "G10 Railgun", value: 10 },
];

// Armor Options (A1-A5)
export const ARMOR_OPTIONS: RankOption[] = [
  { label: "A1 Undersuit", value: 1 },
  { label: "A2 Light Armor", value: 2 },
  { label: "A3 Medium Armor", value: 3 },
  { label: "A4 Heavy Armor", value: 4 },
  { label: "A5 Full Set / Special", value: 5 },
];

// Size Options (S1-S6)
export const SIZE_OPTIONS: RankOption[] = [
  { label: "S1 Smallest", value: 1 },
  { label: "S2", value: 2 },
  { label: "S3", value: 3 },
  { label: "S4", value: 4 },
  { label: "S5", value: 5 },
  { label: "S6 Largest", value: 6 },
];

// Ship Weapon Options (W1-W6)
export const SHIP_WEAPON_OPTIONS: RankOption[] = [
  { label: "W1 Ballistic Repeater", value: 1 },
  { label: "W2 Laser Repeater", value: 2 },
  { label: "W3 Ballistic Cannon", value: 3 },
  { label: "W4 Laser Cannon", value: 4 },
  { label: "W5 Ballistic Scatter / Plasma", value: 5 },
  { label: "W6 Distortion Cannon", value: 6 },
];

// Component Options (Comp1-Comp4)
export const COMPONENT_OPTIONS: RankOption[] = [
  { label: "Comp1 Cooler", value: 1 },
  { label: "Comp2 Power Plant", value: 2 },
  { label: "Comp3 Shield", value: 3 },
  { label: "Comp4 Quantum Drive", value: 4 },
];

/**
 * Get SRP item type from category name
 */
export function getSrpItemTypeFromCategory(category: string): SrpItemType | null {
  const map: Record<string, SrpItemType> = {
    Armor: "Armor",
    Weapons: "Guns",
    Components: "Components",
    "Ship Weapons": "Ship Weapons",
  };

  return map[category] ?? null;
}

/**
 * Calculate rarity score from calculator values
 */
export function calculateRarityScore(
  itemType: SrpItemType,
  values: SrpCalculatorValues
): number | null {
  const { condition, gun, armor, size, shipWeapon, component } = values;

  switch (itemType) {
    case "Guns":
      return condition + gun;
    case "Armor":
      return condition + armor;
    case "Components":
      return condition + size + component;
    case "Ship Weapons":
      return condition + size + shipWeapon;
    default:
      return null;
  }
}

/**
 * Calculate SRP from rarity score
 * Formula: SRP = FBV × RC × (1 + SRP_MARKUP)
 * Where: RC = 1 + (RS × RARITY_COEFFICIENT_INCREMENT)
 */
export function calculateSRP(
  itemType: SrpItemType,
  rarityScore: number
): number | null {
  const fbv = FBV_BY_ITEM_TYPE[itemType];
  if (!fbv) return null;

  // Clamp rarity score
  const clampedScore = Math.min(Math.max(rarityScore, 0), MAX_RARITY_SCORE);

  // Calculate rarity coefficient
  const rarityCoefficient = 1 + clampedScore * RARITY_COEFFICIENT_INCREMENT;

  // Calculate SRP
  const srp = fbv * rarityCoefficient * (1 + SRP_MARKUP);

  return Math.round(srp);
}

/**
 * Get rarity coefficient from rarity score
 */
export function getRarityCoefficient(rarityScore: number): number {
  const clampedScore = Math.min(Math.max(rarityScore, 0), MAX_RARITY_SCORE);
  return 1 + clampedScore * RARITY_COEFFICIENT_INCREMENT;
}
