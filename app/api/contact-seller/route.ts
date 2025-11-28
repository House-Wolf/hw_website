import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sellerDiscordId, itemTitle, itemPrice, itemImageUrl, sellerUsername } = body;

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
