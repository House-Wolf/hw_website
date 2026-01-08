import { NextResponse } from "next/server";

import {
  createRateLimitHeaders,
  getClientIp,
  getRateLimitIdentifier,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { normalizeUexArray, uexGet } from "@/lib/trade/uexClient";
import type { EvaluatedTradeRoute, TradeRoutesResponse } from "@/lib/trade/types";

type UexCommodity = {
  id_commodity?: number;
  id?: number;
  name?: string;
  is_illegal?: number;
  is_buyable?: number;
  is_sellable?: number;
  is_temporary?: number;
  is_available?: number;
  is_available_live?: number;
  is_visible?: number;
};

type UexCommodityRanking = Record<string, unknown>;

type UexCommodityRoute = Record<string, unknown>;

type RankedCommodity = {
  id: number;
  name: string;
  isIllegal: boolean;
};

const COMMODITY_CACHE_TTL_MS = 5 * 60 * 1000;
const ROUTE_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_COMMODITIES_PER_MODE = 20;
const MAX_CONCURRENCY = 6;
const BATCH_DELAY_MS = 250;
const OVERALL_TIMEOUT_MS = 28000;

let commodityCache: { data: UexCommodity[]; fetchedAt: number } | null = null;
let rankingCache: { data: UexCommodityRanking[]; fetchedAt: number } | null = null;
const routeCache = new Map<number, { data: UexCommodityRoute[]; fetchedAt: number }>();

const toNumber = (value: unknown) => {
  const num = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(num) ? num : null;
};

const normalizeName = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, "");

const getCommodityName = (entry: UexCommodityRanking) => {
  const name =
    (entry.name as string) ||
    (entry.commodity_name as string) ||
    (entry.commodity as string) ||
    (entry.commodity_title as string);
  return name?.trim() || null;
};

const getRankingScore = (entry: UexCommodityRanking) => {
  const rankKeys = [
    "rank",
    "rank_buy",
    "rank_sell",
    "rank_profit",
    "rank_total",
    "rank_value",
    "value_rank",
  ];
  for (const key of rankKeys) {
    const value = toNumber(entry[key]);
    if (value !== null) {
      return { value, direction: "asc" as const };
    }
  }

  const scoreKeys = ["score", "score_buy", "score_sell", "score_total", "value_score"];
  for (const key of scoreKeys) {
    const value = toNumber(entry[key]);
    if (value !== null) {
      return { value, direction: "desc" as const };
    }
  }

  return null;
};

const formatDistance = (route: UexCommodityRoute) => {
  const distanceAu =
    toNumber(route.distance_au) ?? toNumber(route.au_distance) ?? toNumber(route.distanceAU);
  if (distanceAu !== null) {
    return `${distanceAu.toFixed(2)} AU`;
  }

  const distanceKm =
    toNumber(route.distance_km) ?? toNumber(route.km_distance) ?? toNumber(route.distanceKM);
  if (distanceKm !== null) {
    return `${Math.round(distanceKm)} km`;
  }

  const distance = toNumber(route.distance);
  if (distance !== null) {
    const unit = typeof route.distance_unit === "string" ? route.distance_unit : "";
    return unit ? `${distance} ${unit}` : `${distance}`;
  }

  return "Unknown";
};

const getRouteLocation = (route: UexCommodityRoute, kind: "origin" | "destination") => {
  const direct =
    (route[`${kind}_name`] as string) ||
    (route[`${kind}_terminal_name`] as string) ||
    (route[`${kind}_location_name`] as string);
  if (direct) return direct;

  const nested =
    (route[kind] as { name?: string } | undefined)?.name ||
    (route[`${kind}_location`] as { name?: string } | undefined)?.name;
  if (nested) return nested;

  return "Unknown";
};

const getRouteId = (route: UexCommodityRoute, commodityId: number) => {
  const id =
    route.id_commodity_route ??
    route.id_route ??
    route.id ??
    `${commodityId}-${route.id_origin ?? "o"}-${route.id_destination ?? "d"}`;
  return String(id);
};

const getRoutePrices = (route: UexCommodityRoute) => {
  const origin =
    toNumber(route.price_origin) ??
    toNumber(route.price_buy) ??
    toNumber(route.price_origin_avg) ??
    toNumber(route.price_buy_avg);
  const destination =
    toNumber(route.price_destination) ??
    toNumber(route.price_sell) ??
    toNumber(route.price_destination_avg) ??
    toNumber(route.price_sell_avg);
  return { origin, destination };
};

const getRiskLevel = (
  isIllegal: boolean,
  profit: number,
  roi: number,
  route: UexCommodityRoute
) => {
  const numericRisk = toNumber(route.risk_level ?? route.risk);
  if (numericRisk !== null) {
    if (numericRisk <= 1) return "Low";
    if (numericRisk === 2) return "Medium";
    return "High";
  }

  const provided = (route.risk_level as string) || (route.risk as string);
  if (provided) {
    const lowered = provided.toLowerCase();
    if (lowered.includes("low")) return "Low";
    if (lowered.includes("medium")) return "Medium";
    if (lowered.includes("high")) return "High";
  }

  if (isIllegal) return "High";
  if (roi >= 25 || profit >= 100000) return "Medium";
  return "Low";
};

const getEscortRecommendation = (isIllegal: boolean, profit: number, roi: number) => {
  if (isIllegal) return "Recommended";
  if (profit >= 200000 || roi >= 35) return "Optional";
  return "Not Needed";
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getCommodities = async () => {
  if (commodityCache && Date.now() - commodityCache.fetchedAt < COMMODITY_CACHE_TTL_MS) {
    return commodityCache.data;
  }
  const payload = await uexGet<unknown>("/commodities");
  const commodities = normalizeUexArray<UexCommodity>(payload);
  commodityCache = { data: commodities, fetchedAt: Date.now() };
  return commodities;
};

const getCommoditiesRanking = async () => {
  if (rankingCache && Date.now() - rankingCache.fetchedAt < COMMODITY_CACHE_TTL_MS) {
    return rankingCache.data;
  }
  const payload = await uexGet<unknown>("/commodities_ranking");
  const ranking = normalizeUexArray<UexCommodityRanking>(payload);
  rankingCache = { data: ranking, fetchedAt: Date.now() };
  return ranking;
};

const getCommodityRoutes = async (commodityId: number) => {
  const cached = routeCache.get(commodityId);
  if (cached && Date.now() - cached.fetchedAt < ROUTE_CACHE_TTL_MS) {
    return cached.data;
  }

  const payload = await uexGet<unknown>("/commodities_routes", {
    query: { id_commodity: commodityId },
  });
  const routes = normalizeUexArray<UexCommodityRoute>(payload);
  routeCache.set(commodityId, { data: routes, fetchedAt: Date.now() });
  return routes;
};

const selectRankedCommodities = (
  commodities: UexCommodity[],
  ranking: UexCommodityRanking[],
  isIllegal: boolean
) => {
  const filtered = commodities.filter(
    (commodity) =>
      toNumber(commodity.is_buyable) === 1 &&
      toNumber(commodity.is_sellable) === 1 &&
      toNumber(commodity.is_temporary) === 0 &&
      (toNumber(commodity.is_available_live ?? commodity.is_available) ?? 1) === 1 &&
      (toNumber(commodity.is_visible) ?? 1) === 1 &&
      (toNumber(commodity.is_illegal) === 1) === isIllegal
  );

  const byName = new Map<string, UexCommodity>();
  const byId = new Map<number, UexCommodity>();
  for (const commodity of filtered) {
    const id = commodity.id_commodity ?? commodity.id;
    if (!commodity.name || !id) continue;
    byName.set(normalizeName(commodity.name), commodity);
    byId.set(id, commodity);
  }

  const ranked = ranking
    .map((entry) => {
      const name = getCommodityName(entry);
      const rankedId = toNumber(entry.id);
      const commodity =
        (rankedId ? byId.get(rankedId) : undefined) ??
        (name ? byName.get(normalizeName(name)) : undefined);
      if (!commodity || !name) return null;
      const score = getRankingScore(entry);
      if (!score) return null;
      const normalizedScore = score.direction === "asc" ? -score.value : score.value;
      const id = commodity.id_commodity ?? commodity.id;
      if (!id || !commodity.name) return null;
      return {
        id,
        name: commodity.name,
        isIllegal: toNumber(commodity.is_illegal) === 1,
        score: normalizedScore,
      };
    })
    .filter((entry): entry is RankedCommodity & { score: number } => !!entry)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_COMMODITIES_PER_MODE);

  if (ranked.length > 0) {
    return ranked.map(({ id, name, isIllegal }) => ({ id, name, isIllegal }));
  }

  return filtered
    .map((commodity) => {
      const id = commodity.id_commodity ?? commodity.id;
      if (!id || !commodity.name) return null;
      return { id, name: commodity.name, isIllegal };
    })
    .filter((entry): entry is RankedCommodity => !!entry)
    .slice(0, MAX_COMMODITIES_PER_MODE);
};

const evaluateRoutes = (
  routes: UexCommodityRoute[],
  commodity: RankedCommodity,
  shipScu: number,
  seen: Set<string>
) => {
  const evaluated: EvaluatedTradeRoute[] = [];

  for (const route of routes) {
    const { origin, destination } = getRoutePrices(route);
    if (origin === null || destination === null) continue;

    const routeScu = toNumber(route.scu_reachable);
    const usableScu = Math.min(shipScu, routeScu ?? shipScu);
    if (!usableScu || usableScu <= 0) continue;

    const investment = origin * usableScu;
    if (!investment || investment <= 0) continue;

    const revenue = destination * usableScu;
    const profit = revenue - investment;
    if (profit <= 0) continue;

    const roi = (profit / investment) * 100;
    const id = getRouteId(route, commodity.id);
    if (seen.has(id)) continue;
    seen.add(id);

    evaluated.push({
      id,
      commodityName: commodity.name,
      isIllegal: commodity.isIllegal,
      origin: getRouteLocation(route, "origin"),
      destination: getRouteLocation(route, "destination"),
      profit,
      roi,
      distance: formatDistance(route),
      riskLevel: getRiskLevel(commodity.isIllegal, profit, roi, route),
      escortRecommendation: getEscortRecommendation(commodity.isIllegal, profit, roi),
      usableScu,
    });
  }

  return evaluated;
};

export async function POST(req: Request) {
  const ip = getClientIp(req.headers);
  const identifier = getRateLimitIdentifier(undefined, ip);
  const limit = await rateLimit(identifier, RATE_LIMITS.API_READ);

  if (!limit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: createRateLimitHeaders(limit) }
    );
  }

  const body = (await req.json().catch(() => null)) as { shipScu?: number } | null;
  const shipScu = toNumber(body?.shipScu);

  if (!shipScu || shipScu <= 0) {
    return NextResponse.json(
      { error: "Invalid ship SCU" },
      { status: 400, headers: createRateLimitHeaders(limit) }
    );
  }

  const work = async (): Promise<TradeRoutesResponse> => {
    const [commodities, ranking] = await Promise.all([
      getCommodities(),
      getCommoditiesRanking(),
    ]);

    const legalCommodities = selectRankedCommodities(commodities, ranking, false);
    const illegalCommodities = selectRankedCommodities(commodities, ranking, true);
    const allCommodities = [...legalCommodities, ...illegalCommodities];

    const seen = new Set<string>();
    const legalRoutes: EvaluatedTradeRoute[] = [];
    const illegalRoutes: EvaluatedTradeRoute[] = [];

    for (let i = 0; i < allCommodities.length; i += MAX_CONCURRENCY) {
      const batch = allCommodities.slice(i, i + MAX_CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(async (commodity) => {
          const routes = await getCommodityRoutes(commodity.id);
          return { commodity, routes };
        })
      );

      for (const result of batchResults) {
        if (result.status !== "fulfilled") continue;
        const { commodity, routes } = result.value;
        const evaluated = evaluateRoutes(routes, commodity, shipScu, seen);
        if (commodity.isIllegal) {
          illegalRoutes.push(...evaluated);
        } else {
          legalRoutes.push(...evaluated);
        }
      }

      if (i + MAX_CONCURRENCY < allCommodities.length) {
        await delay(BATCH_DELAY_MS);
      }
    }

    const sortRoutes = (routes: EvaluatedTradeRoute[]) =>
      routes.sort((a, b) => b.roi - a.roi || b.profit - a.profit);

    return {
      shipScu,
      legal: sortRoutes(legalRoutes).slice(0, 3),
      illegal: sortRoutes(illegalRoutes).slice(0, 3),
      timestamp: Date.now(),
    };
  };

  try {
    const result = (await Promise.race([
      work(),
      new Promise<TradeRoutesResponse>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), OVERALL_TIMEOUT_MS)
      ),
    ])) as TradeRoutesResponse;

    return NextResponse.json(result, { headers: createRateLimitHeaders(limit) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trade route fetch failed";
    const status = message === "timeout" ? 504 : 500;
    return NextResponse.json(
      { error: message },
      { status, headers: createRateLimitHeaders(limit) }
    );
  }
}
