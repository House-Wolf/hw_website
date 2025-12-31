import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { devLog } from "@/lib/devLogger";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;

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

    devLog.debug("📞 Creating transaction thread");
    devLog.debug("📞 Payload:", JSON.stringify(payload, null, 2));

    // Create private thread in #marketplace-transactions channel
    const res = await fetch(`${process.env.BOT_SERVICE_URL}/create-transaction-thread`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    devLog.debug("📥 Received response from bot service");
    devLog.debug("📥 Status:", res.ok ? "✅ OK" : "❌ ERROR");
    devLog.debug("📥 Response data:", JSON.stringify(data, null, 2));

    if (!res.ok) {
      devLog.error("❌ Bot service error:", data);
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

    devLog.debug("📤 Sending response to frontend");
    devLog.debug("📤 Response:", JSON.stringify(responseToFrontend, null, 2));

    // Pass through the response from bot service
    return NextResponse.json(responseToFrontend);
  } catch (e: any) {
    devLog.error("❌ Contact seller error:", e);
    return NextResponse.json({ error: "Failed to send message to seller" }, { status: 500 });
  }
}
