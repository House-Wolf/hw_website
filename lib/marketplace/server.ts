import "server-only";
import { ListingStatus, ListingVisibility } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const MARKETPLACE_LISTING_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isMarketplaceListingId(value: unknown): value is string {
  return typeof value === "string" && MARKETPLACE_LISTING_ID_PATTERN.test(value);
}

export async function getContactableMarketplaceListing(listingId: string) {
  if (!isMarketplaceListingId(listingId)) return null;

  return prisma.marketplaceListings.findFirst({
    where: {
      id: listingId,
      deletedAt: null,
      status: ListingStatus.ACTIVE,
      visibility: ListingVisibility.PUBLIC,
      seller: {
        isActive: true,
      },
    },
    select: {
      id: true,
      sellerUserId: true,
      title: true,
      price: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: {
          imageUrl: true,
        },
      },
      seller: {
        select: {
          discordId: true,
          discordUsername: true,
          discordDisplayName: true,
        },
      },
    },
  });
}

export type ContactableMarketplaceListing = NonNullable<
  Awaited<ReturnType<typeof getContactableMarketplaceListing>>
>;

export function getMarketplaceSellerName(listing: ContactableMarketplaceListing) {
  return listing.seller.discordDisplayName || listing.seller.discordUsername || "Seller";
}

export function getMarketplaceListingPrice(listing: ContactableMarketplaceListing) {
  return Number(listing.price);
}

export function createMarketplaceThreadPayload(
  listing: ContactableMarketplaceListing,
  buyer: {
    discordId: string;
    discordUsername?: string | null;
    name?: string | null;
  }
) {
  const buyerName = buyer.discordUsername || buyer.name || "Anonymous";

  return {
    buyerId: buyer.discordId,
    sellerId: listing.seller.discordId,
    buyerName,
    buyerDiscordTag: buyerName,
    sellerName: getMarketplaceSellerName(listing),
    itemTitle: listing.title,
    itemPrice: getMarketplaceListingPrice(listing),
    itemImageUrl: listing.images[0]?.imageUrl ?? null,
  };
}
