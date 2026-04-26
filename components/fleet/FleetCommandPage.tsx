"use client";

import { useEffect, useMemo, useState } from "react";
import { HouseWolfFleetPayload, FleetYardsVehicle } from "@/lib/fleetyards/types";
import FleetHero from "./FleetHero";
import FleetStats from "./FleetStats";
import FleetFilters from "./FleetFilters";
import FleetShipCard from "./FleetShipCard";

export default function FleetCommandPage() {
  const [data, setData] = useState<HouseWolfFleetPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classification, setClassification] = useState("All");
  const [manufacturer, setManufacturer] = useState("All");

  useEffect(() => {
    async function loadFleet() {
      try {
        const res = await fetch("/api/fleetyards/fleet");
        const json = await res.json();
        setData(json);
      } finally {
        setLoading(false);
      }
    }

    loadFleet();
  }, []);

  const vehicles = data?.vehicles ?? [];

  const manufacturers = useMemo(() => {
    const values = new Set<string>();

    vehicles.forEach((vehicle) => {
      const name = vehicle.model?.manufacturer?.name;
      if (name) values.add(name);
    });

    return ["All", ...Array.from(values).sort()];
  }, [vehicles]);

  const classifications = useMemo(() => {
    const values = new Set<string>();

    vehicles.forEach((vehicle) => {
      const label =
        vehicle.model?.classificationLabel ||
        vehicle.model?.classification ||
        "Unknown";

      values.add(label);
    });

    return ["All", ...Array.from(values).sort()];
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle: FleetYardsVehicle) => {
      const modelName = vehicle.model?.name ?? "";
      const shipName = vehicle.name ?? "";
      const maker = vehicle.model?.manufacturer?.name ?? "";
      const className =
        vehicle.model?.classificationLabel ||
        vehicle.model?.classification ||
        "Unknown";

      const matchesSearch =
        modelName.toLowerCase().includes(search.toLowerCase()) ||
        shipName.toLowerCase().includes(search.toLowerCase()) ||
        maker.toLowerCase().includes(search.toLowerCase());

      const matchesClassification =
        classification === "All" || className === classification;

      const matchesManufacturer =
        manufacturer === "All" || maker === manufacturer;

      return matchesSearch && matchesClassification && matchesManufacturer;
    });
  }, [vehicles, search, classification, manufacturer]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#090706] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-20 w-20 animate-spin rounded-full border-4 border-white/20 border-t-red-700" />
            <p className="mt-6 text-sm uppercase tracking-[0.35em] text-white/60">
              Synchronizing Fleet Command
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#090706] p-8 text-white">
        Failed to load fleet data.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090706] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <FleetHero totalShips={vehicles.length} />

        <FleetStats data={data} />

        <FleetFilters
          search={search}
          setSearch={setSearch}
          manufacturer={manufacturer}
          setManufacturer={setManufacturer}
          manufacturers={manufacturers}
          classification={classification}
          setClassification={setClassification}
          classifications={classifications}
        />

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-2xl font-black uppercase tracking-wide">
            Fleet Registry
          </h2>

          <p className="text-sm text-white/50">
            Showing {filteredVehicles.length} of {vehicles.length} ships
          </p>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredVehicles.map((vehicle, index) => (
            <FleetShipCard
              key={vehicle.id ?? `${vehicle.model?.slug}-${index}`}
              vehicle={vehicle}
            />
          ))}
        </div>
      </section>
    </main>
  );
}