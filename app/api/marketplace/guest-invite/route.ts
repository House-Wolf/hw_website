import { NextRequest, NextResponse } from "next/server";
import { createTemporaryChannelInvite } from "@/lib/discord";

/**
 * Issues a scoped, temporary Discord invite for marketplace guests.
 * Note: We deliberately avoid logging the raw invite URL.
 */
export async function POST(_request: NextRequest) {
  try {
    const marketplaceChannelId = process.env.MARKETPLACE_CHANNEL_ID;

    if (!marketplaceChannelId) {
      console.error("MARKETPLACE_CHANNEL_ID not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const inviteUrl = await createTemporaryChannelInvite(marketplaceChannelId);

    if (!inviteUrl) {
      console.error("Failed to create temporary invite for guest");
      return NextResponse.json(
        { error: "Failed to generate Discord invite" },
        { status: 500 }
      );
    }

    // Do not log or expose the invite URL
    console.log("Marketplace guest invite issued");

    return NextResponse.json({
      success: true,
      inviteUrl,
      message: "Please join the Discord server to contact sellers",
    });
  } catch (e: unknown) {
    console.error("Guest invite error:", e);
    return NextResponse.json(
      { error: "Failed to generate invite" },
      { status: 500 }
    );
  }
}
