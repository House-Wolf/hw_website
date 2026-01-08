import { NextResponse } from "next/server";

import {
  createRateLimitHeaders,
  getClientIp,
  getRateLimitIdentifier,
  rateLimit,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { normalizeUexArray, uexGet } from "@/lib/trade/uexClient";
import type { TradeShip } from "@/lib/trade/types";

type UexVehicle = {
  id_vehicle?: number;
  id?: number;
  name?: string;
  scu?: number;
  scu_cargo?: number;
  cargo?: number;
  cargo_capacity?: number;
  cargo_scu?: number;
  is_concept?: number;
};

const VEHICLE_CACHE_TTL_MS = 10 * 60 * 1000;
let vehicleCache: { data: TradeShip[]; fetchedAt: number } | null = null;

const toNumber = (value: unknown) => {
  const num = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(num) ? num : null;
};

const extractScu = (vehicle: UexVehicle) =>
  toNumber(
    vehicle.scu ??
      vehicle.scu_cargo ??
      vehicle.cargo_scu ??
      vehicle.cargo_capacity ??
      vehicle.cargo
  );

export async function GET(req: Request) {
  const ip = getClientIp(req.headers);
  const identifier = getRateLimitIdentifier(undefined, ip);
  const limit = await rateLimit(identifier, RATE_LIMITS.PUBLIC);

  if (!limit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: createRateLimitHeaders(limit) }
    );
  }

  if (vehicleCache && Date.now() - vehicleCache.fetchedAt < VEHICLE_CACHE_TTL_MS) {
    return NextResponse.json(
      { ships: vehicleCache.data, timestamp: vehicleCache.fetchedAt },
      { headers: createRateLimitHeaders(limit) }
    );
  }

  const companyId = toNumber(process.env.UEX_COMPANY_ID);
  let vehicles: UexVehicle[] = [];
  try {
    const payload = await uexGet<unknown>("/vehicles", {
      query: companyId ? { id_company: companyId } : undefined,
    });
    vehicles = normalizeUexArray<UexVehicle>(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UEX fetch failed";
    return NextResponse.json(
      { error: message },
      { status: 502, headers: createRateLimitHeaders(limit) }
    );
  }

  const ships = vehicles
    .filter((vehicle) => toNumber(vehicle.is_concept) !== 1)
    .map((vehicle) => {
      const scu = extractScu(vehicle);
      const name = vehicle.name?.trim();
      const id = toNumber(vehicle.id_vehicle ?? vehicle.id);
      if (!name || !id || !scu || scu <= 0) return null;
      return { id, name, scu };
    })
    .filter((ship): ship is TradeShip => !!ship)
    .sort((a, b) => b.scu - a.scu);

  vehicleCache = { data: ships, fetchedAt: Date.now() };

  return NextResponse.json(
    { ships, timestamp: vehicleCache.fetchedAt },
    { headers: createRateLimitHeaders(limit) }
  );
}
