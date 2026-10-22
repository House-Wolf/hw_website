import { auth } from "@/lib/auth";
import {
  createRateLimitHeaders,
  getClientIp,
  getRateLimitIdentifier,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import {
  createBotServiceHeaders,
  createMarketplaceThreadPayload,
  getContactableMarketplaceListing,
} from "@/lib/marketplace/server";
import { devLog } from "@/lib/devLogger";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user;

  if (!user?.discordId) {
    return NextResponse.json({ error: "Sign in with Discord first." }, { status: 401 });
  }

  const identifier = getRateLimitIdentifier(user.id, getClientIp(req.headers));
  const rateLimitResult = await rateLimit(identifier, RATE_LIMITS.CONTACT);
  const rateLimitHeaders = createRateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many contact attempts. Please try again later." },
      { status: 429, headers: rateLimitHeaders }
    );
  }

  try {
    const body = (await req.json().catch(() => null)) as { listingId?: unknown } | null;
    const listingId = body?.listingId;

    if (typeof listingId !== "string") {
      return NextResponse.json(
        { error: "Missing listing ID" },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const listing = await getContactableMarketplaceListing(listingId);
    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found or unavailable" },
        { status: 404, headers: rateLimitHeaders }
      );
    }

    if (listing.sellerUserId === user.id || listing.seller.discordId === user.discordId) {
      return NextResponse.json(
        { error: "You cannot contact yourself" },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (!process.env.BOT_SERVICE_URL) {
      devLog.error("BOT_SERVICE_URL is not configured");
      return NextResponse.json(
        { error: "Marketplace messaging is offline" },
        { status: 503, headers: rateLimitHeaders }
      );
    }

    if (!process.env.BOT_SERVICE_TOKEN) {
      devLog.error("BOT_SERVICE_TOKEN is not configured");
      return NextResponse.json(
        { error: "Marketplace messaging is offline" },
        { status: 503, headers: rateLimitHeaders }
      );
    }

    const payload = createMarketplaceThreadPayload(listing, {
      discordId: user.discordId,
      discordUsername: user.discordUsername,
      name: user.name,
    });

    devLog.debug("Creating transaction thread for listing:", listing.id);

    const res = await fetch(
      new URL("/create-transaction-thread", process.env.BOT_SERVICE_URL).toString(),
      {
        method: "POST",
        headers: createBotServiceHeaders(),
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      devLog.error("Bot service error:", data);
      return NextResponse.json(
        { error: data.error || "Failed to create transaction thread" },
        { status: res.status, headers: rateLimitHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        method: data.method,
        message: data.message,
        threadUrl: data.threadUrl,
        threadName: data.threadName,
        inviteUrl: data.inviteUrl,
      },
      { headers: rateLimitHeaders }
    );
  } catch (error: unknown) {
    devLog.error("Contact seller error:", error);
    return NextResponse.json(
      { error: "Failed to send message to seller" },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}
