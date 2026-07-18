import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncUEXPrices } from "@/lib/packtracker/trading";

// Manual trigger for admins — future: cron job
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await syncUEXPrices();
  return NextResponse.json(result);
}
