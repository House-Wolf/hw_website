import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { Prisma } from "@prisma/client";

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
    console.log('Update API received body:', JSON.stringify(body, null, 2));

    const { title, description, categoryId, price, quantity, location, imageUrl, status } = body;

    // Validation - ensure at least title and description are provided
    if (title !== undefined && !title.trim()) {
      return NextResponse.json(
        { error: "Title cannot be empty" },
        { status: 400 }
      );
    }

    if (description !== undefined && !description.trim()) {
      return NextResponse.json(
        { error: "Description cannot be empty" },
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

    // Build and execute SQL update query using raw SQL (needed for enum types)
    const setParts: any[] = [];

    if (title !== undefined) {
      setParts.push(Prisma.sql`"title" = ${title.trim()}`);
    }
    if (description !== undefined) {
      setParts.push(Prisma.sql`"description" = ${description.trim()}`);
    }
    if (categoryId !== undefined) {
      setParts.push(Prisma.sql`"category_id" = ${parseInt(categoryId)}`);
    }
    if (price !== undefined) {
      setParts.push(Prisma.sql`"price" = ${parseFloat(price)}`);
    }
    if (quantity !== undefined) {
      setParts.push(Prisma.sql`"quantity" = ${parseInt(quantity)}`);
    }
    if (location !== undefined) {
      setParts.push(Prisma.sql`"location" = ${location?.trim() || null}`);
    }

    // Always update the timestamp
    setParts.push(Prisma.sql`"updated_at" = NOW()`);

    console.log('Updating listing with', setParts.length, 'fields');

    // Build the complete query
    const query = Prisma.sql`
      UPDATE "marketplace_listings"
      SET ${Prisma.join(setParts, ', ')}
      WHERE "id" = ${id}::uuid
    `;

    console.log('Executing query...');

    // Execute the update
    await prisma.$executeRaw(query);

    console.log('Update successful');

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
      { success: true, message: 'Listing updated successfully' },
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
