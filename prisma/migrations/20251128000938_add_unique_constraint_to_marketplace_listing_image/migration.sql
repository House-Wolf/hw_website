/*
  Warnings:

  - The `status` column on the `marketplace_listings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `visibility` column on the `marketplace_listings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `mercenary_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[listing_id,sort_order]` on the table `marketplace_listing_images` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `action` on the `mercenary_profile_approval_history` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProfileAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'REVERTED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLD', 'EXPIRED', 'DELETED');

-- CreateEnum
CREATE TYPE "ListingVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'HIDDEN');

-- AlterTable
ALTER TABLE "marketplace_listings" DROP COLUMN "status",
ADD COLUMN     "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
DROP COLUMN "visibility",
ADD COLUMN     "visibility" "ListingVisibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "mercenary_profile_approval_history" DROP COLUMN "action",
ADD COLUMN     "action" "ProfileAction" NOT NULL;

-- AlterTable
ALTER TABLE "mercenary_profiles" DROP COLUMN "status",
ADD COLUMN     "status" "ProfileStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_listing_images_listing_id_sort_order_key" ON "marketplace_listing_images"("listing_id", "sort_order");
