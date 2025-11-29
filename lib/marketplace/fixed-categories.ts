/**
 * Fixed Marketplace Categories aligned with SRP Tool
 *
 * These categories are FIXED and should not be changed dynamically.
 * They are specifically designed to work with the SRP (Suggested Retail Price) calculator.
 *
 * DO NOT add a category management UI - these categories are intentionally static.
 */

export type FixedCategorySlug = 'weapons' | 'armor' | 'components' | 'ship-weapons';

export interface FixedCategory {
  name: string;
  slug: FixedCategorySlug;
  description: string;
  srpType: 'Guns' | 'Armor' | 'Components' | 'Ship Weapons';
}

/**
 * The four fixed categories that align with the SRP calculator
 */
export const FIXED_CATEGORIES: FixedCategory[] = [
  {
    name: 'Weapons',
    slug: 'weapons',
    description: 'Personal weapons including pistols, rifles, SMGs, and more',
    srpType: 'Guns',
  },
  {
    name: 'Armor',
    slug: 'armor',
    description: 'Personal armor, helmets, and protective gear',
    srpType: 'Armor',
  },
  {
    name: 'Components',
    slug: 'components',
    description: 'Ship components including coolers, power plants, shields, and quantum drives',
    srpType: 'Components',
  },
  {
    name: 'Ship Weapons',
    slug: 'ship-weapons',
    description: 'Ship-mounted weapons and ordnance',
    srpType: 'Ship Weapons',
  },
];

/**
 * Get SRP type from category slug
 */
export function getSrpTypeFromSlug(slug: string): 'Guns' | 'Armor' | 'Components' | 'Ship Weapons' | null {
  const category = FIXED_CATEGORIES.find(c => c.slug === slug);
  return category?.srpType ?? null;
}

/**
 * Get SRP type from category name
 */
export function getSrpTypeFromName(name: string): 'Guns' | 'Armor' | 'Components' | 'Ship Weapons' | null {
  const category = FIXED_CATEGORIES.find(c => c.name === name);
  return category?.srpType ?? null;
}

/**
 * Validate if a category slug is one of the fixed categories
 */
export function isValidCategorySlug(slug: string): slug is FixedCategorySlug {
  return FIXED_CATEGORIES.some(c => c.slug === slug);
}
