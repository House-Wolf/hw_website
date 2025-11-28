import { NextRequest, NextResponse } from "next/server";

// Mock data for marketplace listings
// TODO: Replace with actual database queries
const mockListings = [
  {
    id: "1",
    title: "Example Item 1",
    price: 100,
    category: "Weapons",
    discordId: null,
    imageUrl: null,
    sellerUsername: "Seller1",
  },
  {
    id: "2",
    title: "Example Item 2",
    price: 200,
    category: "Armor",
    discordId: null,
    imageUrl: null,
    sellerUsername: "Seller2",
  },
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");

    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedListings = mockListings.slice(startIndex, endIndex);

    return NextResponse.json({
      listings: paginatedListings,
      pagination: {
        total: mockListings.length,
        totalPages: Math.ceil(mockListings.length / limit),
        currentPage: page,
        perPage: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching marketplace listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}
