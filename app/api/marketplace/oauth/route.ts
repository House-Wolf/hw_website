import { NextRequest, NextResponse } from "next/server";

/**
 * @route GET /api/marketplace/oauth
 * @description Initiates Discord OAuth2 flow to add user to server with Buyer role
 * @returns Redirect to Discord OAuth2 authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    const itemTitle = request.nextUrl.searchParams.get("item") || "marketplace item";

    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/marketplace/oauth/callback`;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!clientId || !redirectUri || !guildId) {
      console.error("Missing OAuth2 configuration");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Build OAuth2 URL with required scopes
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify guilds.join", // guilds.join allows bot to add user to server
      state: Buffer.from(JSON.stringify({ itemTitle, timestamp: Date.now() })).toString("base64"),
    });

    const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;

    console.log("🔐 Redirecting to OAuth2:", authUrl);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("OAuth2 initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth2 flow" },
      { status: 500 }
    );
  }
}
