import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { validateCreateListingInput } from "@/lib/marketplace/validation";

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

    // Prisma schema is currently out of sync with the DB enums for status/visibility,
    // so use a raw insert with explicit enum casts to avoid conversion errors.
    const insertResults = (await prisma.$queryRaw`
      INSERT INTO "marketplace_listings"
        (
          "id",
          "seller_user_id",
          "title",
          "description",
          "category_id",
          "price",
          "currency",
          "quantity",
          "location",
          "status",
          "visibility",
          "view_count",
          "message_count",
          "created_at",
          "updated_at"
        )
      VALUES
        (
          gen_random_uuid(),
          ${session.user.id}::uuid,
          ${title},
          ${description},
          ${categoryId},
          ${price},
          'aUEC',
          ${quantity},
          ${location || null},
          'ACTIVE'::"ListingStatus",
          'PUBLIC'::"ListingVisibility",
          0,
          0,
          NOW(),
          NOW()
        )
      RETURNING *;
    `) as any[];

    const listing = insertResults[0];

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
