import { HouseWolfFleetPayload } from "./types";

const FLEETYARDS_BASE_URL = "https://api.fleetyards.net/v1";

async function getJson(path: string) {
  const url = `${FLEETYARDS_BASE_URL}${path}`;

  const res = await fetch(url, {
    next: { revalidate: 60 * 30 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    console.error("FleetYards request failed:", url, res.status);
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
  if (Array.isArray(data?.models)) return data.models;

  if (data && typeof data === "object") {
    return Object.entries(data).map(([key, value]) => ({
      name: key,
      label: key,
      count: typeof value === "number" ? value : 0,
      value,
    }));
  }

  return [];
}

async function getAllVehiclePages(path: string): Promise<any[]> {
  const perPage = 25;
  const maxPages = 50;
  let page = 1;
  let allItems: any[] = [];

  while (page <= maxPages) {
    const data = await getJson(`${path}?page=${page}&per_page=${perPage}`);
    const items = normalizeArray(data);

    console.log(`FleetYards vehicles page ${page}:`, items.length);

    if (items.length === 0) {
      break;
    }

    allItems = [...allItems, ...items];

    if (items.length < perPage) {
      break;
    }

    page++;
  }

  return allItems;
}

export async function getPublicFleetData(
  fleetSlug: string
): Promise<HouseWolfFleetPayload> {
  const [
    vehicles,
    modelCountsRaw,
    manufacturersRaw,
    classificationsRaw,
    sizesRaw,
    productionStatusesRaw,
  ] = await Promise.all([
    getAllVehiclePages(`/public/fleets/${fleetSlug}/vehicles`),
    getJson(`/public/fleets/${fleetSlug}/stats/model-counts`),
    getJson(`/public/fleets/${fleetSlug}/stats/models-by-manufacturer`),
    getJson(`/public/fleets/${fleetSlug}/stats/models-by-classification`),
    getJson(`/public/fleets/${fleetSlug}/stats/models-by-size`),
    getJson(`/public/fleets/${fleetSlug}/stats/models-by-production-status`),
  ]);

  return {
    fleetSlug,
    vehicles,
    modelCounts: normalizeArray(modelCountsRaw),
    manufacturers: normalizeArray(manufacturersRaw),
    classifications: normalizeArray(classificationsRaw),
    sizes: normalizeArray(sizesRaw),
    productionStatuses: normalizeArray(productionStatusesRaw),
  };
}