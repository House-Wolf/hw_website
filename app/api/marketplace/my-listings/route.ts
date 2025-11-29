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

    // Prisma schema is out-of-sync with DB enums; use raw query and cast enum fields
    const listings = (await prisma.$queryRaw`
      SELECT
        l.id,
        l.title,
        l.description,
        l.price,
        l.quantity,
        l.location,
        l.status::text AS status,
        c.name AS category,
        c.id AS category_id,
        (
          SELECT image_url
          FROM marketplace_listing_images i
          WHERE i.listing_id = l.id
          ORDER BY i.sort_order ASC
          LIMIT 1
        ) AS image_url,
        l.created_at
      FROM marketplace_listings l
      JOIN marketplace_categories c ON c.id = l.category_id
      WHERE l.seller_user_id = ${session.user.id}::uuid
        AND l.deleted_at IS NULL
      ORDER BY l.created_at DESC
    `) as any[];

    const serialized = listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: parseFloat(listing.price),
      quantity: listing.quantity,
      location: listing.location,
      status: listing.status,
      category: listing.category,
      categoryId: listing.category_id,
      imageUrl: listing.image_url || null,
      createdAt: new Date(listing.created_at).toISOString(),
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
