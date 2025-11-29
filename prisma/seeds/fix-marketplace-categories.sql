-- Fix Marketplace Categories to align with SRP Tool
-- This script replaces the incorrect categories (Vehicles, Ships) with the correct SRP-aligned categories

-- Delete existing categories (if any listings exist, this will fail due to foreign key constraints)
-- DELETE FROM marketplace_categories;

-- First, let's update existing categories if there are no listings using them
-- Otherwise, we'll need to migrate listings first

-- Disable old categories
UPDATE marketplace_categories SET is_active = false WHERE slug IN ('vehicles', 'ships');

-- Insert the correct SRP-aligned categories
INSERT INTO marketplace_categories (name, slug, description, parent_id, is_active, sort_order, created_at, updated_at)
VALUES
  ('Weapons', 'weapons', 'Personal weapons including pistols, rifles, and more', NULL, true, 1, NOW(), NOW()),
  ('Armor', 'armor', 'Personal armor, helmets, and protective gear', NULL, true, 2, NOW(), NOW()),
  ('Components', 'components', 'Ship components including coolers, power plants, shields, and quantum drives', NULL, true, 3, NOW(), NOW()),
  ('Ship Weapons', 'ship-weapons', 'Ship-mounted weapons and ordnance', NULL, true, 4, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Display the result
SELECT id, name, slug, is_active, sort_order FROM marketplace_categories ORDER BY sort_order;
