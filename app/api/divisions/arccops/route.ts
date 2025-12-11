// app/api/divisions/arccops/route.ts

import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Replace THIS with your real DB, Prisma, Supabase, or API call.
    const data = {
      command: [],
      members: [],
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error("Failed to load ARCCOPS data:", err);
    return NextResponse.json({ error: "Failed to load division data" }, { status: 500 });
  }
}
