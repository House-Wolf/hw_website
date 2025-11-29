# Marketplace Categories

## Overview

The HouseWolf marketplace uses **fixed categories** that are specifically aligned with the SRP (Suggested Retail Price) calculator. These categories should **NOT** be changed or managed dynamically through the UI.

## The Four Fixed Categories

### 1. Weapons (Personal Weapons)
- **Slug**: `weapons`
- **SRP Type**: `Guns`
- **Description**: Personal weapons including pistols, rifles, SMGs, and more
- **Examples**: FS-9 LMG, P4-AR Rifle, BR-2 Shotgun, Knives, Railguns

### 2. Armor (Personal Protective Equipment)
- **Slug**: `armor`
- **SRP Type**: `Armor`
- **Description**: Personal armor, helmets, and protective gear
- **Examples**: Heavy Armor Core, Medium Armor, Light Armor, Helmets, Undersuits

### 3. Components (Ship Components)
- **Slug**: `components`
- **SRP Type**: `Components`
- **Description**: Ship components including coolers, power plants, shields, and quantum drives
- **Examples**: Coolers, Power Plants, Shield Generators, Quantum Drives

### 4. Ship Weapons (Ship-Mounted Weapons)
- **Slug**: `ship-weapons`
- **SRP Type**: `Ship Weapons`
- **Description**: Ship-mounted weapons and ordnance
- **Examples**: Ballistic Repeaters, Laser Cannons, Missile Racks, Torpedoes

## Why Fixed Categories?

The SRP calculator uses a specific formula that requires these exact four categories:

```
SRP = FBV × RC × (1 + 0.35)
```

Where:
- **FBV** (Floor Base Value) is different for each category type
- **RC** (Rarity Coefficient) is calculated based on category-specific ranking systems

Each category has:
- **Different FBV values**:
  - Guns: 2,500 aUEC
  - Armor: 10,000 aUEC
  - Components: 25,000 aUEC
  - Ship Weapons: 35,000 aUEC

- **Different ranking systems**:
  - Guns: G1-G10 (Knife to Railgun)
  - Armor: A1-A5 (Undersuit to Full Set)
  - Components: Size (S1-S6) + Type (Comp1-Comp4)
  - Ship Weapons: Size (S1-S6) + Type (W1-W6)

## Database Setup

### Initial Seed

To set up the categories in a fresh database:

```bash
node prisma/seeds/seed-marketplace-categories.js
```

### Migration from Old Categories

If you have an existing database with the old "Vehicles" and "Ships" categories:

1. The seed script will automatically deactivate old categories
2. Create the new SRP-aligned categories
3. Existing listings will need to be manually recategorized

## Files

### Core Files
- `/lib/marketplace/fixed-categories.ts` - TypeScript constants and utilities
- `/lib/marketplace/srp.ts` - SRP calculator (uses category types)
- `/lib/marketplace/categories.ts` - Category detection and utilities

### Seed Files
- `/prisma/seeds/seed-marketplace-categories.js` - Node.js seed script
- `/prisma/seeds/fix-marketplace-categories.sql` - SQL migration script

### API
- `/app/api/marketplace/categories/route.ts` - Returns active categories

## Category Auto-Detection

The system can auto-detect categories from item names using keyword matching:

```typescript
determineCategoryFromName("FS-9 LMG") // Returns "Weapons"
determineCategoryFromName("Heavy Armor Core") // Returns "Armor"
determineCategoryFromName("Size 2 Cooler") // Returns "Components"
determineCategoryFromName("Ballistic Repeater") // Returns "Ship Weapons"
```

## DO NOT Add Category Management UI

**Important**: Do not create or enable a category management interface. The categories are intentionally fixed and aligned with the SRP calculator formula.

The `ManageCategoriesTab.tsx` component exists but should NOT be used or integrated into the marketplace dashboard.

## Mapping to SRP Types

The category names map to SRP types as follows:

| Category Name | Category Slug | SRP Type |
|--------------|---------------|----------|
| Weapons | `weapons` | Guns |
| Armor | `armor` | Armor |
| Components | `components` | Components |
| Ship Weapons | `ship-weapons` | Ship Weapons |

This mapping is handled automatically by the `getSrpItemTypeFromCategory()` function in `/lib/marketplace/srp.ts`.

## Troubleshooting

### Categories not showing up

1. Check that categories are active:
   ```sql
   SELECT * FROM marketplace_categories WHERE is_active = true;
   ```

2. Re-run the seed script:
   ```bash
   node prisma/seeds/seed-marketplace-categories.js
   ```

### SRP calculator not working

1. Verify the category name matches exactly (case-sensitive)
2. Check the mapping in `lib/marketplace/srp.ts`
3. Ensure the category exists in the database

### Existing listings need recategorization

If you migrated from old categories, update listings manually:

```sql
-- Example: Move all listings from "Vehicles" to "Components"
UPDATE marketplace_listings
SET category_id = (SELECT id FROM marketplace_categories WHERE slug = 'components')
WHERE category_id = (SELECT id FROM marketplace_categories WHERE slug = 'vehicles');
```
