import { FleetYardsVehicle } from "@/lib/fleetyards/types";

interface FleetShipCardProps {
  vehicle: FleetYardsVehicle;
}

function getImage(vehicle: FleetYardsVehicle) {
  const model = vehicle.model;
  if (!model) return null;

  return (
    model.storeImage ??
    model.storeImageMedium ??
    model.storeImageLarge ??
    model.backgroundImage ??
    model.fleetchartImage ??
    null
  );
}

export default function FleetShipCard({ vehicle }: FleetShipCardProps) {
  const model = vehicle.model;
  const image = getImage(vehicle);

  return (
    <article className="group overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/80 shadow-2xl transition hover:-translate-y-1 hover:border-red-800/60">
      <div className="relative flex h-56 items-center justify-center bg-gradient-to-br from-zinc-900 to-black p-4">
        {image ? (
          <img
            src={image}
            alt={model?.name ?? "Fleet ship"}
            className="h-full w-full object-contain p-4 transition duration-500 group-hover:scale-105"
            onError={(e) => {
              console.error("Image failed to load:", image);
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="text-sm uppercase tracking-widest text-white/30">
            No Image
          </div>
        )}
      </div>
      <div className="p-5">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-400">
          {model?.manufacturer?.name ?? "Unknown Manufacturer"}
        </p>

        <h3 className="mt-2 text-2xl font-black text-white">
          {model?.name ?? vehicle.name ?? "Unknown Ship"}
        </h3>

        {vehicle.name != null && vehicle.name !== "" && (
          <p className="mt-1 text-sm text-white/50">Callsign: {vehicle.name}</p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <Info label="Role" value={model?.focus} />
          <Info label="Size" value={model?.sizeLabel ?? model?.size} />
          <Info
            label="Class"
            value={model?.classificationLabel ?? model?.classification}
          />
          <Info
            label="Status"
            value={model?.productionStatusLabel ?? model?.productionStatus}
          />
        </div>
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-widest text-white/35">{label}</p>
      <p className="mt-1 font-semibold text-white/80">{value ?? "Unknown"}</p>
    </div>
  );
}