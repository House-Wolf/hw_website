import { HouseWolfFleetPayload } from "@/lib/fleetyards/types";

interface FleetStatsProps {
  data: HouseWolfFleetPayload;
}

function totalFromStats(items: any[]) {
  return items.reduce((sum, item) => {
    return sum + Number(item.count ?? item.value ?? 0);
  }, 0);
}

export default function FleetStats({ data }: FleetStatsProps) {
  const cards = [
    {
      label: "Total Vehicles",
      value: data.vehicles.length,
    },
    {
      label: "Unique Models",
      value: data.modelCounts.length || "—",
    },
    {
      label: "Manufacturers",
      value: data.manufacturers.length || "—",
    },
    {
      label: "Classifications",
      value: data.classifications.length || "—",
    },
  ];

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl"
        >
          <p className="text-sm uppercase tracking-widest text-white/40">
            {card.label}
          </p>
          <p className="mt-3 text-3xl font-black">{card.value}</p>
        </div>
      ))}
    </div>
  );
}