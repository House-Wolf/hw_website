import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCommodities } from "@/lib/packtracker/trading";
import PTEmptyState from "@/components/pack-tracker/PTEmptyState";
import { TrendingUp } from "lucide-react";

export const metadata = { title: "Trading Hub — PackTracker" };

interface Props {
  searchParams: Promise<{ q?: string; category?: string }>;
}

export default async function TradingPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const { q, category } = await searchParams;
  const commodities = await getCommodities(q, category);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center border"
            style={{ background: "rgba(17,78,98,0.15)", borderColor: "var(--border-teal)", boxShadow: "var(--shadow-teal)" }}>
            <TrendingUp size={18} style={{ color: "var(--accent-secondary)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold uppercase tracking-widest" style={{ color: "var(--accent-secondary)" }}>
              Trading Hub
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              UEX Corp commodity prices — cached every 15 min
            </p>
          </div>
        </div>

        {/* Search */}
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search commodities..."
            className="px-3 py-2 rounded-md text-sm border outline-none focus:ring-1"
            style={{
              background: "var(--background-card)",
              borderColor: "var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-md text-sm font-semibold uppercase tracking-wider"
            style={{ background: "var(--accent-secondary)", color: "var(--text-primary)" }}>
            Search
          </button>
        </form>
      </div>

      {commodities.length === 0 ? (
        <PTEmptyState
          icon={TrendingUp}
          title="No commodity data"
          description={
            q
              ? "No commodities matched your search."
              : "Commodity prices haven't been synced yet. An admin can trigger a UEX sync from the API."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border-default)" }}>
          <table className="w-full text-sm" style={{ background: "var(--background-card)" }}>
            <thead>
              <tr style={{ background: "var(--background-elevated)", borderBottom: "1px solid var(--border-default)" }}>
                {["Commodity", "Category", "Locations", "Best Buy", "Best Sell", "Margin"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest"
                    style={{ color: "var(--text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {commodities.map((c, i) => {
                const buyPrices = c.prices
                  .filter((p) => p.buyPrice !== null)
                  .map((p) => Number(p.buyPrice));
                const sellPrices = c.prices
                  .filter((p) => p.sellPrice !== null)
                  .map((p) => Number(p.sellPrice));

                const bestBuy = buyPrices.length > 0 ? Math.min(...buyPrices) : null;
                const bestSell = sellPrices.length > 0 ? Math.max(...sellPrices) : null;
                const margin = bestBuy !== null && bestSell !== null ? bestSell - bestBuy : null;

                return (
                  <tr
                    key={c.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--background-elevated)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                    <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>
                      {c.name}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
                      {c.category ?? "—"}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                      {c.prices.length}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: "#4ADE80" }}>
                      {bestBuy !== null ? `${bestBuy.toFixed(2)} aUEC` : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: "#60A5FA" }}>
                      {bestSell !== null ? `${bestSell.toFixed(2)} aUEC` : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold"
                      style={{ color: margin !== null && margin > 0 ? "#4ADE80" : "var(--text-muted)" }}>
                      {margin !== null ? `${margin > 0 ? "+" : ""}${margin.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
