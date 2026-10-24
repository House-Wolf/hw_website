import type { HouseWolfFleetPayload } from "./types";
import { loadPublicFleet } from "./normalization";

const FLEETYARDS_BASE_URL = "https://api.fleetyards.net/v1";

export async function getPublicFleetData(fleetSlug: string): Promise<HouseWolfFleetPayload> {
  return loadPublicFleet(fleetSlug, async (path) => {
    const response = await fetch(`${FLEETYARDS_BASE_URL}${path}`, {
      cache: "force-cache", next: { revalidate: 1800 }, headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Fleet source unavailable");
    return response.json();
  });
}
