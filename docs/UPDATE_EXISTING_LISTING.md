# Update Existing Listing

## Issue

The verification script found **1 listing** that is still using an old category (either "Vehicles" or "Ships"). This listing needs to be updated to use one of the new SRP-aligned categories.

## Option 1: Update via Dashboard (Recommended)

1. Navigate to: `http://localhost:3000/dashboard/marketplace`
2. Click the "My Listings" tab
3. Find the listing that needs updating
4. Click "Edit"
5. Select the appropriate new category:
   - **Weapons** - for personal weapons (pistols, rifles, etc.)
   - **Armor** - for personal armor and protective gear
   - **Components** - for ship components (coolers, shields, etc.)
   - **Ship Weapons** - for ship-mounted weapons
6. Click "Update Listing"

## Option 2: Update via Database Query

First, find the listing:

```sql
SELECT id, title, category_id
FROM marketplace_listings
WHERE category_id IN (1, 2);
```

Then update it to the appropriate category:

```sql
-- Update to Weapons (ID: 3)
UPDATE marketplace_listings
SET category_id = 3
WHERE id = '<listing-id>';

-- OR update to Armor (ID: 4)
UPDATE marketplace_listings
SET category_id = 4
WHERE id = '<listing-id>';

-- OR update to Components (ID: 5)
UPDATE marketplace_listings
SET category_id = 5
WHERE id = '<listing-id>';

-- OR update to Ship Weapons (ID: 6)
UPDATE marketplace_listings
SET category_id = 6
WHERE id = '<listing-id>';
```

## Option 3: Update via Prisma

Create a script to update:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateListing() {
  // Find listings with old categories
  const listings = await prisma.marketplaceListings.findMany({
    where: {
      categoryId: { in: [1, 2] } // Old Vehicles and Ships IDs
    },
    include: {
      category: true
    }
  });

  console.log('Found listings to update:', listings);

  // Update each listing
  // Change category_id to the appropriate new category (3-6)
  for (const listing of listings) {
    await prisma.marketplaceListings.update({
      where: { id: listing.id },
      data: {
        categoryId: 3 // Change this to appropriate category ID
      }
    });
    console.log(`Updated listing: ${listing.title}`);
  }
}

updateListing()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
```

## Verify the Update

After updating, run the verification script:

```bash
node prisma/seeds/verify-categories.js
```

It should show no warnings about listings using inactive categories.

## Category Reference

| Category Name | ID | Slug | Use For |
|--------------|-----|------|---------|
| Weapons | 3 | weapons | Personal weapons (pistols, rifles, LMGs, etc.) |
| Armor | 4 | armor | Personal armor, helmets, protective gear |
| Components | 5 | components | Ship components (coolers, shields, power plants) |
| Ship Weapons | 6 | ship-weapons | Ship-mounted weapons (cannons, repeaters, missiles) |

## Old Categories (Deactivated)

| Category Name | ID | Slug | Status |
|--------------|-----|------|--------|
| Vehicles | 1 | vehicles | INACTIVE |
| Ships | 2 | ships | INACTIVE |

These are kept in the database for historical data but should not be used for new or updated listings.
