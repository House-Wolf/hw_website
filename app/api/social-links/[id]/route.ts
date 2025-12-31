import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { rateLimit, RATE_LIMITS, getRateLimitIdentifier, getClientIp, createRateLimitHeaders } from "@/lib/rate-limit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting for updating social links
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

    const body = await req.json();
    const { action, rejectionReason } = body;

    // Check if user has permission to approve/reject (Captain or above)
    const canManage = await hasPermission("DOSSIER_ADMIN");
    if (!canManage) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const socialLink = await (prisma).socialLink.findUnique({
      where: { id },
    });

    if (!socialLink) {
      return NextResponse.json(
        { error: "Social link not found" },
        { status: 404 }
      );
    }

    if (socialLink.status !== "PENDING") {
      return NextResponse.json(
        { error: "Social link has already been processed" },
        { status: 400 }
      );
    }

    let updatedLink;

    if (action === "approve") {
      updatedLink = await (prisma).socialLink.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedBy: session.user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              discordUsername: true,
              avatarUrl: true,
            },
          },
        },
      });
    } else if (action === "reject") {
      if (!rejectionReason) {
        return NextResponse.json(
          { error: "Rejection reason is required" },
          { status: 400 }
        );
      }

      updatedLink = await (prisma).socialLink.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
          rejectedBy: session.user.id,
          rejectionReason,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              discordUsername: true,
              avatarUrl: true,
            },
          },
        },
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    return NextResponse.json(updatedLink);
  } catch (error) {
    console.error("Error updating social link:", error);
    return NextResponse.json(
      { error: "Failed to update social link" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting for deleting social links
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

    const { id } = await params;
    const socialLink = await (prisma).socialLink.findUnique({
      where: { id },
    });

    if (!socialLink) {
      return NextResponse.json(
        { error: "Social link not found" },
        { status: 404 }
      );
    }

    // Users can delete their own links, or Captains+ can delete any link
    const canManage = await hasPermission("DOSSIER_ADMIN");
    if (socialLink.userId !== session.user.id && !canManage) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    await (prisma).socialLink.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting social link:", error);
    return NextResponse.json(
      { error: "Failed to delete social link" },
      { status: 500 }
    );
  }
}
