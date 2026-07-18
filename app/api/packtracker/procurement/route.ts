import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProcurementRequests, createProcurementRequest } from "@/lib/packtracker/procurement";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const data = await getProcurementRequests({
    status: sp.get("status") as any ?? undefined,
    createdById: sp.get("createdById") ?? undefined,
    linkedCraftingRequestId: sp.get("linkedCraftingRequestId") ?? undefined,
    pinned: sp.get("pinned") === "true" ? true : sp.get("pinned") === "false" ? false : undefined,
  });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.materialName?.trim()) return NextResponse.json({ error: "Material name is required" }, { status: 400 });
  if (!body.quantityRequested || body.quantityRequested < 1)
    return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });

  const request = await createProcurementRequest({
    ...body,
    materialId: body.materialId ? Number(body.materialId) : undefined,
    createdById: session.user.id,
  });
  return NextResponse.json(request, { status: 201 });
}
