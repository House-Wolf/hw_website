import { HouseWolfFleetPayload } from "@/lib/fleetyards/types";
import { fleetStatistics } from "@/lib/fleetyards/normalization";

interface FleetStatsProps {
  data: HouseWolfFleetPayload;
}

export default function FleetStats({ data }: FleetStatsProps) {
  const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
  const stats = fleetStatistics(vehicles);

  const cards = [
    {
      label: "Total Vehicles",
      value: vehicles.length,
    },
    {
      label: stats.unidentifiedModels ? "Known Unique Models" : "Unique Models",
      value: stats.uniqueModels,
    },
    {
      label: "Manufacturers",
      value: stats.manufacturers,
    },
    {
      label: "Classifications",
      value: stats.classifications,
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
