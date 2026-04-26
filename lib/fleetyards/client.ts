import { HouseWolfFleetPayload } from "./types";

const FLEETYARDS_BASE_URL = "https://api.fleetyards.net/v1";

async function getJson(path: string) {
  const res = await fetch(`${FLEETYARDS_BASE_URL}${path}`, {
    next: { revalidate: 60 * 30 },
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    console.error(`FleetYards request failed: ${path}`, res.status);
    return null;
  }

  return res.json();
}

function normalizeArray(data: any): any[] {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.vehicles)) return data.vehicles;
  if (Array.isArray(data?.results)) return data.results;

  if (data && typeof data === "object") {
    return Object.entries(data).map(([key, value]) => {
      if (typeof value === "number") {
        return {
          name: key,
          label: key,
          count: value,
        };
      }

      return {
        name: key,
        label: key,
        value,
      };
    });
  }

  return [];
}

export async function getPublicFleetData(
  fleetSlug: string
): Promise<HouseWolfFleetPayload> {
  const [
    vehiclesRaw,
    modelCountsRaw,
    manufacturersRaw,
    classificationsRaw,
    sizesRaw,
    productionStatusesRaw,
  ] = await Promise.all([
    getJson(`/public/fleets/${fleetSlug}/vehicles`),
    getJson(`/public/fleets/${fleetSlug}/stats/model-counts`),
    getJson(`/public/fleets/${fleetSlug}/stats/models-by-manufacturer`),
    getJson(`/public/fleets/${fleetSlug}/stats/models-by-classification`),
    getJson(`/public/fleets/${fleetSlug}/stats/models-by-size`),
    getJson(`/public/fleets/${fleetSlug}/stats/models-by-production-status`),
  ]);

  return {
    fleetSlug,
    vehicles: normalizeArray(vehiclesRaw),
    modelCounts: normalizeArray(modelCountsRaw),
    manufacturers: normalizeArray(manufacturersRaw),
    classifications: normalizeArray(classificationsRaw),
    sizes: normalizeArray(sizesRaw),
    productionStatuses: normalizeArray(productionStatusesRaw),
  };
}