import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const listing = await prisma.marketplaceListings.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
      seller: {
        select: {
          discordUsername: true,
          discordDisplayName: true,
        },
      },
    },
  });

  if (!listing || listing.deletedAt) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  return NextResponse.json({
    listing: {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price.toNumber(),
      quantity: listing.quantity,
      location: listing.location,
      status: listing.status,
      category: listing.category.name,
      categoryId: listing.category.id,
      imageUrl: listing.images[0]?.imageUrl ?? null,
      sellerUsername:
        listing.seller.discordDisplayName ??
        listing.seller.discordUsername,
      createdAt: listing.createdAt.toISOString(),
    },
  });
}
