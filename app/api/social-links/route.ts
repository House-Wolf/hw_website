import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { rateLimit, RATE_LIMITS, getRateLimitIdentifier, getClientIp, createRateLimitHeaders } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    // Rate limiting for fetching social links
    const identifier = getRateLimitIdentifier(
      session?.user?.id,
      getClientIp(req.headers)
    );
    const rateLimitResult = await rateLimit(identifier, RATE_LIMITS.API_READ);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: createRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const statusParam = (searchParams.get("status") || "APPROVED").toUpperCase();
    const platform = searchParams.get("platform");

    const validStatuses = new Set(["APPROVED", "PENDING", "REJECTED"]);
    if (!validStatuses.has(statusParam)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const where: any = { status: statusParam };

    // Public may only access approved links; other statuses require dossier admin
    const isApprovedOnly = statusParam === "APPROVED";
    if (!isApprovedOnly) {
      const canView = session?.user && (await hasPermission(PERMISSIONS.DOSSIER_ADMIN));
      if (!canView) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (platform) {
      where.platform = platform;
    }

    const socialLinks = await prisma.socialLink.findMany({
      where,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(socialLinks);
  } catch (error) {
    console.error("Error fetching social links:", error);
    return NextResponse.json(
      { error: "Failed to fetch social links" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting for creating social links
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
    const { platform, channelName, channelUrl, description } = body;

    if (!platform || !channelName || !channelUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate platform
    if (!["TWITCH", "YOUTUBE", "INSTAGRAM"].includes(platform)) {
      return NextResponse.json(
        { error: "Invalid platform" },
        { status: 400 }
      );
    }

    // Check if user already has a pending or approved link for this platform
    const existingLink = await prisma.socialLink.findFirst({
      where: {
        userId: session.user.id,
        platform,
        status: { in: ["PENDING", "APPROVED"] },
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: `You already have a ${platform.toLowerCase()} link submitted` },
        { status: 400 }
      );
    }

    const socialLink = await prisma.socialLink.create({
      data: {
        userId: session.user.id,
        platform,
        channelName,
        channelUrl,
        description,
        status: "PENDING",
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

    return NextResponse.json(socialLink, { status: 201 });
  } catch (error) {
    console.error("Error creating social link:", error);
    return NextResponse.json(
      { error: "Failed to create social link" },
      { status: 500 }
    );
  }
}
