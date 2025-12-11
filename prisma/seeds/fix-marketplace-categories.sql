-- Fix Marketplace Categories to align with SRP Tool AND Marketplace UI
-- This script keeps SRP categories strict but also includes marketplace-only categories.

-- 1. Deactivate old categories
UPDATE marketplace_categories
SET is_active = false, updated_at = NOW()
WHERE slug IN ('vehicles', 'ships');

-- 2. Insert/Update SRP categories (identified by their slugs)
INSERT INTO marketplace_categories (name, slug, description, parent_id, is_active, sort_order, created_at, updated_at)
VALUES
  ('Weapons', 'weapons',
    'Personal weapons including pistols, rifles, and more',
    NULL, true, 1, NOW(), NOW()),

  ('Armor', 'armor',
    'Personal armor, helmets, and protective gear',
    NULL, true, 2, NOW(), NOW()),

  ('Components', 'components',
    'Ship components including coolers, power plants, shields, and quantum drives',
    NULL, true, 3, NOW(), NOW()),

  ('Ship Weapons', 'ship-weapons',
    'Ship-mounted weapons and ordnance',
    NULL, true, 4, NOW(), NOW())

ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- 3. Insert/Update Marketplace-only categories
INSERT INTO marketplace_categories (name, slug, description, parent_id, is_active, sort_order, created_at, updated_at)
VALUES
  ('Clothing', 'clothing',
    'Apparel, undersuits, outfits, and cosmetic gear',
    NULL, true, 5, NOW(), NOW()),

  ('Items', 'items',
    'Misc items, consumables, gadgets, and general equipment',
    NULL, true, 6, NOW(), NOW()),

  ('Services', 'services',
    'Hauling, escorting, logistics, medical assistance, and other player services',
    NULL, true, 7, NOW(), NOW()),

  ('Rentals', 'rentals',
    'Ship rentals, equipment rentals, temporary contracts',
    NULL, true, 8, NOW(), NOW())

ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- 4. Display final results
SELECT
  id, name, slug, is_active, sort_order
FROM marketplace_categories
ORDER BY sort_order;
