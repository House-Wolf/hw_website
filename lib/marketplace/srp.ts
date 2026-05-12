/**
 * SRP Calculator - HouseWolf SRP V4.1
 *
 * Final SRP = Base Value x Condition Multiplier x Crafted Quality Modifier
 */

export type SrpItemType = "Guns" | "Armor" | "Components" | "Ship Weapons";

export type SrpCalculatorValues = {
  condition: number;
  gun: number;
  armor: number;
  size: number;
  shipWeapon: number;
  component: number;
  craftedQuality?: number;
  manualBaseValue?: number;
};

export type RankOption = {
  label: string;
  value: number;
};

type RankBaseMap = Record<number, number>;
type NestedRankBaseMap = Record<number, RankBaseMap>;

export const MIN_CRAFTED_QUALITY = 700;
export const MAX_CRAFTED_QUALITY = 1000;
export const CRAFTED_QUALITY_INTERVAL = 50;
export const CRAFTED_QUALITY_INCREMENT = 0.08;

/**
 * Kept for compatibility with existing imports/UI.
 * This no longer drives the final SRP formula.
 */
export const MAX_RARITY_SCORE = 10;

export const MARKETPLACE_MARKUP = 1.35;

export const CONDITION_OPTIONS: RankOption[] = [
  { label: "C1 Purchasable", value: 0 },
  { label: "C2 Not Purchasable", value: 1 },
  { label: "C3 Pledged", value: 2 },
  { label: "C4 Event / Unique", value: 3 },
  { label: "R5 Crafted", value: 4 },
];

export const CONDITION_MULTIPLIERS: Record<number, number> = {
  0: 0.70,
  1: 1.25,
  2: 1.4,
  3: 1.65,
  4: 1.5,
};

export const CRAFTED_QUALITY_OPTIONS: RankOption[] = [
  { label: "Q700 Crafted", value: 700 },
  { label: "Q750 Crafted", value: 750 },
  { label: "Q800 Crafted", value: 800 },
  { label: "Q850 Crafted", value: 850 },
  { label: "Q900 Crafted", value: 900 },
  { label: "Q950 Crafted", value: 950 },
  { label: "Q1000 Crafted", value: 1000 },
];

export const GUN_OPTIONS: RankOption[] = [
  { label: "G1 Knife", value: 1 },
  { label: "G2 Pistol", value: 2 },
  { label: "G3 SMG / PDW", value: 3 },
  { label: "G4 Shotgun", value: 4 },
  { label: "G5 Assault Rifle", value: 5 },
  { label: "G6 Light Machine Gun", value: 6 },
  { label: "G7 Sniper Rifle", value: 7 },
  { label: "G8 Grenade Launcher", value: 8 },
  { label: "G9 Rocket Launcher", value: 9 },
  { label: "G10 Railgun", value: 10 },
];

export const ARMOR_OPTIONS: RankOption[] = [
  { label: "A1 Undersuit", value: 1 },
  { label: "A2 Light Armor", value: 2 },
  { label: "A3 Medium Armor", value: 3 },
  { label: "A4 Heavy Armor", value: 4 },
  { label: "A5 Full Set / Special", value: 5 },
];

export const SIZE_OPTIONS: RankOption[] = [
  { label: "S1 Smallest", value: 1 },
  { label: "S2", value: 2 },
  { label: "S3", value: 3 },
  { label: "S4", value: 4 },
  { label: "S5", value: 5 },
  { label: "S6 Largest", value: 6 },
];

export const SHIP_WEAPON_OPTIONS: RankOption[] = [
  { label: "W1 Ballistic Repeater", value: 1 },
  { label: "W2 Laser Repeater", value: 2 },
  { label: "W3 Ballistic Cannon", value: 3 },
  { label: "W4 Distortion Repeater", value: 4 },
  { label: "W5 Laser Cannon", value: 5 },
  { label: "W6 Distortion Cannon", value: 6 },
];

export const COMPONENT_OPTIONS: RankOption[] = [
  { label: "Comp1 Cooler", value: 1 },
  { label: "Comp2 Shield", value: 2 },
  { label: "Comp3 Power Plant", value: 3 },
  { label: "Comp4 Quantum Drive", value: 4 },
];

export const GUN_BASE_BY_RANK: RankBaseMap = {
  1: 1500,
  2: 1000,
  3: 3500,
  4: 5500,
  5: 5000,
  6: 6500,
  7: 10000,
  8: 15000,
  9: 20000,
  10: 30000,
};

export const ARMOR_BASE_BY_RANK: RankBaseMap = {
  1: 2500,
  2: 5000,
  3: 7500,
  4: 10000,
  5: 15000,
};

export const COMPONENT_BASE_BY_SIZE_AND_TYPE: NestedRankBaseMap = {
  1: {
    1: 25000,
    2: 35000,
    3: 50000,
    4: 50000,
  },
  2: {
    1: 35000,
    2: 50000,
    3: 100000,
    4: 100000,
  },
  3: {
    1: 75000,
    2: 125000,
    3: 200000,
    4: 150000,
  },
};

export const SHIP_WEAPON_BASE_BY_SIZE_AND_TYPE: NestedRankBaseMap = {
  1: { 1: 5500, 2: 10500, 3: 15000, 4: 15000, 5: 15000, 6: 20000 },
  2: { 1: 15000, 2: 25000, 3: 30000, 4: 30000, 5: 35000, 6: 45000 },
  3: { 1: 30000, 2: 55000, 3: 60000, 4: 65000, 5: 80000, 6: 100000 },
  4: { 1: 55000, 2: 125000, 3: 140000, 4: 0, 5: 175000, 6: 0 },
  5: { 1: 120000, 2: 275000, 3: 300000, 4: 0, 5: 380000, 6: 0 },
  6: { 1: 300000, 2: 620000, 3: 650000, 4: 0, 5: 900000, 6: 0 },
};

export function getSrpItemTypeFromCategory(category: string): SrpItemType | null {
  const map: Record<string, SrpItemType> = {
    Armor: "Armor",
    Weapons: "Guns",
    Components: "Components",
    "Ship Weapons": "Ship Weapons",
  };

  return map[category] ?? null;
}

export function isCraftedCondition(condition: number): boolean {
  return condition === 4;
}

export function clampCraftedQuality(quality: number): number {
  return Math.min(Math.max(quality, MIN_CRAFTED_QUALITY), MAX_CRAFTED_QUALITY);
}

export function normalizeCraftedQuality(quality: number): number {
  const clamped = clampCraftedQuality(quality);
  return Math.round(clamped / CRAFTED_QUALITY_INTERVAL) * CRAFTED_QUALITY_INTERVAL;
}

export function getCraftedQualityModifier(quality?: number): number {
  if (!quality) return 1;

  const normalizedQuality = normalizeCraftedQuality(quality);
  const qualitySteps =
    (normalizedQuality - MIN_CRAFTED_QUALITY) / CRAFTED_QUALITY_INTERVAL;

  return 1 + qualitySteps * CRAFTED_QUALITY_INCREMENT;
}

export function calculateBaseValueFromRanks(
  itemType: SrpItemType,
  values: SrpCalculatorValues
): number | null {
  if (values.manualBaseValue && values.manualBaseValue > 0) {
    return values.manualBaseValue;
  }

  switch (itemType) {
    case "Guns":
      return GUN_BASE_BY_RANK[values.gun || 1] ?? null;

    case "Armor":
      return ARMOR_BASE_BY_RANK[values.armor || 1] ?? null;

    case "Components": {
      const sizeRank = Math.min(values.size || 1, 3);
      const componentRank = values.component || 1;
      return COMPONENT_BASE_BY_SIZE_AND_TYPE[sizeRank]?.[componentRank] ?? null;
    }

    case "Ship Weapons": {
      const sizeRank = values.size || 1;
      const weaponRank = values.shipWeapon || 1;
      const baseValue = SHIP_WEAPON_BASE_BY_SIZE_AND_TYPE[sizeRank]?.[weaponRank];

      return baseValue && baseValue > 0 ? baseValue : null;
    }

    default:
      return null;
  }
}

export function calculateRarityScore(
  _itemType: SrpItemType,
  values: SrpCalculatorValues
): number | null {
  if (!isCraftedCondition(values.condition)) {
    return values.condition;
  }

  const quality = normalizeCraftedQuality(
    values.craftedQuality ?? MIN_CRAFTED_QUALITY
  );

  const qualityBonus =
    (quality - MIN_CRAFTED_QUALITY) / CRAFTED_QUALITY_INTERVAL;

  return values.condition + qualityBonus;
}

export function getRarityCoefficient(condition: number): number {
  return CONDITION_MULTIPLIERS[condition] ?? 1;
}

export function calculateSRP(
  baseValue: number,
  rarityScore: number,
  craftedQuality?: number,
  isCraftedOverride?: boolean
): number | null {
  if (!Number.isFinite(baseValue) || baseValue <= 0) return null;

  // 1. Determine scarcity multiplier
  // If it's a known condition (0-4), use the table.
  // Otherwise, use the fallback formula (1 + RS * 0.09)
  const floorScore = Math.floor(rarityScore);
  let scarcityMultiplier =
    CONDITION_MULTIPLIERS[floorScore] ?? 1 + rarityScore * 0.09;

  // 2. Handle crafted items
  const isCrafted = isCraftedOverride ?? isCraftedCondition(rarityScore);

  let finalMultiplier = scarcityMultiplier;

  if (isCrafted) {
    // If crafted, we use the R5 base (1.5) and then apply quality modifier
    const r5Base = CONDITION_MULTIPLIERS[4];
    
    // If we have an explicit craftedQuality, use it.
    // Otherwise, derive it from rarityScore if rarityScore > 4.
    let qualityModifier = 1;
    if (craftedQuality !== undefined) {
      qualityModifier = getCraftedQualityModifier(craftedQuality);
    } else if (rarityScore > 4) {
      const qualitySteps = rarityScore - 4;
      qualityModifier = 1 + qualitySteps * CRAFTED_QUALITY_INCREMENT;
    }
    
    finalMultiplier = r5Base * qualityModifier;
  }

  // 3. Final Calculation with Marketplace Markup
  return Math.round(baseValue * finalMultiplier * MARKETPLACE_MARKUP);
}

export function calculateFullSRP(
  itemType: SrpItemType,
  values: SrpCalculatorValues
): number | null {
  const baseValue = calculateBaseValueFromRanks(itemType, values);

  if (baseValue === null) return null;

  const isCrafted = isCraftedCondition(values.condition);

  return calculateSRP(
    baseValue,
    values.condition,
    values.craftedQuality,
    isCrafted
  );
}

export function getSupportedSizeOptions(itemType: SrpItemType): RankOption[] {
  if (itemType === "Components") {
    return SIZE_OPTIONS.filter((option) => option.value <= 3);
  }

  return SIZE_OPTIONS;
}