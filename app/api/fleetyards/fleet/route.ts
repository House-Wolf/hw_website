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

  return NextResponse.json(data, {
    status: data.sourceStatus === "unavailable" ? 503 : 200,
    headers: { "Cache-Control": data.sourceStatus === "complete" ? "public, max-age=60, s-maxage=1800, stale-while-revalidate=300" : "no-store" },
  });
}
