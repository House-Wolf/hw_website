/**
 * SRP (Suggested Retail Price) Calculator
 * Based on HouseWolf SRP V4.0 formula
 */

export type SrpItemType = "Guns" | "Armor" | "Components" | "Ship Weapons";

export type SrpCalculatorValues = {
  condition: number;
  gun: number;
  armor: number;
  size: number;
  shipWeapon: number;
  component: number;

  /**
   * Crafted quality only applies to R5 Crafted items.
   * Valid range: 700-1000 in intervals of 50.
   */
  craftedQuality?: number;
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
export const MAX_RARITY_SCORE = 19;

export const MIN_CRAFTED_QUALITY = 700;
export const MAX_CRAFTED_QUALITY = 1000;
export const CRAFTED_QUALITY_INTERVAL = 50;
export const CRAFTED_QUALITY_INCREMENT = 0.08;

// Condition / Rarity Options
export const CONDITION_OPTIONS: RankOption[] = [
  { label: "C1 Purchasable", value: 0 },
  { label: "C2 Not Purchasable", value: 1 },
  { label: "C3 Pledged", value: 2 },
  { label: "C4 Event / Unique", value: 3 },
  { label: "R5 Crafted", value: 4 },
];

// Crafted Quality Options
export const CRAFTED_QUALITY_OPTIONS: RankOption[] = [
  { label: "Q700 Crafted", value: 700 },
  { label: "Q750 Crafted", value: 750 },
  { label: "Q800 Crafted", value: 800 },
  { label: "Q850 Crafted", value: 850 },
  { label: "Q900 Crafted", value: 900 },
  { label: "Q950 Crafted", value: 950 },
  { label: "Q1000 Crafted", value: 1000 },
];

// Gun Options
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

// Armor Options
export const ARMOR_OPTIONS: RankOption[] = [
  { label: "A1 Undersuit", value: 1 },
  { label: "A2 Light Armor", value: 2 },
  { label: "A3 Medium Armor", value: 3 },
  { label: "A4 Heavy Armor", value: 4 },
  { label: "A5 Full Set / Special", value: 5 },
];

// Size Options
export const SIZE_OPTIONS: RankOption[] = [
  { label: "S1 Smallest", value: 1 },
  { label: "S2", value: 2 },
  { label: "S3", value: 3 },
  { label: "S4", value: 4 },
  { label: "S5", value: 5 },
  { label: "S6 Largest", value: 6 },
];

// Ship Weapon Options
export const SHIP_WEAPON_OPTIONS: RankOption[] = [
  { label: "W1 Ballistic Repeater", value: 1 },
  { label: "W2 Laser Repeater", value: 2 },
  { label: "W3 Ballistic Cannon", value: 3 },
  { label: "W4 Laser Cannon", value: 4 },
  { label: "W5 Ballistic Scatter / Plasma", value: 5 },
  { label: "W6 Distortion Cannon", value: 6 },
];

// Component Options
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
 * Check if selected condition is R5 Crafted.
 */
export function isCraftedCondition(condition: number): boolean {
  return condition === 4;
}

/**
 * Clamp crafted quality between 700 and 1000.
 */
export function clampCraftedQuality(quality: number): number {
  return Math.min(Math.max(quality, MIN_CRAFTED_QUALITY), MAX_CRAFTED_QUALITY);
}

/**
 * Normalize crafted quality to the nearest valid 50-point interval.
 */
export function normalizeCraftedQuality(quality: number): number {
  const clamped = clampCraftedQuality(quality);

  return (
    Math.round(clamped / CRAFTED_QUALITY_INTERVAL) * CRAFTED_QUALITY_INTERVAL
  );
}

/**
 * Get crafted quality modifier.
 *
 * 700  = 1.00
 * 750  = 1.08
 * 800  = 1.16
 * 850  = 1.24
 * 900  = 1.32
 * 950  = 1.40
 * 1000 = 1.48
 */
export function getCraftedQualityModifier(quality?: number): number {
  if (!quality) return 1;

  const normalizedQuality = normalizeCraftedQuality(quality);
  const qualitySteps =
    (normalizedQuality - MIN_CRAFTED_QUALITY) / CRAFTED_QUALITY_INTERVAL;

  return 1 + qualitySteps * CRAFTED_QUALITY_INCREMENT;
}

/**
 * Calculate rarity score from calculator values.
 *
 * R5 Crafted adds the condition score plus the crafted quality bonus.
 */
export function calculateRarityScore(
  itemType: SrpItemType,
  values: SrpCalculatorValues
): number | null {
  const { condition, gun, armor, size, shipWeapon, component, craftedQuality } =
    values;

  let baseScore: number;

  switch (itemType) {
    case "Guns":
      baseScore = condition + gun;
      break;

    case "Armor":
      baseScore = condition + armor;
      break;

    case "Components":
      baseScore = condition + size + component;
      break;

    case "Ship Weapons":
      baseScore = condition + size + shipWeapon;
      break;

    default:
      return null;
  }

  if (!isCraftedCondition(condition)) {
    return baseScore;
  }

  const normalizedQuality = normalizeCraftedQuality(
    craftedQuality ?? MIN_CRAFTED_QUALITY
  );

  const craftedQualityBonus =
    (normalizedQuality - MIN_CRAFTED_QUALITY) / CRAFTED_QUALITY_INTERVAL;

  return baseScore + craftedQualityBonus;
}

/**
 * Calculate SRP from rarity score.
 *
 * Formula:
 * SRP = FBV × RC × Crafted Quality Modifier × (1 + SRP_MARKUP)
 *
 * Where:
 * RC = 1 + (RS × RARITY_COEFFICIENT_INCREMENT)
 */
export function calculateSRP(
  itemType: SrpItemType,
  rarityScore: number,
  craftedQuality?: number,
  isCrafted = false
): number | null {
  const fbv = FBV_BY_ITEM_TYPE[itemType];
  if (!fbv) return null;

  const clampedScore = Math.min(Math.max(rarityScore, 0), MAX_RARITY_SCORE);

  const rarityCoefficient =
    1 + clampedScore * RARITY_COEFFICIENT_INCREMENT;

  const craftedQualityModifier = isCrafted
    ? getCraftedQualityModifier(craftedQuality)
    : 1;

  const srp =
    fbv * rarityCoefficient * craftedQualityModifier * (1 + SRP_MARKUP);

  return Math.round(srp);
}

/**
 * Convenience function:
 * calculates full SRP directly from item type and calculator values.
 */
export function calculateFullSRP(
  itemType: SrpItemType,
  values: SrpCalculatorValues
): number | null {
  const rarityScore = calculateRarityScore(itemType, values);

  if (rarityScore === null) return null;

  return calculateSRP(
    itemType,
    rarityScore,
    values.craftedQuality,
    isCraftedCondition(values.condition)
  );
}

/**
 * Get rarity coefficient from rarity score.
 */
export function getRarityCoefficient(rarityScore: number): number {
  const clampedScore = Math.min(Math.max(rarityScore, 0), MAX_RARITY_SCORE);

  return 1 + clampedScore * RARITY_COEFFICIENT_INCREMENT;
}