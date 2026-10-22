export const runtime = "nodejs";

import { getContactableMarketplaceListing } from "@/lib/marketplace/server";
import {
  createMarketplaceOAuthState,
  hashMarketplaceOAuthState,
  MARKETPLACE_OAUTH_STATE_COOKIE,
  MARKETPLACE_OAUTH_STATE_MAX_AGE_SECONDS,
} from "@/lib/marketplace/oauth-state";
import { devLog } from "@/lib/devLogger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const listingId = request.nextUrl.searchParams.get("listingId");
    if (!listingId) {
      return NextResponse.json({ error: "Missing listing ID" }, { status: 400 });
    }

    const listing = await getContactableMarketplaceListing(listingId);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found or unavailable" }, { status: 404 });
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const guildId = process.env.DISCORD_GUILD_ID;
    const baseUrl = process.env.NEXTAUTH_URL;

    if (!clientId || !guildId || !baseUrl) {
      devLog.error("Missing marketplace OAuth2 configuration");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const redirectUri = new URL("/api/marketplace/oauth/callback", baseUrl).toString();
    const state = createMarketplaceOAuthState(listing.id);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify guilds.join",
      state,
    });

    const response = NextResponse.redirect(
      `https://discord.com/api/oauth2/authorize?${params.toString()}`
    );

    response.cookies.set(MARKETPLACE_OAUTH_STATE_COOKIE, hashMarketplaceOAuthState(state), {
      httpOnly: true,
      maxAge: MARKETPLACE_OAUTH_STATE_MAX_AGE_SECONDS,
      path: "/api/marketplace/oauth",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    devLog.error("OAuth2 initiation error:", error);
    return NextResponse.json({ error: "Failed to initiate OAuth2 flow" }, { status: 500 });
  }
}
