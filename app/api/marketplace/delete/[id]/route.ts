import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

export async function DELETE(
  _req: Request,
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
        { error: "You can only delete your own listings" },
        { status: 403 }
      );
    }

    // Prisma enum mismatch with DB: perform raw update with explicit enum cast
    const deleteResult = await prisma.$queryRaw<{ id: string }[]>`
      UPDATE "marketplace_listings"
      SET "deleted_at" = NOW(),
          "status" = 'DELETED'::"ListingStatus"
      WHERE id = ${id}::uuid
      RETURNING id;
    `;

    if (!deleteResult.length) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Delete listing error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete listing";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
