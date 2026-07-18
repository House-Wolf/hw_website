import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBlueprintById, toggleBlueprintOwnership } from "@/lib/packtracker/blueprints";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const blueprint = await getBlueprintById(Number(id));
  if (!blueprint) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ blueprint });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await toggleBlueprintOwnership(session.user.id, Number(id));
  return NextResponse.json(result);
}
