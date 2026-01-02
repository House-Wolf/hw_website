import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rateLimit, RATE_LIMITS, getRateLimitIdentifier, getClientIp, createRateLimitHeaders } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Rate limiting for fetching user's own listings
    const identifier = getRateLimitIdentifier(
      session.user.id,
      getClientIp(req.headers)
    );
    const rateLimitResult = await rateLimit(identifier, RATE_LIMITS.API_READ);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
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
    `) as Array<{
      id: string;
      title: string;
      description: string;
      price: string;
      quantity: number;
      location: string;
      status: string;
      category: string;
      category_id: string;
      image_url: string | null;
      created_at: string;
    }>;

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
  } catch (error: unknown) {
    console.error("Fetch my listings error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch listings";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
