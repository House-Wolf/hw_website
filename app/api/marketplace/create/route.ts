import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized - Please sign in" },
      { status: 401 }
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
    const title = data.get("title")?.toString();
    const description = data.get("description")?.toString();
    const categoryId = data.get("categoryId")?.toString();
    const price = data.get("price")?.toString();
    const quantity = data.get("quantity")?.toString();
    const location = data.get("location")?.toString();
    const imageUrl = data.get("imageUrl")?.toString();

    // Validation
    if (!title || !description || !categoryId || !price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create listing
    const listing = await prisma.marketplaceListings.create({
      data: {
        sellerUserId: session.user.id,
        title: title.trim(),
        description: description.trim(),
        categoryId: parseInt(categoryId),
        price: parseFloat(price),
        currency: "aUEC",
        quantity: quantity ? parseInt(quantity) : 1,
        location: location?.trim() || null,
        status: "ACTIVE",
        visibility: "PUBLIC",
      },
    });

    // Add image if provided
    if (imageUrl && imageUrl.trim()) {
      await prisma.marketplaceListingImage.create({
        data: {
          listingId: listing.id,
          imageUrl: imageUrl.trim(),
          sortOrder: 0,
        },
      });
    }

    return NextResponse.json(
      { success: true, listing },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error creating listing:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create listing" },
      { status: 500 }
    );
  }
}
