import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Prisma schema is out-of-sync with DB enums; use a raw query to avoid enum casting issues
    const listings = (await prisma.$queryRaw`
      SELECT
        l.id,
        l.title,
        l.description,
        l.quantity,
        l.price,
        c.name AS category,
        c.slug AS category_slug,
        u.discord_id,
        COALESCE(u.discord_display_name, u.discord_username) AS seller_username,
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
      JOIN users u ON u.id = l.seller_user_id
      WHERE l.deleted_at IS NULL
        AND l.status = 'ACTIVE'::"ListingStatus"
      ORDER BY l.created_at DESC;
    `) as any[];

    const serialized = listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      quantity: listing.quantity,
      price: parseFloat(listing.price),
      category: listing.category,
      categorySlug: listing.category_slug,
      discordId: listing.discord_id,
      imageUrl: listing.image_url,
      sellerUsername: listing.seller_username,
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Error fetching listings:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
