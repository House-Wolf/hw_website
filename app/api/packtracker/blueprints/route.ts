import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBlueprints, getBlueprintCategories } from "@/lib/packtracker/blueprints";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const query = searchParams.get("q") ?? undefined;
  const category = searchParams.get("category") ?? undefined;

  if (searchParams.get("categories") === "1") {
    const categories = await getBlueprintCategories();
    return NextResponse.json({ categories });
  }

  const blueprints = await getBlueprints(query, category);
  return NextResponse.json({ blueprints });
}
