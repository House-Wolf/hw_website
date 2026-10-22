import { auth } from "@/lib/auth";
import {
  createRateLimitHeaders,
  getClientIp,
  getRateLimitIdentifier,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { getContactableMarketplaceListing } from "@/lib/marketplace/server";
import { contactMarketplaceSeller, MarketplaceMessagingError } from "@/lib/marketplace/messaging";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user;

  if (!user?.discordId) {
    return NextResponse.json({ error: "Sign in with Discord first." }, { status: 401 });
  }

  if (user.isActive === false) return NextResponse.json({ error: "Your account cannot contact sellers." }, { status: 403 });
  if (req.headers.get("origin") !== req.nextUrl.origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

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

    const result = await contactMarketplaceSeller(listing, {
      discordId: user.discordId,
      discordUsername: user.discordUsername,
      name: user.name,
    });
    return NextResponse.json(result, { headers: rateLimitHeaders });
  } catch (error: unknown) {
    console.error("Contact seller failed", error instanceof Error ? error.message : "Unknown failure");
    return NextResponse.json(
      { error: error instanceof MarketplaceMessagingError ? error.message : "Failed to contact seller. Please try again." },
      { status: error instanceof MarketplaceMessagingError ? error.status : 500, headers: rateLimitHeaders }
    );
  }
}
