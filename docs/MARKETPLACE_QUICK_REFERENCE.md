# Marketplace Quick Reference Guide

## For Developers

### API Endpoints

#### Public Endpoints
```typescript
GET /api/marketplace              // List all active listings
GET /api/marketplace/categories   // Get all active categories
GET /api/marketplace/listing/:id  // Get single listing details
```

#### Authenticated Endpoints
```typescript
POST   /api/marketplace/create       // Create listing (FormData)
PUT    /api/marketplace/update/:id   // Update listing (JSON)
DELETE /api/marketplace/delete/:id   // Delete listing (soft)
GET    /api/marketplace/my-listings  // User's listings
```

### Request/Response Examples

#### Create Listing
```typescript
// Request (FormData)
const formData = new FormData();
formData.append("title", "FS-9 LMG");
formData.append("description", "Fully Loaded Combat LMG...");
formData.append("categoryId", "3");
formData.append("price", "50000");
formData.append("quantity", "1");
formData.append("location", "Area 18");
formData.append("imageUrl", "https://example.com/image.jpg");

const response = await fetch('/api/marketplace/create', {
  method: 'POST',
  body: formData
});

// Response
{
  "success": true,
  "listing": {
    "id": "uuid",
    "title": "FS-9 LMG",
    "price": 50000,
    ...
  }
}
```

#### Update Listing
```typescript
// Request (JSON)
await fetch('/api/marketplace/update/uuid', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: "Updated Title",
    description: "Updated description",
    categoryId: "3",
    price: "55000",
    quantity: "2",
    location: "Port Olisar",
    imageUrl: "https://example.com/new-image.jpg"
  })
});

// Response
{
  "success": true,
  "listing": { ... }
}
```

### Utility Functions

#### Categories
```typescript
import { determineCategoryFromName, getCategoryIdByName } from '@/lib/marketplace/categories';

// Auto-detect category
const category = determineCategoryFromName("FS-9 LMG"); // "Weapons"

// Get category ID
const categoryId = getCategoryIdByName(categories, "Weapons"); // number
```

#### SRP Calculator
```typescript
import {
  calculateSRP,
  calculateRarityScore,
  type SrpItemType
} from '@/lib/marketplace/srp';

// Calculate rarity score
const rarityScore = calculateRarityScore("Guns", {
  condition: 2,  // C3 Pledged
  gun: 7,        // G7 LMG
  armor: 0,
  size: 0,
  shipWeapon: 0,
  component: 0
});
// Result: 9

// Calculate SRP
const srp = calculateSRP("Guns", 9);
// Result: 5,400 aUEC
// Formula: 2500 × (1 + 9 × 0.09) × 1.35 = 5,400
```

#### Wiki Integration
```typescript
import { searchWiki, isValidImageUrl } from '@/lib/marketplace/wiki';

// Search wiki
const wikiData = await searchWiki("FS-9");
// Result: { name, description, image, wikiUrl }

// Validate image URL
const isValid = isValidImageUrl("https://example.com/image.jpg");
// Result: true/false
```

#### Suspension Checks
```typescript
import { isUserSuspended, getUserSuspensionDetails } from '@/lib/marketplace/suspension';

// Check if suspended
const suspended = await isUserSuspended(userId);
// Result: boolean

// Get details
const details = await getUserSuspensionDetails(userId);
// Result: { isSuspended, reason, suspendedAt, endsAt, suspendedBy } | null
```

## For Users

### Creating a Listing

1. **Navigate**: Go to Dashboard → Marketplace
2. **Tab**: Click "Create Listing"
3. **Title**: Enter item name
4. **Wiki Search** (Optional): Click "Search Wiki" to auto-fill
5. **Category**: Select or auto-filled
6. **Price**: Enter price in aUEC
   - **Admins**: Use SRP Calculator for suggested pricing
7. **Quantity**: Number of items
8. **Location** (Optional): Where item is located
9. **Image URL** (Optional): Direct link to image
10. **Description**: Item details
11. **Submit**: Click "Create Listing"

### Using Wiki Search

1. Enter item name in "Title" field (e.g., "FS-9")
2. Click "Search Wiki" button
3. Wait for search (shows loading)
4. If found:
   - Description auto-fills
   - Image URL auto-fills
   - Category auto-detects
   - Wiki preview shows below form
5. Review and adjust if needed
6. Submit listing

### SRP Calculator (Admins Only)

1. In price field, click "Show tool"
2. Select item type (Guns, Armor, Components, Ship Weapons)
3. **Manual Entry**:
   - Enter Rarity Score (0-15)
   - See calculated price
   - Click "Use [price] aUEC"
4. **Cheat Sheet**:
   - Click "Show cheat sheet"
   - Select Condition (C1-C4)
   - Select category-specific rank
   - See calculated RS
   - Click "Use RS [score]"
   - Then use calculated price

### Managing Listings

1. **View**: Go to "My Listings" tab
2. **Edit**: Click "Edit" button on listing
3. **Delete**: Click "Delete" button (confirmation required)

## For Admins

### Admin Features

- **SRP Calculator**: Available in price field
- **Edit Any Listing**: Can edit all users' listings
- **Delete Any Listing**: Can delete any listing
- **Bypass Suspension**: Admins not affected by marketplace suspensions
- **Quick Edit**: Click edit on marketplace, redirects to dashboard with listing loaded

### SRP Formula Reference

```
FBV (Floor Base Values):
- Guns: 2,500 aUEC
- Armor: 10,000 aUEC
- Components: 25,000 aUEC
- Ship Weapons: 35,000 aUEC

Rarity Score (RS):
- Guns: Condition + Gun Rank (0-13)
- Armor: Condition + Armor Rank (0-8)
- Components: Condition + Size + Component Type (0-13)
- Ship Weapons: Condition + Size + Weapon Type (0-15)

RS clamped to MAX: 15

Rarity Coefficient (RC):
RC = 1 + (RS × 0.09)

Suggested Retail Price (SRP):
SRP = FBV × RC × 1.35
```

### Condition Ranks
- C1: Purchasable (0)
- C2: Not Purchasable (+1)
- C3: Pledged (+2)
- C4: Event/Unique (+3)

### Gun Ranks
- G1: Knife (+1)
- G2: Pistol (+2)
- G3: SMG/PDW (+3)
- G4: Shotgun (+4)
- G5: Carbine (+5)
- G6: Rifle (+6)
- G7: LMG (+7)
- G8: Sniper (+8)
- G9: Launcher (+9)
- G10: Railgun (+10)

### Armor Ranks
- A1: Undersuit (+1)
- A2: Light Armor (+2)
- A3: Medium Armor (+3)
- A4: Heavy Armor (+4)
- A5: Full Set/Special (+5)

## Troubleshooting

### Wiki Search Not Working
- Check internet connection
- Verify StarCitizen.tools is accessible
- Try different search term
- Manually enter data if wiki unavailable

### Image Not Displaying
- Verify URL is direct link to image
- Check URL starts with http:// or https://
- Test URL in browser
- Image host may block hotlinking

### Listing Not Appearing
- Check status is "ACTIVE"
- Verify not soft-deleted (deletedAt is null)
- Check visibility is "PUBLIC"
- Admin may have hidden/deleted

### Suspension Issues
- Check MarketplaceUserStatus table
- Verify suspension hasn't expired
- Admins bypass suspensions
- Check endsAt date if temporary

### SRP Calculator Wrong Results
- Verify correct item type selected
- Check all rank selections
- RS capped at 15 (shows warning if exceeded)
- Formula rounds final result

## Database Schema Reference

### MarketplaceListings
```typescript
{
  id: UUID,
  sellerUserId: UUID,
  title: string,
  description: string,
  categoryId: number,        // FK to MarketplaceCategory
  price: Decimal(12,2),
  currency: string,          // "aUEC"
  quantity: number,
  location: string?,
  status: ListingStatus,     // DRAFT | ACTIVE | SOLD | EXPIRED | DELETED
  visibility: ListingVisibility, // PUBLIC | PRIVATE | HIDDEN
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: timestamp?
}
```

### MarketplaceListingImage
```typescript
{
  id: number,
  listingId: UUID,           // FK to MarketplaceListings
  imageUrl: string,
  sortOrder: number,
  createdAt: timestamp
}
```

### MarketplaceCategory
```typescript
{
  id: number,
  name: string,
  slug: string,
  description: string?,
  parentId: number?,         // Self-referential for hierarchy
  isActive: boolean,
  sortOrder: number,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### MarketplaceUserStatus
```typescript
{
  userId: UUID,              // PK, FK to User
  isSuspended: boolean,
  reason: string?,
  suspendedBy: UUID?,        // FK to User
  suspendedAt: timestamp?,
  endsAt: timestamp?,        // null = permanent
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Environment Variables

No new environment variables required. Uses existing:
- `DATABASE_URL` - PostgreSQL connection string

## Dependencies

No new dependencies added. Uses existing:
- Next.js 16.0.4
- Prisma
- NextAuth
- React
- TypeScript

---

**Last Updated**: 2025-11-28
**Version**: 1.0.0
