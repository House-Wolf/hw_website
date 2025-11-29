import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Use raw query to avoid schema enum/type mismatches
    const categories = (await prisma.$queryRaw`
      SELECT id, name, slug
      FROM marketplace_categories
      WHERE is_active = true
      ORDER BY sort_order ASC;
    `) as Array<{ id: number; name: string; slug: string }>;

    return NextResponse.json(categories, { status: 200 });
  } catch (error: any) {
    console.error("Fetch categories error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
