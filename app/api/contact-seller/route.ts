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

    // TODO: Implement actual Discord integration for contacting sellers
    // For now, return a mock response

    console.log("Contact seller request:", {
      sellerDiscordId,
      itemTitle,
      itemPrice,
      itemImageUrl,
      sellerUsername,
    });

    // Mock response - simulate thread creation
    return NextResponse.json({
      success: true,
      method: "thread",
      threadUrl: "https://discord.com/channels/example/thread",
      threadName: `Purchase: ${itemTitle}`,
      message: "Thread created successfully",
    });
  } catch (error) {
    console.error("Error contacting seller:", error);
    return NextResponse.json(
      { error: "Failed to contact seller" },
      { status: 500 }
    );
  }
}
