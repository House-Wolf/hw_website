import { NextRequest, NextResponse } from "next/server";
import { devLog } from "@/lib/devLogger";

const DISCORD_API_BASE = "https://discord.com/api/v10";

/**
 * @route GET /api/marketplace/oauth/callback
 * @description Handles Discord OAuth2 callback and adds user to server with Buyer role
 * @returns Redirect to marketplace with success/error message
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");

    // Handle OAuth2 errors
    if (error) {
      devLog.error("OAuth2 error:", error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/marketplace?error=oauth_denied`
      );
    }

    if (!code) {
      devLog.error("No authorization code received");
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/marketplace?error=no_code`
      );
    }

    // Decode state to get item title
    let itemTitle = "marketplace item";
    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, "base64").toString());

        // Validate timestamp for CSRF protection (state must be < 10 minutes old)
        if (decoded.timestamp) {
          const age = Date.now() - decoded.timestamp;
          const maxAge = 10 * 60 * 1000; // 10 minutes in milliseconds

          if (age > maxAge) {
            devLog.warn("OAuth state expired:", { age: Math.floor(age / 1000) + "s" });
            return NextResponse.redirect(
              `${process.env.NEXTAUTH_URL}/marketplace?error=state_expired`
            );
          }
        }

        itemTitle = decoded.itemTitle || itemTitle;
      } catch (e) {
        devLog.warn("Failed to decode state:", e);
      }
    }

    devLog.debug("🔐 OAuth2 callback received for:", itemTitle);

    // Exchange authorization code for access token
    const tokenResponse = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/marketplace/oauth/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      devLog.error("Token exchange failed:", errorData);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/marketplace?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    devLog.info("✅ Access token obtained");

    // Get user info
    const userResponse = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      devLog.error("Failed to get user info");
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/marketplace?error=user_fetch_failed`
      );
    }

    const userData = await userResponse.json();
    const userId = userData.id;
    // Discord deprecated discriminator - use username only (new system)
    const userTag = userData.global_name || userData.username;

    devLog.debug("👤 User identified:", userTag, `(${userId})`);

    // Add user to guild with Buyer role using bot token
    const guildId = process.env.DISCORD_GUILD_ID!;
    const buyerRoleId = process.env.BUYER_ROLE_ID!;

    const addMemberResponse = await fetch(
      `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: accessToken,
          roles: [buyerRoleId], // Assign Buyer role immediately
        }),
      }
    );

    // Discord returns 201 for new members, 204 if already in server
    if (addMemberResponse.status === 204 || addMemberResponse.status === 201) {
      devLog.info("⚠️ Need to ensure ONLY Buyer role is assigned...");

      // Get current member data to see what roles they have
      const memberResponse = await fetch(
        `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
        {
          headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          },
        }
      );

      if (memberResponse.ok) {
        const memberData = await memberResponse.json();
        const currentRoles = memberData.roles || [];

        devLog.debug(`👤 Current roles for ${userTag}:`, currentRoles);

        // Replace ALL roles with ONLY the Buyer role
        const updateResponse = await fetch(
          `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              roles: [buyerRoleId], // ONLY the Buyer role
            }),
          }
        );

        if (!updateResponse.ok) {
          devLog.error("Failed to update member roles:", await updateResponse.text());
        } else {
          devLog.info("✅ Member roles updated - ONLY Buyer role assigned!");
        }
      }
    } else if (!addMemberResponse.ok) {
      const errorData = await addMemberResponse.text();
      devLog.error("Failed to add member to guild:", addMemberResponse.status, errorData);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/marketplace?error=guild_add_failed`
      );
    }
    devLog.debug("🎉 OAuth2 flow complete for:", userTag);

    // Notify bot service to schedule removal
    try {
      await fetch(`${process.env.BOT_SERVICE_URL}/track-marketplace-guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          guildId: guildId,
          userTag: userTag,
        }),
      });
    } catch (e) {
      devLog.error("Failed to track guest for auto-removal:", e);
    }

    // Redirect to Discord marketplace channel
    const marketplaceChannelId = process.env.MARKETPLACE_CHANNEL_ID!;
    const discordChannelUrl = `https://discord.com/channels/${guildId}/${marketplaceChannelId}`;

    devLog.info("✅ Redirecting user to Discord marketplace channel");

    return NextResponse.redirect(discordChannelUrl);
  } catch (error) {
    devLog.error("OAuth2 callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/marketplace?error=oauth_error`
    );
  }
}
