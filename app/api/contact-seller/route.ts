import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isUserSuspended } from "@/lib/marketplace/suspension";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (await isUserSuspended(session.user.id)) {
      return NextResponse.json(
        { error: "Marketplace access suspended" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      sellerDiscordId,
      itemTitle,
      itemPrice,
      itemImageUrl,
      sellerUsername,
    } = body ?? {};

    if (
      !sellerDiscordId ||
      typeof sellerDiscordId !== "string" ||
      !itemTitle ||
      typeof itemTitle !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (session.user.discordId === sellerDiscordId) {
      return NextResponse.json(
        { error: "You cannot contact yourself" },
        { status: 400 }
      );
    }

    const payload = {
      buyerId: session.user.discordId,
      sellerId: sellerDiscordId,
      buyerName: session.user.discordUsername || session.user.name || "Anonymous",
      buyerDiscordTag: `${session.user.discordUsername || session.user.name || "Anonymous"}`,
      sellerName: sellerUsername || "Seller",
      itemTitle,
      itemPrice,
      itemImageUrl: itemImageUrl || null,
    };

    console.log("📞 ═══════════════════════════════════════════");
    console.log("📞 API ROUTE: Creating transaction thread");
    console.log("📞 Payload:", JSON.stringify(payload, null, 2));
    console.log("📞 ═══════════════════════════════════════════");

    const res = await fetch(
      `${process.env.BOT_SERVICE_URL}/create-transaction-thread`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();

    console.log("📥 ═══════════════════════════════════════════");
    console.log("📥 API ROUTE: Create transaction thread response");
    console.log("📥 Response:", JSON.stringify(data, null, 2));
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

//     console.log("Contact seller request:", {
//       sellerDiscordId,
//       itemTitle,
//       itemPrice,
//       itemImageUrl,
//       sellerUsername,
//     });

//     // Mock response - simulate thread creation
//     return NextResponse.json({
//       success: true,
//       method: "thread",
//       threadUrl: "https://discord.com/channels/example/thread",
//       threadName: `Purchase: ${itemTitle}`,
//       message: "Thread created successfully",
//     });
//   } catch (error) {
//     console.error("Error contacting seller:", error);
//     return NextResponse.json(
//       { error: "Failed to contact seller" },
//       { status: 500 }
//     );
//   }
// }
