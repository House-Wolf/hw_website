import { NextResponse } from "next/server";

export async function GET() {
  const fleetSlug = process.env.NEXT_PUBLIC_FLEETYARDS_FLEET_SLUG;

  const vehiclesRes = await fetch(
    `https://api.fleetyards.net/v1/public/fleets/${fleetSlug}/vehicles?page=1&per_page=3`,
    { headers: { Accept: "application/json" } }
  );

  const status = vehiclesRes.status;
  const raw = await vehiclesRes.text();

  return NextResponse.json({
    fleetSlug,
    status,
    raw,
  });
}