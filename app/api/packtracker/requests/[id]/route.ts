import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Use /api/packtracker/assistance/[id], /api/packtracker/crafting/[id], or /api/packtracker/procurement/[id]" }, { status: 410 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Use typed request routes" }, { status: 410 });
}
