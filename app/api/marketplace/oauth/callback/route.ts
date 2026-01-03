import { NextRequest, NextResponse } from "next/server";
import { devLog } from "@/lib/devLogger";

const DISCORD_API_BASE = "https://discord.com/api/v10";

/**
 * @route GET /api/marketplace/oauth/callback
 * @description Handles Discord OAuth2 callback and adds user to server with Buyer role
 *
 * CRITICAL LOGIC FOR PRODUCTION:
 * - NEW USERS (201 response): Assigned ONLY Buyer role → bypasses onboarding, no server alerts
 * - EXISTING MEMBERS (204 response): Buyer role ADDED to their existing roles → preserves org roles
 *
 * This ensures:
 * ✓ Marketplace buyers skip Discord onboarding process
 * ✓ Marketplace buyers don't trigger Dyno's "Visitor" role assignment
 * ✓ Marketplace buyers don't ping the server with join notifications
 * ✓ House Wolf members can use marketplace without losing their roles
 * ✓ Only the seller receives a DM notification (handled by bot service)
 *
 * @returns Redirect to Discord marketplace channel on success, marketplace page with error on failure
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

    // Decode state to get transaction data
    let transactionData = {
      listingId: "",
      sellerDiscordId: "",
      itemTitle: "marketplace item",
      itemPrice: 0,
      itemImageUrl: "",
      sellerUsername: "Seller",
    };

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

        // Extract all transaction data from state
        transactionData = {
          listingId: decoded.listingId || "",
          sellerDiscordId: decoded.sellerDiscordId || "",
          itemTitle: decoded.itemTitle || "marketplace item",
          itemPrice: decoded.itemPrice || 0,
          itemImageUrl: decoded.itemImageUrl || "",
          sellerUsername: decoded.sellerUsername || "Seller",
        };
      } catch (e) {
        devLog.warn("Failed to decode state:", e);
      }
    }

    devLog.debug("🔐 OAuth2 callback received for:", transactionData.itemTitle);
    devLog.debug("🔐 Transaction data:", transactionData);

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
    if (addMemberResponse.status === 201) {
      // NEW MEMBER: Assign ONLY Buyer role to bypass onboarding
      devLog.info("🆕 New marketplace buyer - assigning ONLY Buyer role...");

      // Get current member data to verify role assignment
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

        devLog.debug(`👤 Current roles for new member ${userTag}:`, currentRoles);

        // Replace ALL roles with ONLY the Buyer role
        // This ensures they bypass Discord onboarding and Dyno's Visitor assignment
        const updateResponse = await fetch(
          `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              roles: [buyerRoleId], // ONLY the Buyer role for new marketplace buyers
            }),
          }
        );

        if (!updateResponse.ok) {
          devLog.error("Failed to update new member roles:", await updateResponse.text());
        } else {
          devLog.info("✅ New member roles updated - ONLY Buyer role assigned! (bypasses onboarding)");
        }
      }
    } else if (addMemberResponse.status === 204) {
      // EXISTING MEMBER: Add Buyer role WITHOUT stripping their existing roles
      devLog.info("👤 Existing member - preserving roles and adding Buyer role...");

      // Get current member data
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

        devLog.debug(`👤 Current roles for existing member ${userTag}:`, currentRoles);

        // Check if they already have the Buyer role
        if (!currentRoles.includes(buyerRoleId)) {
          // Add Buyer role to their existing roles (preserve all existing roles)
          const updatedRoles = [...currentRoles, buyerRoleId];

          const updateResponse = await fetch(
            `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                roles: updatedRoles, // Keep existing roles + add Buyer role
              }),
            }
          );

          if (!updateResponse.ok) {
            devLog.error("Failed to add Buyer role to existing member:", await updateResponse.text());
          } else {
            devLog.info("✅ Buyer role added to existing member (preserved their existing roles)");
          }
        } else {
          devLog.info("✅ Existing member already has Buyer role - no changes needed");
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

    // Wait for Discord API to propagate the member addition (prevents race condition)
    // The bot needs to be able to fetch the member to create the thread
    devLog.debug("⏳ Waiting 2 seconds for Discord API to propagate member addition...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create transaction thread now that user is in the server
    let threadUrl = null;
    if (transactionData.sellerDiscordId && transactionData.itemTitle !== "marketplace item") {
      devLog.info("🔨 Creating transaction thread for:", transactionData.itemTitle);

      try {
        const threadResponse = await fetch(`${process.env.BOT_SERVICE_URL}/create-transaction-thread`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buyerId: userId,
            sellerId: transactionData.sellerDiscordId,
            buyerName: userTag,
            sellerName: transactionData.sellerUsername,
            itemTitle: transactionData.itemTitle,
            itemPrice: transactionData.itemPrice,
            itemImageUrl: transactionData.itemImageUrl || null,
          }),
        });

        if (threadResponse.ok) {
          const threadData = await threadResponse.json();
          threadUrl = threadData.threadUrl;
          devLog.info("✅ Transaction thread created:", threadUrl);
        } else {
          const errorData = await threadResponse.json();
          devLog.error("❌ Failed to create thread:", errorData);
        }
      } catch (threadError) {
        devLog.error("Failed to create transaction thread after OAuth:", threadError);
      }
    } else {
      devLog.warn("⚠️ Skipping thread creation - missing seller Discord ID or item title");
      devLog.warn("   Seller Discord ID:", transactionData.sellerDiscordId || "MISSING");
      devLog.warn("   Item Title:", transactionData.itemTitle);
    }

    // Redirect to thread if created, otherwise marketplace channel
    const marketplaceChannelId = process.env.MARKETPLACE_CHANNEL_ID!;
    const redirectUrl = threadUrl || `https://discord.com/channels/${guildId}/${marketplaceChannelId}`;

    devLog.info("✅ Redirecting user to:", redirectUrl);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    devLog.error("OAuth2 callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/marketplace?error=oauth_error`
    );
  }
}
