import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  RATE_LIMITS,
  createRateLimitHeaders,
  getClientIp,
  getRateLimitIdentifier,
  rateLimit,
} from "@/lib/rate-limit";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  let rateLimitResult: { success: boolean, limit: number, remaining: number, reset: number } = { success: true, limit: 0, remaining: 0, reset: 0 };
  
  try {
    // Rate limiting for public marketplace listing fetches
    const identifier = getRateLimitIdentifier(
      null,
      getClientIp(request.headers)
    );
    rateLimitResult = await rateLimit(identifier, RATE_LIMITS.PUBLIC);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || `${DEFAULT_LIMIT}`, 10), 1),
      MAX_LIMIT
    );
    const offset = (page - 1) * limit;
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sortParam = searchParams.get("sort") || "newest";

    const whereClauses: Prisma.Sql[] = [
      Prisma.sql`l.deleted_at IS NULL`,
      Prisma.sql`l.status = 'ACTIVE'::"ListingStatus"`,
      Prisma.sql`l.visibility = 'PUBLIC'::"ListingVisibility"`,
    ];

    if (category && category.toLowerCase() !== "all") {
      whereClauses.push(
        Prisma.sql`(LOWER(c.name) = ${category.toLowerCase()} OR LOWER(c.slug) = ${category.toLowerCase()})`
      );
    }

    if (search) {
      const term = `%${search.trim()}%`;
      whereClauses.push(
        Prisma.sql`(l.title ILIKE ${term} OR l.description ILIKE ${term})`
      );
    }

    const where = Prisma.sql`WHERE ${Prisma.join(
      whereClauses,
      ' AND '
    )}`;

    let orderBy = Prisma.sql`l.created_at DESC`;
    if (sortParam === "price-asc") {
      orderBy = Prisma.sql`l.price ASC, l.created_at DESC`;
    } else if (sortParam === "price-desc") {
      orderBy = Prisma.sql`l.price DESC, l.created_at DESC`;
    }

    const totalResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM marketplace_listings l
      JOIN marketplace_categories c ON c.id = l.category_id
      ${where}
    `;
    const totalItems = Number(totalResult?.[0]?.count ?? 0);

    const fullSelect = Prisma.sql`
      SELECT
        l.id,
        l.title,
        l.description,
        l.price,
        l.quantity,
        l.created_at,
        c.name AS category,
        c.slug AS category_slug,
        u.discord_id,
        COALESCE(u.discord_display_name, u.discord_username) AS seller_username,
        i.image_url
      FROM marketplace_listings l
      JOIN marketplace_categories c ON c.id = l.category_id
      JOIN users u ON u.id = l.seller_user_id
      LEFT JOIN LATERAL (
        SELECT image_url
        FROM marketplace_listing_images
        WHERE listing_id = l.id
        ORDER BY sort_order ASC
        LIMIT 1
      ) i ON true
    `;
    
    // Stitch all pieces together using Prisma.join to prevent serialization error
    const fullQuery = Prisma.join([
      fullSelect,
      where,
      Prisma.sql`ORDER BY ${orderBy}`, 
      Prisma.sql`LIMIT ${limit} OFFSET ${offset}`
    ], ' ');

    const listings = await prisma.$queryRaw<any>(fullQuery);

    const serialized = (listings as any[]).map((listing) => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: parseFloat(listing.price),
      quantity: listing.quantity,
      category: listing.category,
      categorySlug: listing.category_slug,
      discordId: listing.discord_id,
      imageUrl: listing.image_url || null,
      sellerUsername: listing.seller_username,
      createdAt: new Date(listing.created_at).toISOString(),
    }));

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return NextResponse.json({
      listings: serialized,
      totalItems,
      totalPages,
      currentPage: page,
      perPage: limit,
    }, { headers: createRateLimitHeaders(rateLimitResult) });
  } catch (error) {
    console.error("Error fetching marketplace listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }
}