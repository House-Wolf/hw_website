import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const params = await context.params;
    const { id } = params;

    const isAdmin = session.user.permissions.includes(PERMISSIONS.MARKETPLACE_ADMIN);

    // Check if user is suspended (admins can bypass)
    if (!isAdmin) {
      const userStatus = await prisma.marketplaceUserStatus.findUnique({
        where: { userId: session.user.id },
      });

      if (userStatus?.isSuspended) {
        return NextResponse.json(
          { error: "Marketplace access suspended" },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { title, description, categoryId, price, quantity, location, imageUrl, status } = body;

    // Validation
    if (!title || !description || !categoryId || price == null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if listing exists and user owns it
    const existing = await prisma.marketplaceListings.findUnique({
      where: { id },
      select: { sellerUserId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    if (existing.sellerUserId !== session.user.id && !isAdmin) {
      return NextResponse.json(
        { error: "You can only edit your own listings" },
        { status: 403 }
      );
    }

    // Update listing
    const updated = await prisma.marketplaceListings.update({
      where: { id },
      data: {
        title: title.trim(),
        description: description.trim(),
        categoryId: parseInt(categoryId),
        price: parseFloat(price),
        quantity: quantity ? parseInt(quantity) : 1,
        location: location?.trim() || null,
        ...(status && { status }),
      },
    });

    // Handle image update (clear then recreate primary image)
    await prisma.marketplaceListingImage.deleteMany({
      where: { listingId: id },
    });

    if (imageUrl && imageUrl.trim()) {
      await prisma.marketplaceListingImage.create({
        data: {
          listingId: id,
          imageUrl: imageUrl.trim(),
          sortOrder: 0,
        },
      });
    }

    return NextResponse.json(
      { success: true, listing: updated },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Update listing error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update listing" },
      { status: 500 }
    );
  }
}
