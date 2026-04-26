import { HouseWolfFleetPayload } from "@/lib/fleetyards/types";

interface FleetStatsProps {
  data: HouseWolfFleetPayload;
}

export default function FleetStats({ data }: FleetStatsProps) {
  const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
  const modelCounts = Array.isArray(data.modelCounts) ? data.modelCounts : [];
  const manufacturers = Array.isArray(data.manufacturers)
    ? data.manufacturers
    : [];
  const classifications = Array.isArray(data.classifications)
    ? data.classifications
    : [];

  const cards = [
    {
      label: "Total Vehicles",
      value: vehicles.length,
    },
    {
      label: "Unique Models",
      value: modelCounts.length || "—",
    },
    {
      label: "Manufacturers",
      value: manufacturers.length || "—",
    },
    {
      label: "Classifications",
      value: classifications.length || "—",
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