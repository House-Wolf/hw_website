import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAssistanceRequests, createAssistanceRequest } from "@/lib/packtracker/assistance";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const data = await getAssistanceRequests({
    status: sp.get("status") as any ?? undefined,
    kind: sp.get("kind") as any ?? undefined,
    createdById: sp.get("createdById") ?? undefined,
    pinned: sp.get("pinned") === "true" ? true : sp.get("pinned") === "false" ? false : undefined,
  });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!body.kind) return NextResponse.json({ error: "Kind is required" }, { status: 400 });

  const request = await createAssistanceRequest({
    ...body,
    createdById: session.user.id,
    dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
  });
  return NextResponse.json(request, { status: 201 });
}
