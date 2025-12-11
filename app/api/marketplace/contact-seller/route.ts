import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;

    if (!user?.discordId) {
      return NextResponse.json({ error: "Sign in with Discord first." }, { status: 401 });
    }

    const { sellerDiscordId, itemTitle, itemPrice, itemImageUrl, sellerUsername } = await req.json();

    if (!sellerDiscordId || !itemTitle || !itemPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Prevent users from contacting themselves
    if (user.discordId === sellerDiscordId) {
      return NextResponse.json({ error: "You cannot contact yourself" }, { status: 400 });
    }

    const payload = {
      buyerId: user.discordId,
      sellerId: sellerDiscordId,
      buyerName: user.discordUsername || user.name || "Anonymous",
      buyerDiscordTag: `${user.discordUsername || user.name || "Anonymous"}`,
      sellerName: sellerUsername || "Seller",
      itemTitle,
      itemPrice,
      itemImageUrl: itemImageUrl || null,
    };

    console.log("📞 ═══════════════════════════════════════════");
    console.log("📞 API ROUTE: Creating transaction thread");
    console.log("📞 Payload:", JSON.stringify(payload, null, 2));
    console.log("📞 ═══════════════════════════════════════════");

    // Create private thread in #marketplace-transactions channel
    const res = await fetch(`${process.env.BOT_SERVICE_URL}/create-transaction-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    console.log("📥 ═══════════════════════════════════════════");
    console.log("📥 API ROUTE: Received response from bot service");
    console.log("📥 Status:", res.ok ? "✅ OK" : "❌ ERROR");
    console.log("📥 Response data:", JSON.stringify(data, null, 2));
    console.log("📥 ═══════════════════════════════════════════");

    if (!res.ok) {
      console.error("❌ Bot service error:", data);
      return NextResponse.json(
        { error: data.error || "Failed to create transaction thread" },
        { status: res.status }
      );
    }

    const responseToFrontend = {
      success: true,
      method: data.method,
      message: data.message,
      threadUrl: data.threadUrl,
      threadName: data.threadName,
      inviteUrl: data.inviteUrl, // IMPORTANT: Pass through invite URL!
    };

    console.log("📤 ═══════════════════════════════════════════");
    console.log("📤 API ROUTE: Sending response to frontend");
    console.log("📤 Response:", JSON.stringify(responseToFrontend, null, 2));
    console.log("📤 ═══════════════════════════════════════════");

    // Pass through the response from bot service
    return NextResponse.json(responseToFrontend);
  } catch (e: any) {
    console.error("❌ Contact seller error:", e);
    return NextResponse.json({ error: "Failed to send message to seller" }, { status: 500 });
  }
}
