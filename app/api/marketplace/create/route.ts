import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateCreateListingInput } from "@/lib/marketplace/validation";
import { ListingStatus, ListingVisibility } from "@prisma/client";
import { rateLimit, RATE_LIMITS, getRateLimitIdentifier, getClientIp, createRateLimitHeaders } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized - Please sign in" },
      { status: 401 }
    );
  }

  // Rate limiting for marketplace creation
  const identifier = getRateLimitIdentifier(
    session.user.id,
    getClientIp(req.headers)
  );
  const rateLimitResult = await rateLimit(identifier, RATE_LIMITS.API_WRITE);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult),
      }
    );
  }

  try {
    // Check if user is suspended
    const userStatus = await prisma.marketplaceUserStatus.findUnique({
      where: { userId: session.user.id },
    });

    if (userStatus?.isSuspended) {
      return NextResponse.json(
        { error: "Marketplace access suspended - Check your settings for details" },
        { status: 403 }
      );
    }

    const data = await req.formData();
    const validation = validateCreateListingInput({
      title: data.get("title")?.toString() ?? "",
      description: data.get("description")?.toString() ?? "",
      categoryId: data.get("categoryId")?.toString() ?? "",
      price: data.get("price")?.toString() ?? "",
      quantity: data.get("quantity")?.toString(),
      location: data.get("location")?.toString() ?? "",
      imageUrl: data.get("imageUrl")?.toString() ?? "",
    });

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const {
      title,
      description,
      categoryId,
      price,
      quantity,
      location,
      imageUrl,
    } = validation.parsed;

    const listing = await prisma.$transaction(async (tx) => {
      const newListing = await tx.marketplaceListings.create({
        data: {
          sellerUserId: session.user.id,
          title,
          description,
          categoryId,
          price,
          currency: "aUEC",
          quantity,
          location,
          status: ListingStatus.ACTIVE,
          visibility: ListingVisibility.PUBLIC,
        },
      });

      if (imageUrl && imageUrl.trim()) {
        await tx.marketplaceListingImage.create({
          data: {
            listingId: newListing.id,
            imageUrl: imageUrl.trim(),
            sortOrder: 0,
          },
        });
      }

      return newListing;
    });

    return NextResponse.json(
      { success: true, listing },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Error creating listing:", err);
    const message = err instanceof Error ? err.message : "Failed to create listing";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
