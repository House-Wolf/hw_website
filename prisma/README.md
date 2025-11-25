# House Wolf Database Schema

This directory contains the Prisma schema and migrations for the House Wolf project.

## Schema Overview

The database is organized into several domains:

### Core & Auth
- **users** - Discord-authenticated user accounts
- **discord_roles** - Discord role data synced from the server
- **user_roles** - Many-to-many mapping of users to Discord roles
- **permissions** - Internal site permissions (SITE_ADMIN, MERCENARY_APPROVE, etc.)
- **role_permissions** - Maps Discord roles to internal permissions

### Divisions & Ranks
- **divisions** - Main organizational divisions (TACOPS, LOCOPS, SPECOPS, etc.)
- **subdivisions** - Sub-units within divisions
- **ranks** - Rank structure with leadership/officer flags
- **division_allowed_roles** - Role-based division eligibility
- **subdivision_allowed_roles** - Role-based subdivision eligibility

### Mercenary Profiles
- **mercenary_profiles** - User dossiers with approval workflow
- **mercenary_profile_approval_history** - Audit trail for profile approvals/rejections

### Marketplace
- **marketplace_categories** - Hierarchical item categories
- **marketplace_listings** - User-created marketplace listings
- **marketplace_listing_images** - Images for listings
- **marketplace_user_status** - Marketplace suspension tracking
- **marketplace_listing_audit_log** - Audit trail for listing changes

### Global
- **audit_logs** - Site-wide audit trail
- **site_settings** - Key-value configuration storage

## Setup

1. **Set up your database connection** in `.env`:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/housewolf"
   ```

2. **Generate the Prisma Client**:
   ```bash
   npm run db:generate
   ```

3. **Create and apply migrations**:
   ```bash
   npm run db:migrate
   ```

   Or push schema changes without migrations (development):
   ```bash
   npm run db:push
   ```

4. **Explore your database** with Prisma Studio:
   ```bash
   npm run db:studio
   ```

## Using Prisma in the App

Import the Prisma client from the utility:

```typescript
import { prisma } from "@/lib/prisma";

// Example: Fetch all divisions
const divisions = await prisma.division.findMany({
  where: { isActive: true },
  orderBy: { sortOrder: "asc" },
  include: {
    subdivisions: true,
  },
});
```

## Enums and Status Values

While Prisma enums could be used, the schema uses string fields for flexibility. Use these values consistently:

### MercenaryProfile.status
- `DRAFT` - User is still editing
- `PENDING_REVIEW` - Submitted for approval
- `APPROVED` - Admin approved, visible publicly
- `REJECTED` - Admin rejected with reason

### MarketplaceListings.status
- `ACTIVE` - Live listing
- `PENDING_REVIEW` - Awaiting moderation
- `SOLD` - Marked as sold by user
- `HIDDEN` - Hidden by admin/user
- `DELETED` - Soft deleted
- `SUSPENDED` - User is suspended

### MarketplaceListings.condition
- `NEW` - Brand new item
- `USED` - Previously used
- `DAMAGED` - Has damage

## Common Queries

### Check User Permissions
```typescript
const userWithPermissions = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    roles: {
      include: {
        discordRole: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    },
  },
});
```

### Get Approved Mercenary Profiles by Division
```typescript
const profiles = await prisma.mercenaryProfile.findMany({
  where: {
    status: "APPROVED",
    isPublic: true,
    divisionId: divisionId,
  },
  include: {
    user: true,
    rank: true,
    division: true,
    subdivision: true,
  },
  orderBy: [
    { rank: { sortOrder: "asc" } },
    { characterName: "asc" },
  ],
});
```

### Active Marketplace Listings with Images
```typescript
const listings = await prisma.marketplaceListings.findMany({
  where: {
    status: "ACTIVE",
    deletedAt: null,
  },
  include: {
    seller: true,
    category: true,
    images: {
      orderBy: { sortOrder: "asc" },
    },
  },
  orderBy: { createdAt: "desc" },
});
```

## Migration Workflow

1. Modify `schema.prisma`
2. Run `npm run db:migrate` and give the migration a descriptive name
3. Prisma generates SQL and updates your database
4. Commit both the schema and migration files

## Best Practices

- Always use the `prisma` instance from `lib/prisma.ts`
- Use transactions for multi-table operations
- Leverage `include` for related data instead of multiple queries
- Add indexes for frequently queried fields (in future migrations)
- Use soft deletes (`deletedAt`) for important records
- Store structured metadata in `jsonb` fields when needed
