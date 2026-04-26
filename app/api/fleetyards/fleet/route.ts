import { NextResponse } from "next/server";
import { getPublicFleetData } from "@/lib/fleetyards/client";

export async function GET() {
  const fleetSlug = process.env.NEXT_PUBLIC_FLEETYARDS_FLEET_SLUG;

  if (!fleetSlug) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_FLEETYARDS_FLEET_SLUG." },
      { status: 500 }
    );
  }

  const data = await getPublicFleetData(fleetSlug);

  return NextResponse.json(data);
}