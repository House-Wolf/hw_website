import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getBlueprintById } from "@/lib/packtracker/blueprints";
import PTBlueprintInterestButton from "@/components/pack-tracker/PTBlueprintInterestButton";
import PTCraftingRequestCard from "@/components/pack-tracker/PTCraftingRequestCard";
import { ChevronLeft, Package, Users, Hammer, CheckCircle, Star, ExternalLink } from "lucide-react";

export default async function BlueprintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const { id } = await params;
  const blueprint = await getBlueprintById(Number(id));
  if (!blueprint) notFound();

  const userId = session.user.id!;
  const userInterests = blueprint.memberInterests.filter((i) => i.userId === userId);
  const userOwns = userInterests.some((i) => i.interestType === "OWNS");
  const userWants = userInterests.some((i) => i.interestType === "WANTS");
  const owners = blueprint.memberInterests.filter((i) => i.interestType === "OWNS");
  const wanters = blueprint.memberInterests.filter((i) => i.interestType === "WANTS");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/pack-tracker/blueprints" className="flex items-center gap-1 text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
        <ChevronLeft size={14} /> Blueprint Explorer
      </Link>

      {/* Main card */}
      <div className="rounded-xl border p-6 space-y-5"
        style={{ background: "var(--background-card)", borderColor: "var(--border-default)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center border shrink-0"
              style={{ background: "rgba(17,78,98,0.15)", borderColor: "rgba(17,78,98,0.4)" }}>
              <Package size={22} style={{ color: "var(--accent-secondary)" }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-xs font-bold"
                  style={{ background: "rgba(71,0,0,0.2)", color: "var(--accent-primary)", border: "1px solid rgba(71,0,0,0.4)" }}>
                  Tier {blueprint.tier}
                </span>
                {blueprint.category && (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{blueprint.category}</span>
                )}
              </div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{blueprint.name}</h1>
              {blueprint.craftedItemName && blueprint.craftedItemName !== blueprint.name && (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Crafts: {blueprint.craftedItemName}</p>
              )}
            </div>
          </div>
          {blueprint.wikiUrl && (
            <a href={blueprint.wikiUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs hover:underline shrink-0"
              style={{ color: "var(--accent-secondary)" }}>
              <ExternalLink size={12} /> Wiki
            </a>
          )}
        </div>

        {blueprint.description && (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{blueprint.description}</p>
        )}

        {/* Mark owned/wanted buttons */}
        <div className="flex flex-wrap gap-2">
          <PTBlueprintInterestButton
            blueprintId={blueprint.id}
            interestType="OWNS"
            initialActive={userOwns}
          />
          <PTBlueprintInterestButton
            blueprintId={blueprint.id}
            interestType="WANTS"
            initialActive={userWants}
          />
          <Link href={`/pack-tracker/crafting/new`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all hover:brightness-110"
            style={{ borderColor: "var(--border-crimson)", color: "var(--accent-primary)", background: "rgba(71,0,0,0.15)" }}>
            <Hammer size={13} /> Request Crafting
          </Link>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            blueprint.acquisitionSummary && { label: "Acquisition", value: blueprint.acquisitionSummary },
            blueprint.acquisitionLocation && { label: "Location", value: blueprint.acquisitionLocation },
            blueprint.acquisitionMethod && { label: "Method", value: blueprint.acquisitionMethod },
            blueprint.craftingStationType && { label: "Station Type", value: blueprint.craftingStationType },
            blueprint.timeToCraftSeconds && {
              label: "Craft Time",
              value: `${Math.round(blueprint.timeToCraftSeconds / 60)} min`,
            },
            blueprint.outputQuantity !== 1 && { label: "Output Qty", value: String(blueprint.outputQuantity) },
            blueprint.dataConfidence && { label: "Data Confidence", value: blueprint.dataConfidence },
          ].filter(Boolean).map((row: any) => (
            <div key={row.label} className="rounded-md px-3 py-2"
              style={{ background: "var(--background-elevated)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>{row.label}</p>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{row.value}</p>
            </div>
          ))}
        </div>

        {/* Recipe materials */}
        {blueprint.recipeMaterials.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>
              Required Materials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {blueprint.recipeMaterials.map((rm) => (
                <div key={rm.id} className="flex items-center justify-between px-3 py-2 rounded-md border"
                  style={{ background: "var(--background-elevated)", borderColor: "var(--border-subtle)" }}>
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>{rm.material.name}</span>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                    {rm.isOptional && <span style={{ color: "#FBBF24" }}>optional</span>}
                    {rm.isIntermediateCraftable && <span style={{ color: "var(--accent-secondary)" }}>craftable</span>}
                    <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>
                      {rm.quantity} {rm.unit ?? "SCU"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Owners & Wanters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border p-5"
          style={{ background: "var(--background-card)", borderColor: "var(--border-default)" }}>
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>
            <CheckCircle size={13} style={{ color: "#4ADE80" }} />
            Owners ({owners.length})
          </h3>
          {owners.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No one has marked this as owned yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {owners.map((i) => (
                <span key={i.id} className="text-xs px-2 py-1 rounded border"
                  style={{ borderColor: "rgba(74,222,128,0.3)", color: "#4ADE80", background: "rgba(26,95,58,0.15)" }}>
                  {(i as any).user?.discordDisplayName ?? (i as any).user?.discordUsername ?? "Unknown"}
                  {i.ownerStatus && <span className="ml-1 opacity-60">({i.ownerStatus.toLowerCase()})</span>}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border p-5"
          style={{ background: "var(--background-card)", borderColor: "var(--border-default)" }}>
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>
            <Star size={13} style={{ color: "#FBBF24" }} />
            Wanted By ({wanters.length})
          </h3>
          {wanters.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No members have this on their wishlist.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {wanters.map((i) => (
                <span key={i.id} className="text-xs px-2 py-1 rounded border"
                  style={{ borderColor: "rgba(251,191,36,0.3)", color: "#FBBF24", background: "rgba(138,90,0,0.15)" }}>
                  {(i as any).user?.discordDisplayName ?? (i as any).user?.discordUsername ?? "Unknown"}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active crafting requests */}
      {blueprint.craftingRequests.length > 0 && (
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>
            <Users size={14} style={{ color: "var(--accent-primary)" }} />
            Active Crafting Requests
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {blueprint.craftingRequests.map((cr) => (
              <PTCraftingRequestCard key={cr.id} request={{ ...cr, blueprint, claims: [], _count: { comments: 0 } } as any} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
