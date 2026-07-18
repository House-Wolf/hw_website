import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setBlueprintInterest, removeBlueprintInterest } from "@/lib/packtracker/blueprints";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  if (!body.interestType) return NextResponse.json({ error: "interestType required" }, { status: 400 });

  const result = await setBlueprintInterest(
    session.user.id,
    Number(id),
    body.interestType,
    body.ownerStatus
  );
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  const interestType = sp.get("interestType") as any;
  if (!interestType) return NextResponse.json({ error: "interestType required" }, { status: 400 });

  await removeBlueprintInterest(session.user.id, Number(id), interestType);
  return NextResponse.json({ ok: true });
}
