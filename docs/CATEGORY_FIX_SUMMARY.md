# Marketplace Category Fix - Summary

## Problem Analysis

### What Was Wrong

1. **Database had incorrect categories**:
   - Only "Vehicles" and "Ships" existed
   - These don't align with the SRP (Suggested Retail Price) calculator

2. **SRP tool expected different categories**:
   - Weapons (maps to "Guns" in SRP)
   - Armor
   - Components
   - Ship Weapons

3. **Category management tab existed**:
   - `ManageCategoriesTab.tsx` allowed dynamic category creation
   - This created confusion about which categories should exist
   - Categories should be FIXED, not dynamic

4. **Auto-detection was broken**:
   - `determineCategoryFromName()` returned categories that didn't exist in DB
   - SRP calculator couldn't find matching categories

### Root Cause

The marketplace was set up with arbitrary categories ("Vehicles", "Ships") instead of the specific categories required by the SRP calculator formula. The SRP calculator needs exact category types because each has:
- Different FBV (Floor Base Value) amounts
- Different ranking systems (G1-G10 for guns, A1-A5 for armor, etc.)
- Different rarity score calculations

## What Was Fixed

### 1. Database Categories ✅

**File**: `prisma/seeds/seed-marketplace-categories.js`

- Created seed script that adds the 4 correct categories
- Deactivated old "Vehicles" and "Ships" categories
- New categories:
  - ID 3: Weapons (slug: weapons)
  - ID 4: Armor (slug: armor)
  - ID 5: Components (slug: components)
  - ID 6: Ship Weapons (slug: ship-weapons)

**Run with**:
```bash
node prisma/seeds/seed-marketplace-categories.js
```

### 2. Category Detection Logic ✅

**File**: `lib/marketplace/categories.ts`

Updated `determineCategoryFromName()` to:
- Return only the 4 fixed category names
- Better keyword matching for ship weapons vs personal weapons
- Default to "Weapons" instead of "Items"
- Removed references to "Clothing" and "Items" categories

### 3. Fixed Category Constants ✅

**File**: `lib/marketplace/fixed-categories.ts` (NEW)

Created TypeScript constants defining:
- The 4 fixed categories with their properties
- Mapping between category names and SRP types
- Helper functions for validation and type conversion
- Clear documentation that these are FIXED and should not change

### 4. Documentation ✅

**File**: `docs/MARKETPLACE_CATEGORIES.md` (NEW)

Comprehensive documentation explaining:
- Why categories are fixed
- The SRP calculator formula
- Category-specific FBV values and ranking systems
- How to seed/migrate categories
- Troubleshooting guide
- **Clear warning NOT to add category management UI**

## Files Changed

### Created
- `prisma/seeds/seed-marketplace-categories.js` - Database seed script
- `prisma/seeds/fix-marketplace-categories.sql` - SQL migration (alternative)
- `lib/marketplace/fixed-categories.ts` - TypeScript category constants
- `docs/MARKETPLACE_CATEGORIES.md` - Category system documentation
- `CATEGORY_FIX_SUMMARY.md` - This file

### Modified
- `lib/marketplace/categories.ts` - Updated auto-detection logic

### Noted (Not Modified)
- `app/(dashboard)/dashboard/marketplace/components/ManageCategoriesTab.tsx` - EXISTS but should NOT be used
- `lib/marketplace/srp.ts` - Already had correct mapping, no changes needed
- `app/api/marketplace/categories/route.ts` - Already returns active categories correctly

## Database State

### Before
```
ID: 1, Name: Vehicles, Slug: vehicles, Active: true
ID: 2, Name: Ships, Slug: ships, Active: true
```

### After
```
ID: 1, Name: Vehicles, Slug: vehicles, Active: false  (DEACTIVATED)
ID: 2, Name: Ships, Slug: ships, Active: false        (DEACTIVATED)
ID: 3, Name: Weapons, Slug: weapons, Active: true     (NEW)
ID: 4, Name: Armor, Slug: armor, Active: true         (NEW)
ID: 5, Name: Components, Slug: components, Active: true (NEW)
ID: 6, Name: Ship Weapons, Slug: ship-weapons, Active: true (NEW)
```

## Testing Required

### 1. Category Dropdown ✓
- [ ] Navigate to `/dashboard/marketplace`
- [ ] Check the category dropdown shows: Weapons, Armor, Components, Ship Weapons
- [ ] Verify old categories (Vehicles, Ships) do NOT appear

### 2. Wiki Auto-Fill ✓
- [ ] Enter item name like "FS-9 LMG"
- [ ] Click "Search Wiki"
- [ ] Verify category auto-sets to "Weapons"

### 3. SRP Calculator ✓
- [ ] As marketplace admin, open SRP calculator
- [ ] Select "Weapons" category
- [ ] Verify "Guns" shows in item type dropdown
- [ ] Enter rarity score and verify SRP calculation works

### 4. Category Mapping ✓
Test each category maps correctly to SRP type:
- Weapons → Guns ✓
- Armor → Armor ✓
- Components → Components ✓
- Ship Weapons → Ship Weapons ✓

### 5. Existing Listing ✓
- [ ] Check if the existing listing can be edited
- [ ] Update its category to one of the new categories
- [ ] Verify it saves correctly

## Important Notes

### DO NOT Enable Category Management

The `ManageCategoriesTab.tsx` component should **NOT** be integrated into the marketplace dashboard. Categories are intentionally fixed to align with the SRP calculator formula.

If category management is needed in the future, it would require:
1. Completely redesigning the SRP calculator
2. Creating dynamic FBV and ranking systems
3. Major refactoring of the pricing logic

### Migration of Existing Listings

The seed script reported 1 existing listing in the database. This listing should be manually recategorized:

1. Navigate to `/dashboard/marketplace`
2. Go to "My Listings" tab
3. Edit the listing
4. Select the appropriate new category
5. Save

Alternatively, use SQL:
```sql
-- Example: Move listing to Weapons category
UPDATE marketplace_listings
SET category_id = 3
WHERE id = '<listing-id>';
```

## Next Steps

1. **Test the fix** using the testing checklist above
2. **Update existing listing** to use a new category
3. **Verify SRP calculator** works correctly for all 4 categories
4. **Remove or document** `ManageCategoriesTab.tsx` as unused
5. **Consider adding validation** to prevent inactive categories from being selected

## Summary

The marketplace category system is now properly aligned with the SRP calculator. The four fixed categories (Weapons, Armor, Components, Ship Weapons) match the SRP tool's requirements, enabling accurate price calculations based on item rarity and type.

**Key Takeaway**: Categories are FIXED by design to support the SRP pricing formula. Do not add dynamic category management.
