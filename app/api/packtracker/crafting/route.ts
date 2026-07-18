import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCraftingRequests, createCraftingRequest } from "@/lib/packtracker/crafting";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const data = await getCraftingRequests({
    status: sp.get("status") as any ?? undefined,
    createdById: sp.get("createdById") ?? undefined,
    assignedCrafterId: sp.get("assignedCrafterId") ?? undefined,
    pinned: sp.get("pinned") === "true" ? true : sp.get("pinned") === "false" ? false : undefined,
    blueprintId: sp.get("blueprintId") ? Number(sp.get("blueprintId")) : undefined,
  });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.blueprintId) return NextResponse.json({ error: "Blueprint is required" }, { status: 400 });
  if (!body.itemName?.trim()) return NextResponse.json({ error: "Item name is required" }, { status: 400 });

  const request = await createCraftingRequest({
    ...body,
    blueprintId: Number(body.blueprintId),
    createdById: session.user.id,
    requiredBy: body.requiredBy ? new Date(body.requiredBy) : undefined,
  });
  return NextResponse.json(request, { status: 201 });
}
