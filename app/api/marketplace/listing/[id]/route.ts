import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const listing = await prisma.marketplaceListings.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          orderBy: { sortOrder: "asc" },
        },
        seller: {
          select: {
            discordUsername: true,
            discordDisplayName: true,
          },
        },
      },
    });

    if (!listing || listing.deletedAt) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    const serialized = {
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
    };

    return NextResponse.json({ listing: serialized });
  } catch (error: any) {
    console.error("Fetch listing error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch listing" },
      { status: 500 }
    );
  }
}
