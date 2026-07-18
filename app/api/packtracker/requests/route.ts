import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.redirect(new URL("/api/packtracker/assistance", "http://localhost"), 301);
}

export async function POST() {
  return NextResponse.json({ error: "Use /api/packtracker/assistance, /api/packtracker/crafting, or /api/packtracker/procurement" }, { status: 410 });
}
