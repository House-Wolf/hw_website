import "server-only";
import { prisma } from "@/lib/prisma";

const UEX_API_BASE = process.env.UEX_API_URL ?? "https://uexcorp.space/api/2.0";

export async function getCommodities(query?: string, category?: string) {
  return prisma.ptCommodity.findMany({
    where: {
      isActive: true,
      ...(query && {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      }),
      ...(category && { category }),
    },
    include: {
      prices: {
        orderBy: { lastUpdated: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getBestTradeRoutes(limit = 20) {
  const prices = await prisma.ptCommodityPrice.findMany({
    include: { commodity: true },
    orderBy: { lastUpdated: "desc" },
  });

  // Group by commodity, find max sell - min buy per commodity
  const byCommmodity = new Map<number, { commodity: { name: string }; buyPrices: number[]; sellPrices: string[]; locations: string[] }>();

  for (const p of prices) {
    const existing = byCommmodity.get(p.commodityId);
    const entry = existing ?? { commodity: p.commodity, buyPrices: [], sellPrices: [], locations: [] };
    if (p.buyPrice) entry.buyPrices.push(Number(p.buyPrice));
    if (p.sellPrice) entry.sellPrices.push(p.location);
    byCommmodity.set(p.commodityId, entry);
  }

  return Array.from(byCommmodity.values())
    .filter((e) => e.buyPrices.length > 0 && e.sellPrices.length > 0)
    .slice(0, limit);
}

// Fetches fresh price data from UEX Corp API and upserts into DB
export async function syncUEXPrices(): Promise<{ synced: number; error?: string }> {
  if (!process.env.UEX_API_URL) {
    return { synced: 0, error: "UEX_API_URL not configured" };
  }

  try {
    const res = await fetch(`${UEX_API_BASE}/commodities_prices`, {
      headers: { "User-Agent": "HouseWolf/1.0" },
      next: { revalidate: 900 }, // 15 min cache
    });

    if (!res.ok) return { synced: 0, error: `UEX API error: ${res.status}` };

    const json = (await res.json()) as {
      data?: Array<{
        id_commodity: number;
        commodity_name: string;
        terminal_name: string;
        price_buy: number;
        price_sell: number;
        date_modified: number;
      }>;
    };

    const rows = json.data ?? [];
    let synced = 0;

    for (const row of rows) {
      // Upsert commodity
      const commodity = await prisma.ptCommodity.upsert({
        where: { uexId: String(row.id_commodity) },
        create: {
          uexId: String(row.id_commodity),
          name: row.commodity_name,
          slug: row.commodity_name.toLowerCase().replace(/\s+/g, "-"),
        },
        update: { name: row.commodity_name },
      });

      // Upsert price for this location using the composite unique index
      await prisma.ptCommodityPrice.upsert({
        where: {
          commodityId_location: {
            commodityId: commodity.id,
            location: row.terminal_name,
          },
        },
        create: {
          commodityId: commodity.id,
          location: row.terminal_name,
          buyPrice: row.price_buy || null,
          sellPrice: row.price_sell || null,
          lastUpdated: new Date(row.date_modified * 1000),
        },
        update: {
          buyPrice: row.price_buy || null,
          sellPrice: row.price_sell || null,
          lastUpdated: new Date(row.date_modified * 1000),
        },
      });

      synced++;
    }

    return { synced };
  } catch (err) {
    return { synced: 0, error: String(err) };
  }
}
