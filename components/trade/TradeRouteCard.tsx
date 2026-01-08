import type { EvaluatedTradeRoute } from "@/lib/trade/types";

const formatNumber = (value: number, fractionDigits = 0) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);

export default function TradeRouteCard({ route }: { route: EvaluatedTradeRoute }) {
  return (
    <div className="border border-[var(--border-soft)] rounded-md p-3 bg-[var(--background-secondary)] space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-[var(--foreground)]">{route.commodityName}</div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide ${
            route.isIllegal
              ? "bg-red-600/20 text-red-300 border border-red-500/40"
              : "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40"
          }`}
        >
          {route.isIllegal ? "Illegal" : "Legal"}
        </span>
      </div>

      <div className="text-xs text-[var(--foreground-muted)]">
        {route.origin} {"->"} {route.destination}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-[var(--foreground)]">
        <div>Profit: {formatNumber(route.profit)} aUEC</div>
        <div>ROI: {formatNumber(route.roi, 2)}%</div>
        <div>Distance: {route.distance}</div>
        <div>Risk: {route.riskLevel}</div>
        <div>Escort: {route.escortRecommendation}</div>
        <div>Usable SCU: {formatNumber(route.usableScu)}</div>
      </div>
    </div>
  );
}
