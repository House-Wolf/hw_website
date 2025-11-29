/**
 * Auto-detect category from item name
 * Returns categories aligned with SRP tool requirements
 */
export function determineCategoryFromName(itemName: string): string {
  const name = itemName.toLowerCase();

  // Weapons (Personal weapons - maps to "Guns" in SRP)
  if (
    name.includes("rifle") ||
    name.includes("pistol") ||
    name.includes("gun") ||
    name.includes("lmg") ||
    name.includes("smg") ||
    name.includes("sniper") ||
    name.includes("shotgun") ||
    name.includes("launcher") ||
    name.includes("grenade") ||
    name.includes("knife") ||
    name.includes("railgun")
  ) {
    return "Weapons";
  }

  // Armor (Personal protective equipment)
  if (
    name.includes("armor") ||
    name.includes("helmet") ||
    name.includes("undersuit") ||
    (name.includes("core") &&
      (name.includes("heavy") || name.includes("medium") || name.includes("light")))
  ) {
    return "Armor";
  }

  // Ship Weapons (Ship-mounted weapons)
  if (
    name.includes("repeater") ||
    name.includes("cannon") ||
    name.includes("scatter gun") ||
    name.includes("distortion") ||
    name.includes("missile rack") ||
    name.includes("torpedo") ||
    name.includes("turret") ||
    (name.includes("ballistic") && (name.includes("s1") || name.includes("s2") || name.includes("s3"))) ||
    (name.includes("laser") && (name.includes("s1") || name.includes("s2") || name.includes("s3")))
  ) {
    return "Ship Weapons";
  }

  // Components (Ship components)
  if (
    name.includes("cooler") ||
    name.includes("power plant") ||
    name.includes("shield generator") ||
    name.includes("quantum drive") ||
    name.includes("shield")
  ) {
    return "Components";
  }

  // Default to Weapons for unknown (most common marketplace item)
  return "Weapons";
}

/**
 * Map category name to database category ID
 * @param categories - Array of categories from database
 * @param categoryName - Name of category to find
 * @returns Category ID or null
 */
export function getCategoryIdByName(
  categories: Array<{ id: number; name: string; slug: string }>,
  categoryName: string
): number | null {
  const category = categories.find(
    (cat) =>
      cat.name.toLowerCase() === categoryName.toLowerCase() ||
      cat.slug.toLowerCase() === categoryName.toLowerCase()
  );
  return category?.id || null;
}
