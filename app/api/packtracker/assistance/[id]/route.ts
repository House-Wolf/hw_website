import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getAssistanceRequestById,
  claimAssistanceRequest,
  unclaimAssistanceRequest,
  updateAssistanceStatus,
  pinAssistanceRequest,
  addAssistanceComment,
} from "@/lib/packtracker/assistance";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const request = await getAssistanceRequestById(id);
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(request);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action, ...rest } = body;

  try {
    if (action === "claim") {
      const result = await claimAssistanceRequest(id, session.user.id);
      return NextResponse.json(result);
    }
    if (action === "unclaim") {
      await unclaimAssistanceRequest(id, session.user.id);
      return NextResponse.json({ ok: true });
    }
    if (action === "status" && rest.status) {
      const result = await updateAssistanceStatus(id, rest.status);
      return NextResponse.json(result);
    }
    if (action === "pin" && rest.isPinned != null) {
      const result = await pinAssistanceRequest(id, rest.isPinned);
      return NextResponse.json(result);
    }
    if (action === "comment" && rest.content?.trim()) {
      const result = await addAssistanceComment(id, session.user.id, rest.content, rest.isLiveChat ?? false);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
