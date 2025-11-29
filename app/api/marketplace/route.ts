import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const listingsRaw = await prisma.marketplaceListings.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
        seller: {
          select: {
            discordId: true,
            discordUsername: true,
            discordDisplayName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Serialize for JSON (convert Decimal to number)
    const listings = listingsRaw.map(listing => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      quantity: listing.quantity,
      price: listing.price.toNumber(),
      category: listing.category.name,
      categorySlug: listing.category.slug,
      discordId: listing.seller.discordId,
      imageUrl: listing.images[0]?.imageUrl,
      images: listing.images,
      sellerUsername: listing.seller.discordDisplayName || listing.seller.discordUsername,
    }));

    return NextResponse.json(listings);
  } catch (error) {
    console.error('Error fetching listings:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
