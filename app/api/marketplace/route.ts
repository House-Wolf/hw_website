import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ListingStatus } from '@prisma/client';
import { rateLimit, RATE_LIMITS, getRateLimitIdentifier, getClientIp, createRateLimitHeaders } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    // Rate limiting for public marketplace listing
    const identifier = getRateLimitIdentifier(
      null,
      getClientIp(req.headers)
    );
    const rateLimitResult = await rateLimit(identifier, RATE_LIMITS.PUBLIC);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Use Prisma ORM for type-safe queries
    const listings = await prisma.marketplaceListings.findMany({
      where: {
        deletedAt: null,
        status: ListingStatus.ACTIVE,
      },
      include: {
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
        seller: {
          select: {
            discordId: true,
            discordUsername: true,
            discordDisplayName: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
          select: {
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const serialized = listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      quantity: listing.quantity,
      price: parseFloat(listing.price.toString()),
      category: listing.category.name,
      categorySlug: listing.category.slug,
      discordId: listing.seller.discordId,
      imageUrl: listing.images[0]?.imageUrl || null,
      sellerUsername: listing.seller.discordDisplayName || listing.seller.discordUsername,
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketplace listings' },
      { status: 500 }
    );
  }
}
