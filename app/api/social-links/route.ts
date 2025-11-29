import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") || "APPROVED";
    const platform = searchParams.get("platform");

    let where: any = {};

    // If status is "all", fetch the current user's own links regardless of status
    if (status === "all") {
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      where.userId = session.user.id;
    } else {
      where.status = status;
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
