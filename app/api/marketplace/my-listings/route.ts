import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch user's listings
    const listings = await prisma.marketplaceListings.findMany({
      where: {
        sellerUserId: session.user.id,
        deletedAt: null,
      },
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
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Serialize for JSON
    const serialized = listings.map(listing => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price.toNumber(),
      quantity: listing.quantity,
      location: listing.location,
      status: listing.status,
      category: listing.category.name,
      categoryId: listing.category.id,
      imageUrl: listing.images[0]?.imageUrl || null,
      createdAt: listing.createdAt.toISOString(),
    }));

    return NextResponse.json(
      { listings: serialized },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Fetch my listings error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch listings" },
      { status: 500 }
    );
  }
}
