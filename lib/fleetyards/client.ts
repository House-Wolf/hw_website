import { HouseWolfFleetPayload } from "./types";

const FLEETYARDS_BASE_URL = "https://api.fleetyards.net/v1";

async function getJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${FLEETYARDS_BASE_URL}${path}`, {
    next: { revalidate: 60 * 30 },
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    return null;
  }

  return res.json() as Promise<T>;
}

export async function getPublicFleetData(
  fleetSlug: string
): Promise<HouseWolfFleetPayload> {
  const [
    vehicles,
    modelCounts,
    manufacturers,
    classifications,
    sizes,
    productionStatuses,
  ] = await Promise.all([
    getJson<any[]>(`/public/fleets/${fleetSlug}/vehicles`),
    getJson<any[]>(`/public/fleets/${fleetSlug}/stats/model-counts`),
    getJson<any[]>(`/public/fleets/${fleetSlug}/stats/models-by-manufacturer`),
    getJson<any[]>(`/public/fleets/${fleetSlug}/stats/models-by-classification`),
    getJson<any[]>(`/public/fleets/${fleetSlug}/stats/models-by-size`),
    getJson<any[]>(
      `/public/fleets/${fleetSlug}/stats/models-by-production-status`
    ),
  ]);

  return {
    fleetSlug,
    vehicles: vehicles ?? [],
    modelCounts: modelCounts ?? [],
    manufacturers: manufacturers ?? [],
    classifications: classifications ?? [],
    sizes: sizes ?? [],
    productionStatuses: productionStatuses ?? [],
  };
}