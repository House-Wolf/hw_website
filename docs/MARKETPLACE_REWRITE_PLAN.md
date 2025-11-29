# Marketplace Rewrite Implementation Plan

## Executive Summary
This document outlines the plan to rewrite the HW_Website marketplace to incorporate the best features from both the current implementation and the Kamposian reference implementation.

## Current State Assessment

### HW_Website Marketplace (Current)
- **Architecture**: Server Components + Server Actions
- **Database**: Full-featured schema with categories, images, user status
- **Features**: Category management, image upload, pagination, admin controls
- **Strengths**: Type-safe, proper database design, good separation of concerns
- **Weaknesses**: No wiki integration, no SRP calculator, less intuitive UX

### Kamposian Marketplace (Reference)
- **Architecture**: Client Components + API Routes
- **Database**: Simpler schema (string category, single image URL)
- **Features**: Wiki integration, SRP calculator, auto-categorization, suspension checks
- **Strengths**: Rich features, excellent UX, real-time feedback
- **Weaknesses**: Simpler database model, less flexible for future expansion

## Implementation Strategy

### Phase 1: Core Dashboard Rewrite ✓
**Goal**: Replace dashboard marketplace page with Kamposian-inspired implementation while maintaining hw_website's database schema

**Files to Modify**:
1. `app/(dashboard)/dashboard/marketplace/page.tsx` - Main dashboard (rewrite as client component)
2. Keep server actions for data mutations
3. Add API routes for:
   - `/api/marketplace/create` - POST
   - `/api/marketplace/update/[id]` - PUT
   - `/api/marketplace/delete/[id]` - DELETE
   - `/api/marketplace/my-listings` - GET
   - `/api/marketplace/listing/[id]` - GET

**New Features to Add**:
- Wiki search integration (StarCitizen.tools API)
- SRP calculator for admins
- Auto-category detection
- Real-time form validation
- Image preview
- Better loading states

**Database Adaptations**:
- Use `MarketplaceCategory` relation (not string)
- Use `MarketplaceListingImage` table (not single imageUrl)
- Maintain quantity, location fields
- Keep status/visibility enums

### Phase 2: API Routes Implementation
Create new API route structure matching Kamposian but adapted for hw_website schema:

```
app/api/marketplace/
├── create/route.ts          # POST - Create listing
├── update/[id]/route.ts     # PUT - Update listing
├── delete/[id]/route.ts     # DELETE - Soft delete
├── my-listings/route.ts     # GET - User's listings
├── listing/[id]/route.ts    # GET - Single listing
└── wiki-search/route.ts     # GET - Search StarCitizen.tools (NEW)
```

**Authentication**: Use `auth()` from hw_website's auth system
**Authorization**: Check permissions via `session.user.permissions`
**Suspension**: Check `MarketplaceUserStatus` table

### Phase 3: Component Structure
```
app/(dashboard)/dashboard/marketplace/
├── page.tsx                 # Main client component (REWRITE)
└── components/
    ├── WikiSearchSection.tsx       # NEW
    ├── SRPCalculator.tsx           # NEW
    ├── ListingForm.tsx             # NEW
    ├── MyListingsTab.tsx           # ADAPTED from MyPostsTab
    └── ImageUploadField.tsx        # ADAPTED from ImageUpload
```

### Phase 4: Public Marketplace Page
**File**: `app/(root)/marketplace/page.tsx`
- Keep current structure but enhance with better data fetching
- Add server-side filtering/sorting
- Improve card display
- Add proper image handling from MarketplaceListingImage table

### Phase 5: Features Integration

#### A. Wiki Integration
- Endpoint: `https://starcitizen.tools/api.php`
- Search: `action=query&list=search&srsearch={query}`
- Details: `action=query&prop=extracts|pageimages&titles={title}`
- Auto-fill: title, description, image, category

#### B. SRP Calculator
Constants:
```typescript
FBV_BY_ITEM_TYPE = {
  Guns: 2500,
  Armor: 10000,
  Components: 25000,
  Ship Weapons: 35000
}
SRP_MARKUP = 0.35
RARITY_COEFFICIENT_INCREMENT = 0.09
MAX_RARITY_SCORE = 15
```

Formula: `SRP = FBV × (1 + RS × 0.09) × 1.35`

#### C. Auto-Categorization
Map item names to categories:
- Armor: helmet, suit, core, armor
- Weapons: rifle, pistol, gun, lmg, smg, etc.
- Components: cooler, power plant, shield, quantum
- Clothing: jacket, pants, boots, etc.

#### D. Suspension System
Check `MarketplaceUserStatus.isSuspended` before:
- Creating listings
- Updating listings
- Deleting listings (except admins)

### Phase 6: Database Schema Verification

**Current Schema Check**:
```prisma
model MarketplaceListings {
  id               String   @id @default(uuid()) @db.Uuid
  sellerUserId     String
  title            String
  description      String
  categoryId       Int
  price            Decimal  @db.Decimal(12, 2)
  currency         String
  quantity         Int      @default(1)
  status           ListingStatus
  visibility       ListingVisibility
  location         String?
  // ... relations
}
```

**Fields Needed** (all present ✓):
- ✓ title
- ✓ description
- ✓ categoryId (relation to MarketplaceCategory)
- ✓ price
- ✓ quantity
- ✓ location
- ✓ images (MarketplaceListingImage relation)

**No migrations needed!**

## Implementation Order

### Step 1: Create API Routes (Backend First)
1. `/api/marketplace/create/route.ts`
2. `/api/marketplace/update/[id]/route.ts`
3. `/api/marketplace/delete/[id]/route.ts`
4. `/api/marketplace/my-listings/route.ts`
5. `/api/marketplace/listing/[id]/route.ts`

### Step 2: Create Utility Functions
1. `lib/marketplace/wiki.ts` - Wiki integration helpers
2. `lib/marketplace/srp.ts` - SRP calculator logic
3. `lib/marketplace/categories.ts` - Category detection
4. `lib/marketplace/suspension.ts` - Suspension checking

### Step 3: Build Dashboard Components
1. `WikiSearchSection.tsx`
2. `SRPCalculator.tsx`
3. `ListingForm.tsx`
4. `MyListingsTab.tsx`

### Step 4: Rewrite Dashboard Page
Replace `app/(dashboard)/dashboard/marketplace/page.tsx` with new implementation

### Step 5: Update Public Marketplace
Enhance `app/(root)/marketplace/page.tsx` with proper image loading

### Step 6: Testing & Optimization
- Test all CRUD operations
- Test wiki integration
- Test SRP calculator
- Test suspension system
- Test admin features
- Performance optimization
- Error handling
- Loading states

## Migration Checklist

- [ ] Backup current implementation
- [ ] Create API routes structure
- [ ] Implement utility functions
- [ ] Create new components
- [ ] Rewrite dashboard page
- [ ] Update public marketplace
- [ ] Test authentication
- [ ] Test permissions
- [ ] Test suspension system
- [ ] Test wiki integration
- [ ] Test SRP calculator
- [ ] Test image uploads
- [ ] Test category management
- [ ] Test admin controls
- [ ] Performance testing
- [ ] User acceptance testing

## Rollback Plan
If issues occur:
1. Git revert to previous commit
2. Keep API routes but disable in routing
3. Keep utility functions for future use
4. Restore old dashboard page

## Success Criteria
- [ ] All current features working
- [ ] Wiki integration functional
- [ ] SRP calculator working for admins
- [ ] Auto-categorization accurate
- [ ] Suspension system enforced
- [ ] Image uploads working
- [ ] Category management preserved
- [ ] Performance maintained or improved
- [ ] No regressions in existing functionality
- [ ] Admin controls enhanced
- [ ] Better user experience

## Timeline Estimate
- API Routes: 2-3 hours
- Utility Functions: 1-2 hours
- Components: 3-4 hours
- Dashboard Rewrite: 2-3 hours
- Public Page Updates: 1 hour
- Testing: 2-3 hours
- **Total: 11-16 hours**

## Notes
- Maintain backward compatibility with existing categories
- Preserve all admin features
- Keep image upload functionality
- Ensure suspension system works correctly
- Test permission checks thoroughly
- Maintain type safety throughout
