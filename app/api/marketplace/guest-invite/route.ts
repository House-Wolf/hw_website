import { NextRequest, NextResponse } from "next/server";
import { createTemporaryChannelInvite } from "@/lib/discord";
import { rateLimit, RATE_LIMITS, getRateLimitIdentifier, getClientIp, createRateLimitHeaders } from "@/lib/rate-limit";
import { devLog } from "@/lib/devLogger";

/**
 * Issues a scoped, temporary Discord invite for marketplace guests.
 * Note: We deliberately avoid logging the raw invite URL.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - use IP-based limiting for unauthenticated requests
    const identifier = getRateLimitIdentifier(null, getClientIp(request.headers));
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

    const marketplaceChannelId = process.env.MARKETPLACE_CHANNEL_ID;

    if (!marketplaceChannelId) {
      devLog.error("MARKETPLACE_CHANNEL_ID not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const inviteUrl = await createTemporaryChannelInvite(marketplaceChannelId);

    if (!inviteUrl) {
      devLog.error("Failed to create temporary invite for guest");
      return NextResponse.json(
        { error: "Failed to generate Discord invite" },
        { status: 500 }
      );
    }

    // Do not log or expose the invite URL
    devLog.info("Marketplace guest invite issued");

    return NextResponse.json({
      success: true,
      inviteUrl,
      message: "Please join the Discord server to contact sellers",
    });
  } catch (e: unknown) {
    devLog.error("Guest invite error:", e);
    return NextResponse.json(
      { error: "Failed to generate invite" },
      { status: 500 }
    );
  }
}
