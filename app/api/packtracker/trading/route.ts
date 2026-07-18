import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCommodities } from "@/lib/packtracker/trading";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q") ?? undefined;
  const category = searchParams.get("category") ?? undefined;

  const commodities = await getCommodities(query, category);
  return NextResponse.json({ commodities });
}
