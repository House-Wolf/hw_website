/*
  FIXED MIGRATION — SAFE ENUM CONVERSION (NO DATA LOSS)
*/

-- Create enums
CREATE TYPE "ProfileStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ProfileAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'REVERTED');
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLD', 'EXPIRED', 'DELETED');
CREATE TYPE "ListingVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'HIDDEN');

----------------------------------------------------------
-- marketplace_listings.status : TEXT → ListingStatus
----------------------------------------------------------
ALTER TABLE "marketplace_listings"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "marketplace_listings"
  ALTER COLUMN "status"
  TYPE "ListingStatus"
  USING
    CASE
      WHEN status = 'DRAFT' THEN 'DRAFT'::"ListingStatus"
      WHEN status = 'ACTIVE' THEN 'ACTIVE'::"ListingStatus"
      WHEN status = 'SOLD' THEN 'SOLD'::"ListingStatus"
      WHEN status = 'EXPIRED' THEN 'EXPIRED'::"ListingStatus"
      WHEN status = 'DELETED' THEN 'DELETED'::"ListingStatus"
      ELSE 'DRAFT'::"ListingStatus"  -- fallback
    END;

ALTER TABLE "marketplace_listings"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';

----------------------------------------------------------
-- marketplace_listings.visibility : TEXT → ListingVisibility
----------------------------------------------------------
ALTER TABLE "marketplace_listings"
  ALTER COLUMN "visibility" DROP DEFAULT;

ALTER TABLE "marketplace_listings"
  ALTER COLUMN "visibility"
  TYPE "ListingVisibility"
  USING
    CASE
      WHEN visibility = 'PUBLIC' THEN 'PUBLIC'::"ListingVisibility"
      WHEN visibility = 'PRIVATE' THEN 'PRIVATE'::"ListingVisibility"
      WHEN visibility = 'HIDDEN' THEN 'HIDDEN'::"ListingVisibility"
      ELSE 'PUBLIC'::"ListingVisibility"
    END;

ALTER TABLE "marketplace_listings"
  ALTER COLUMN "visibility" SET DEFAULT 'PUBLIC';

----------------------------------------------------------
-- mercenary_profile_approval_history.action : TEXT → ProfileAction
----------------------------------------------------------
ALTER TABLE "mercenary_profile_approval_history"
  ALTER COLUMN "action"
  TYPE "ProfileAction"
  USING
    CASE
      WHEN action = 'SUBMITTED' THEN 'SUBMITTED'::"ProfileAction"
      WHEN action = 'APPROVED' THEN 'APPROVED'::"ProfileAction"
      WHEN action = 'REJECTED' THEN 'REJECTED'::"ProfileAction"
      WHEN action = 'REVERTED' THEN 'REVERTED'::"ProfileAction"
      ELSE 'SUBMITTED'::"ProfileAction"
    END;

----------------------------------------------------------
-- mercenary_profiles.status : keep as TEXT (fix)
----------------------------------------------------------

-- remove default before type change
ALTER TABLE "mercenary_profiles"
  ALTER COLUMN "status" DROP DEFAULT;

-- convert enum → text
ALTER TABLE "mercenary_profiles"
  ALTER COLUMN "status" TYPE TEXT
  USING status::TEXT;

-- restore default
ALTER TABLE "mercenary_profiles"
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- remove unused enum type if it exists
DROP TYPE IF EXISTS "ProfileStatus";


----------------------------------------------------------
-- Add featured_videos table
----------------------------------------------------------
CREATE TABLE "featured_videos" (
    "id" SERIAL NOT NULL,
    "youtube_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnail" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "featured_videos_pkey" PRIMARY KEY ("id")
);

----------------------------------------------------------
-- Add marketplace_listing_images unique constraint
----------------------------------------------------------
CREATE UNIQUE INDEX "marketplace_listing_images_listing_id_sort_order_key"
  ON "marketplace_listing_images"("listing_id", "sort_order");
