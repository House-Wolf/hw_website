import { NextRequest, NextResponse } from "next/server";
import { devLog } from "@/lib/devLogger";

/**
 * @route GET /api/marketplace/oauth
 * @description Initiates Discord OAuth2 flow to add user to server with Buyer role
 * @query params:
 *   - listingId: string
 *   - sellerDiscordId: string
 *   - itemTitle: string
 *   - itemPrice: number
 *   - itemImageUrl: string
 *   - sellerUsername: string
 * @returns Redirect to Discord OAuth2 authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    // Extract all transaction data from query params
    const listingId = request.nextUrl.searchParams.get("listingId") || "";
    const sellerDiscordId = request.nextUrl.searchParams.get("sellerDiscordId") || "";
    const itemTitle = request.nextUrl.searchParams.get("itemTitle") || "marketplace item";
    const itemPrice = parseInt(request.nextUrl.searchParams.get("itemPrice") || "0", 10);
    const itemImageUrl = request.nextUrl.searchParams.get("itemImageUrl") || "";
    const sellerUsername = request.nextUrl.searchParams.get("sellerUsername") || "Seller";

    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/marketplace/oauth/callback`;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!clientId || !redirectUri || !guildId) {
      devLog.error("Missing OAuth2 configuration");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Encode ALL transaction data in state to pass through OAuth flow
    const transactionData = {
      listingId,
      sellerDiscordId,
      itemTitle,
      itemPrice,
      itemImageUrl,
      sellerUsername,
      timestamp: Date.now(),
    };

    devLog.debug("🔐 OAuth2 transaction data:", transactionData);

    // Build OAuth2 URL with required scopes
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify guilds.join", // guilds.join allows bot to add user to server
      state: Buffer.from(JSON.stringify(transactionData)).toString("base64"),
    });

    const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;

    devLog.debug("🔐 Redirecting to OAuth2 for:", itemTitle);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    devLog.error("OAuth2 initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth2 flow" },
      { status: 500 }
    );
  }
}
