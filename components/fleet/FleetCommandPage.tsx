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
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [classification, setClassification] = useState("All");
  const [manufacturer, setManufacturer] = useState("All");

  useEffect(() => {
    async function loadFleet() {
      try {
        const res = await fetch("/api/fleetyards/fleet");
        if (!res.ok) throw new Error("The public fleet source is unavailable. Please retry.");
        const json = await res.json();
        setData(json);
      } catch (error) {
        setError(error instanceof Error ? error.message : "The public fleet could not be loaded.");
      } finally {
        setLoading(false);
      }
    }

    loadFleet();
  }, [attempt]);

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
        <p role="alert">{error || "Failed to load fleet data."}</p>
        <button className="btn btn-secondary mt-4" onClick={() => { setError(null); setLoading(true); setAttempt((value) => value + 1); }}>Retry fleet source</button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090706] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <FleetHero totalShips={vehicles.length} />
        {data.sourceStatus === "partial" && <p role="status" className="mb-6 rounded-xl border border-white/20 p-4">The fleet source is incomplete. Counts below include only the records received; they do not establish operational readiness.</p>}

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
              key={`${vehicle.id ?? "unknown"}-${index}`}
              vehicle={vehicle}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
