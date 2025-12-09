import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import { validateUpdateListingInput } from "@/lib/marketplace/validation";
import { rateLimit, RATE_LIMITS, getRateLimitIdentifier, getClientIp, createRateLimitHeaders } from "@/lib/rate-limit";

export async function PUT(
  req: NextRequest,
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

    // Rate limiting for marketplace updates
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
    // Avoid verbose logging of user-supplied payloads to reduce data leakage

    const validation = validateUpdateListingInput(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { title, description, categoryId, price, quantity, location, imageUrl } =
      validation.parsed;

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

        await prisma.$transaction(async (tx) => {

          // Build and execute SQL update query using raw SQL (needed for enum types)

          const setParts = [];

    

          if (title !== undefined) {

            setParts.push(Prisma.sql`"title" = ${title.trim()}`);

          }

          if (description !== undefined) {

            setParts.push(Prisma.sql`"description" = ${description.trim()}`);

          }

          if (categoryId !== undefined) {

            setParts.push(Prisma.sql`"category_id" = ${categoryId}`);

          }

          if (price !== undefined) {

            setParts.push(Prisma.sql`"price" = ${price}`);

          }

          if (quantity !== undefined) {

            setParts.push(Prisma.sql`"quantity" = ${quantity}`);

          }

          if (location !== undefined) {

            setParts.push(Prisma.sql`"location" = ${location?.trim() || null}`);

          }

    

          // Always update the timestamp

          setParts.push(Prisma.sql`"updated_at" = NOW()`);

    

          // Build the complete query

          const query = Prisma.sql`

            UPDATE "marketplace_listings"

            SET ${Prisma.join(setParts, ", ")}

            WHERE "id" = ${id}::uuid

          `;

          // Execute the update

          await tx.$executeRaw(query);

    

          // Handle image update (only when provided)

          if (imageUrl !== undefined) {

            await tx.marketplaceListingImage.deleteMany({

              where: { listingId: id },

            });

    

            if (typeof imageUrl === "string" && imageUrl.trim()) {

              await tx.marketplaceListingImage.create({

                data: {

                  listingId: id,

                  imageUrl: imageUrl.trim(),

                  sortOrder: 0,

                },

              });

            }

          }

        });

    

        return NextResponse.json(

          { success: true, message: "Listing updated successfully" },

          { status: 200 }

        );

      } catch (error: unknown) {

        console.error("Update listing error:", error);

        const message = error instanceof Error ? error.message : "Failed to update listing";

        return NextResponse.json(

          { error: message },

          { status: 500 }

        );

      }

    }
