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
    return Object.entries(data).map(([key, value]) => ({
      name: key,
      label: key,
      count: typeof value === "number" ? value : 0,
      value,
    }));
  }

  return [];
}

function getTotalPages(data: any): number {
  return (
    data?.meta?.totalPages ??
    data?.meta?.total_pages ??
    data?.pagination?.totalPages ??
    data?.pagination?.total_pages ??
    data?.totalPages ??
    data?.total_pages ??
    1
  );
}

async function getAllPages(path: string): Promise<any[]> {
  const perPage = 100;
  let page = 1;
  let allItems: any[] = [];

  while (true) {
    const data = await getJson(`${path}?page=${page}&per_page=${perPage}`);
    const items = normalizeArray(data);

    allItems = [...allItems, ...items];

    console.log(`FleetYards page ${page}:`, items.length);

    // Stop when FleetYards gives less than a full page
    if (items.length < perPage) {
      break;
    }

    page++;
  }

  return allItems;
}

export async function getPublicFleetData(
  fleetSlug: string,
): Promise<HouseWolfFleetPayload> {
  const [
    vehicles,
    modelCountsRaw,
    manufacturersRaw,
    classificationsRaw,
    sizesRaw,
    productionStatusesRaw,
  ] = await Promise.all([
    getAllPages(`/public/fleets/${fleetSlug}/vehicles`),
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
