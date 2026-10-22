export const runtime = "nodejs";
export const maxDuration = 60;

import {
  getContactableMarketplaceListing,
} from "@/lib/marketplace/server";
import {
  hashMarketplaceOAuthState,
  MARKETPLACE_OAUTH_STATE_COOKIE,
  parseMarketplaceOAuthState,
} from "@/lib/marketplace/oauth-state";
import { contactMarketplaceSeller } from "@/lib/marketplace/messaging";
import { devLog } from "@/lib/devLogger";
import { prepareMarketplaceGuest } from "@/lib/marketplace/guestJoin";
import { PERSONNEL_ROLES } from "@/lib/personnel/policy.js";
import { NextRequest, NextResponse } from "next/server";

const DISCORD_API_BASE = "https://discord.com/api/v10";

function clearStateCookie(response: NextResponse) {
  response.cookies.set(MARKETPLACE_OAUTH_STATE_COOKIE, "", {
    maxAge: 0,
    path: "/api/marketplace/oauth",
  });
  return response;
}

function marketplaceRedirect(error: string) {
  const url = new URL("/marketplace", process.env.NEXTAUTH_URL || "http://localhost:3000");
  url.searchParams.set("error", error);
  return clearStateCookie(NextResponse.redirect(url));
}

function externalRedirect(url: string) {
  return clearStateCookie(NextResponse.redirect(url));
}


export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.searchParams.get("error")) {
      return marketplaceRedirect("oauth_denied");
    }

    const code = request.nextUrl.searchParams.get("code");
    if (!code) {
      return marketplaceRedirect("no_code");
    }

    const rawState = request.nextUrl.searchParams.get("state");
    if (!rawState) {
      return marketplaceRedirect("state_missing");
    }

    const parsedState = parseMarketplaceOAuthState(rawState);
    if (!parsedState.ok) {
      return marketplaceRedirect(parsedState.error);
    }

    const cookieStateHash = request.cookies.get(MARKETPLACE_OAUTH_STATE_COOKIE)?.value;
    if (!cookieStateHash || cookieStateHash !== hashMarketplaceOAuthState(rawState)) {
      return marketplaceRedirect("state_invalid");
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const baseUrl = process.env.NEXTAUTH_URL;
    const guildId = process.env.DISCORD_GUILD_ID;
    const buyerRoleId = process.env.BUYER_ROLE_ID;
    const visitorRoleId = process.env.VISITOR_ROLE_ID || PERSONNEL_ROLES.visitor;
    const onboardingRoleIds = (process.env.MARKETPLACE_ONBOARDING_ROLE_IDS || "").split(",").map((roleId) => roleId.trim()).filter(Boolean);
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!clientId || !clientSecret || !baseUrl || !guildId || !buyerRoleId || !visitorRoleId || !botToken || visitorRoleId === buyerRoleId || onboardingRoleIds.includes(buyerRoleId)) {
      devLog.error("Missing marketplace OAuth callback configuration");
      return marketplaceRedirect("config_error");
    }

    const listing = await getContactableMarketplaceListing(parsedState.state.listingId);
    if (!listing) {
      return marketplaceRedirect("listing_unavailable");
    }

    const redirectUri = new URL("/api/marketplace/oauth/callback", baseUrl).toString();
    const tokenResponse = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      devLog.error("Token exchange failed:", await tokenResponse.text());
      return marketplaceRedirect("token_exchange_failed");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return marketplaceRedirect("token_exchange_failed");
    }

    const userResponse = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      devLog.error("Failed to get marketplace OAuth user info");
      return marketplaceRedirect("user_fetch_failed");
    }

    const userData = await userResponse.json();
    const userId = userData.id as string | undefined;
    const userTag = (userData.global_name || userData.username || "Marketplace Buyer") as string;

    if (!userId) {
      return marketplaceRedirect("user_fetch_failed");
    }

    if (userId === listing.seller.discordId) {
      return marketplaceRedirect("self_contact");
    }

    const addMemberResponse = await fetch(
      `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: accessToken,
          roles: [buyerRoleId],
        }),
      }
    );

    if (!addMemberResponse.ok) {
      devLog.error("Failed to add marketplace buyer to guild:", await addMemberResponse.text());
      return marketplaceRedirect("guild_add_failed");
    }

    try {
      await prepareMarketplaceGuest({ userId, guildId, userTag, buyerRoleId, visitorRoleId, onboardingRoleIds, botToken, newlyJoined: addMemberResponse.status === 201 });
    } catch (error) {
      devLog.error("Failed to prepare marketplace guest access:", error);
      return marketplaceRedirect("guest_access_failed");
    }

    let threadUrl: string | null = null;
    try {
      const result = await contactMarketplaceSeller(listing, { discordId: userId, discordUsername: userTag, name: userTag });
      if ("threadUrl" in result) threadUrl = result.threadUrl ?? null;
      if (!threadUrl) return marketplaceRedirect("inquiry_failed");
    } catch {
      console.error("Marketplace OAuth inquiry failed");
      return marketplaceRedirect("inquiry_failed");
    }

    const marketplaceChannelId = process.env.MARKETPLACE_CHANNEL_ID;
    const redirectUrl =
      threadUrl ||
      (marketplaceChannelId
        ? `https://discord.com/channels/${guildId}/${marketplaceChannelId}`
        : new URL("/marketplace", baseUrl || "http://localhost:3000").toString());

    return externalRedirect(redirectUrl);
  } catch (error) {
    devLog.error("OAuth2 callback error:", error);
    return marketplaceRedirect("oauth_error");
  }
}
