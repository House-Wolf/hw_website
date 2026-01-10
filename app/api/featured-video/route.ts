import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { rateLimit, RATE_LIMITS, getRateLimitIdentifier, getClientIp, createRateLimitHeaders } from "@/lib/rate-limit";

/**
 * @component GET /api/featured-video
 * @description Fetch the active featured video
 * @returns The active featured video or null if none exists
 * @author House Wolf Dev Team
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    // Rate limiting for fetching featured video
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

    // Fetch the most recent active featured video
    const featuredVideo = await prisma.featured_videos.findFirst({
      where: {
        is_active: true,
      },
      orderBy: {
        updated_at: "desc",
      },
    });

    if (!featuredVideo) {
      return NextResponse.json(null);
    }

    // Transform to match frontend interface
    const response = {
      youtubeId: featuredVideo.youtube_id,
      title: featuredVideo.title,
      thumbnail: featuredVideo.thumbnail || "/images/video-thumb.jpg",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching featured video:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured video" },
      { status: 500 }
    );
  }
}

/**
 * @component PUT /api/featured-video
 * @description Update the featured video (SITE_ADMIN only)
 * @returns The updated featured video
 * @author House Wolf Dev Team
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for SITE_ADMIN permission
    const hasSiteAdmin = await hasPermission(PERMISSIONS.SITE_ADMIN);
    if (!hasSiteAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limiting for updating featured video
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
    const { youtubeId, title, thumbnail } = body;

    if (!youtubeId || !title) {
      return NextResponse.json(
        { error: "Missing required fields: youtubeId and title are required" },
        { status: 400 }
      );
    }

    // Validate YouTube ID format (basic validation)
    if (typeof youtubeId !== "string" || youtubeId.length < 5 || youtubeId.length > 20) {
      return NextResponse.json(
        { error: "Invalid YouTube ID format" },
        { status: 400 }
      );
    }

    // Deactivate all existing featured videos
    await prisma.featured_videos.updateMany({
      where: {
        is_active: true,
      },
      data: {
        is_active: false,
      },
    });

    // Create new featured video
    const featuredVideo = await prisma.featured_videos.create({
      data: {
        youtube_id: youtubeId,
        title: title,
        thumbnail: thumbnail || null,
        is_active: true,
        updated_by: session.user.id,
        updated_at: new Date(),
      },
    });

    // Transform to match frontend interface
    const response = {
      youtubeId: featuredVideo.youtube_id,
      title: featuredVideo.title,
      thumbnail: featuredVideo.thumbnail || "/images/video-thumb.jpg",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating featured video:", error);
    return NextResponse.json(
      { error: "Failed to update featured video" },
      { status: 500 }
    );
  }
}
