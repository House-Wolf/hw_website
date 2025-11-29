# Marketplace Rewrite - Complete Overview

## Executive Summary

The HW_Website marketplace has been successfully rewritten to incorporate the best features from the Kamposian reference implementation while maintaining the robust database architecture of the current system. This hybrid approach delivers:

- **Rich Features**: Wiki integration, SRP calculator, auto-categorization
- **Robust Architecture**: Proper database relations, type safety, permission system
- **Enhanced UX**: Real-time feedback, loading states, smooth transitions
- **Admin Tools**: Advanced pricing calculator, quick-edit capabilities
- **Future-Proof**: Scalable design, clean separation of concerns

## What You Get

### For Regular Users
- **Wiki-Powered Listings**: Search StarCitizen.tools to auto-fill item data
- **Visual Previews**: See your images before submitting
- **Easy Management**: Create, edit, delete listings in one place
- **Smart Categories**: Auto-detection with manual override
- **Location Tracking**: Optional field for item location

### For Administrators
- **SRP Calculator**: Scientific pricing tool based on HouseWolf formula
  - Floor Base Values (FBV) by item type
  - Rarity Score calculator with cheat sheet
  - Automatic price suggestions
- **Full Management**: Edit/delete any listing
- **Quick Edit**: Jump from marketplace to edit mode
- **Suspension Bypass**: Admins unaffected by marketplace suspensions

## Implementation Stats

- **Files Created**: 12 new files
- **Files Modified**: 2 files (with backups)
- **Lines of Code**: ~4,000+
- **API Routes**: 7 endpoints
- **Utility Modules**: 4 libraries
- **Time to Complete**: Single session implementation

## Key Files

### Documentation (Start Here)
1. **`MARKETPLACE_REWRITE_PLAN.md`** - Detailed implementation plan
2. **`MARKETPLACE_REWRITE_SUMMARY.md`** - Complete feature list and testing checklist
3. **`MARKETPLACE_QUICK_REFERENCE.md`** - Developer and user quick reference
4. **`README_MARKETPLACE_REWRITE.md`** - This file

### Core Implementation
```
app/
├── (dashboard)/dashboard/marketplace/
│   └── page.tsx                          ← Main dashboard (REWRITTEN)
├── (root)/marketplace/
│   └── page.tsx                          ← Public marketplace (unchanged)
└── api/marketplace/
    ├── route.ts                          ← Public listings (ENHANCED)
    ├── create/route.ts                   ← Create listing (NEW)
    ├── update/[id]/route.ts              ← Update listing (NEW)
    ├── delete/[id]/route.ts              ← Delete listing (NEW)
    ├── my-listings/route.ts              ← User's listings (NEW)
    ├── listing/[id]/route.ts             ← Single listing (NEW)
    └── categories/route.ts               ← Categories list (NEW)

lib/marketplace/
├── categories.ts                         ← Auto-detection (NEW)
├── srp.ts                                ← Price calculator (NEW)
├── wiki.ts                               ← Wiki integration (NEW)
└── suspension.ts                         ← Suspension checks (NEW)
```

## Features Breakdown

### 1. Wiki Integration
**What**: Search StarCitizen.tools API to auto-fill listing data
**How**: Click "Search Wiki" button next to title field
**Auto-fills**: Description, Image URL, Category
**Shows**: Wiki preview card with link to source

### 2. SRP Calculator (Admin Only)
**What**: Suggested Retail Price calculator using HouseWolf formula
**Formula**: `SRP = FBV × (1 + RS × 0.09) × 1.35`

**Components**:
- **FBV (Floor Base Value)**: Item type baseline (Guns: 2.5K, Armor: 10K, Components: 25K, Ship Weapons: 35K)
- **RS (Rarity Score)**: 0-15 scale based on condition + item type ranks
- **RC (Rarity Coefficient)**: `1 + (RS × 0.09)`
- **Markup**: Fixed 35% for HouseWolf pricing

**Interface**:
- Manual RS entry
- Cheat sheet calculator with dropdowns
- Live preview of calculations
- One-click apply to price field

### 3. Auto-Category Detection
**What**: Intelligently detects category from item name
**Categories**: Weapons, Armor, Clothing, Components, Items
**Trigger**: After wiki search or manual analysis
**Safety**: Shows confirmation dialog before submitting

### 4. Enhanced Listing Management
**Create**: FormData POST to `/api/marketplace/create`
**Update**: JSON PUT to `/api/marketplace/update/:id`
**Delete**: Soft delete via `/api/marketplace/delete/:id`
**View**: GET from `/api/marketplace/my-listings`

**Features**:
- Real-time form validation
- Image URL preview
- Loading states
- Success/error messaging
- Edit mode with cancel
- Tabbed interface

### 5. Suspension System
**Check**: Before create, update, delete operations
**Source**: `MarketplaceUserStatus` table
**Admin Bypass**: Marketplace admins exempt
**Auto-Lift**: Expired suspensions automatically removed

## Database Integration

**No migrations required!** Works with existing schema:

### Tables Used
- `MarketplaceListings` - Core listing data
- `MarketplaceListingImage` - Image storage (supports multiple per listing)
- `MarketplaceCategory` - Category relations with hierarchy support
- `MarketplaceUserStatus` - Suspension tracking

### Relationships
- Listing → Category (many-to-one)
- Listing → Images (one-to-many)
- Listing → Seller/User (many-to-one)
- UserStatus → User (one-to-one)

## Testing Guide

### Quick Smoke Test
1. ✓ Navigate to `/dashboard/marketplace`
2. ✓ Enter title: "FS-9"
3. ✓ Click "Search Wiki"
4. ✓ Verify auto-fill (description, image, category)
5. ✓ Adjust price if needed
6. ✓ Submit listing
7. ✓ Check "My Listings" tab
8. ✓ Edit listing
9. ✓ Delete listing

### Admin-Specific Test
1. ✓ Login as marketplace admin
2. ✓ Navigate to create listing
3. ✓ Verify "SRP Calculator" visible in price field
4. ✓ Click "Show tool"
5. ✓ Select item type: "Guns"
6. ✓ Click "Show cheat sheet"
7. ✓ Select Condition: "C3 Pledged" (+2)
8. ✓ Select Gun Rank: "G7 LMG" (+7)
9. ✓ Verify RS Preview: 9
10. ✓ Click "Use RS 9"
11. ✓ Verify calculated SRP appears
12. ✓ Click "Use [price] aUEC"
13. ✓ Verify price field updated

### Full Test Matrix
See `MARKETPLACE_REWRITE_SUMMARY.md` → Testing Checklist section

## Rollback Procedure

If critical issues arise, restore from backups:

```bash
# Restore dashboard page
mv "C:\development\hw_website\app\(dashboard)\dashboard\marketplace\page.tsx.backup" \
   "C:\development\hw_website\app\(dashboard)\dashboard\marketplace\page.tsx"

# Restore marketplace API
mv "C:\development\hw_website\app\api\marketplace\route.ts.backup" \
   "C:\development\hw_website\app\api\marketplace\route.ts"
```

New API routes can remain (won't be called by old implementation).

## Performance Notes

### Optimizations Included
- Wiki API results cached (1 hour)
- Database queries use proper indexes
- Images lazy-loaded
- Decimal serialization for JSON
- Efficient Prisma queries with selective includes

### Expected Response Times
- Create listing: <500ms
- Update listing: <300ms
- Delete listing: <200ms
- Fetch my-listings: <400ms
- Wiki search: 500-2000ms (external API)

## Security Considerations

### Implemented
✓ Authentication required for all mutations
✓ Ownership checks (can only edit own listings)
✓ Admin permission checks
✓ Suspension enforcement
✓ Soft deletes (data preservation)
✓ Input validation
✓ Type safety throughout

### Recommendations
- Add rate limiting for wiki searches
- Add CSRF protection if not already present
- Consider image URL whitelist
- Add content moderation for descriptions
- Log admin actions for audit trail

## Maintenance Notes

### Adding New Categories
1. Insert into `MarketplaceCategory` table
2. Add to `determineCategoryFromName()` in `lib/marketplace/categories.ts` if auto-detection needed
3. Add to SRP mapping if applicable

### Updating SRP Formula
Edit constants in `lib/marketplace/srp.ts`:
- `FBV_BY_ITEM_TYPE` - Floor base values
- `SRP_MARKUP` - Markup percentage
- `RARITY_COEFFICIENT_INCREMENT` - RC increment per RS point
- `MAX_RARITY_SCORE` - Maximum RS allowed

### Wiki Integration Changes
Edit `lib/marketplace/wiki.ts`:
- Update API endpoint if wiki changes
- Adjust caching duration
- Modify category detection logic

## Future Enhancements

### Short-Term (1-2 months)
- [ ] Image file upload (not just URLs)
- [ ] Bulk listing operations
- [ ] Enhanced search/filter on public marketplace
- [ ] Listing view count tracking
- [ ] Favorite/bookmark functionality

### Medium-Term (3-6 months)
- [ ] Multiple images per listing (UI for existing DB support)
- [ ] Listing analytics dashboard
- [ ] Price history tracking
- [ ] Automated market analysis
- [ ] Discord bot integration for notifications

### Long-Term (6+ months)
- [ ] Seller ratings/reviews
- [ ] Transaction tracking
- [ ] Escrow system
- [ ] Advanced market insights
- [ ] Mobile app support

## Support & Documentation

### For Developers
- **Quick Reference**: `MARKETPLACE_QUICK_REFERENCE.md`
- **API Docs**: See "API Endpoints" section in Quick Reference
- **Database Schema**: See "Database Schema Reference" in Quick Reference
- **Utility Functions**: Import from `@/lib/marketplace/*`

### For Users
- **User Guide**: See "For Users" section in Quick Reference
- **SRP Guide**: See "SRP Formula Reference" in Quick Reference
- **Troubleshooting**: See "Troubleshooting" section in Quick Reference

### For Admins
- **Admin Features**: See "For Admins" section in Quick Reference
- **SRP Calculator**: See "SRP Calculator (Admin Only)" in Quick Reference
- **Rank Tables**: Complete reference in Quick Reference

## Credits & Acknowledgments

**Reference Implementation**: Kamposian marketplace (C:\Development\kamposian)
**Base Architecture**: HW_Website existing structure
**External APIs**: StarCitizen.tools Wiki API
**Pricing Model**: HouseWolf SRP V3.0

## Version History

### v1.0.0 (2025-11-28)
- Initial complete rewrite
- Wiki integration implemented
- SRP calculator added
- All API routes created
- Utility libraries built
- Documentation completed

## Contact & Support

For questions or issues:
1. Check documentation in this directory
2. Review testing checklist
3. Check rollback procedures if needed
4. Test in development environment first

---

## Quick Start

1. **Read**: `MARKETPLACE_REWRITE_SUMMARY.md` for complete feature list
2. **Reference**: `MARKETPLACE_QUICK_REFERENCE.md` while developing
3. **Test**: Use testing checklist in summary document
4. **Deploy**: Verify all tests pass before production

**Status**: ✅ Implementation Complete - Ready for Testing

**Next Step**: Run through testing checklist with real user accounts
