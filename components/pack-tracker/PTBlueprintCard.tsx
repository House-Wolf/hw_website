"use client";

import Link from "next/link";
import { Package, Star, CheckCircle } from "lucide-react";
import type { PtInterestType } from "@prisma/client";

interface PTBlueprintCardProps {
  blueprint: {
    id: number;
    name: string;
    category?: string | null;
    tier: number;
    description?: string | null;
    recipeMaterials: Array<{ quantity: number; unit?: string | null; material: { name: string } }>;
    memberInterests: Array<{ userId: string; interestType: PtInterestType }>;
    _count?: { craftingRequests: number };
  };
  currentUserId?: string;
}

export default function PTBlueprintCard({ blueprint, currentUserId }: PTBlueprintCardProps) {
  const userInterests = currentUserId
    ? blueprint.memberInterests.filter((i) => i.userId === currentUserId)
    : [];
  const owned = userInterests.some((i) => i.interestType === "OWNS");
  const wanted = userInterests.some((i) => i.interestType === "WANTS");
  const ownerCount = blueprint.memberInterests.filter((i) => i.interestType === "OWNS").length;

  return (
    <Link
      href={`/pack-tracker/blueprints/${blueprint.id}`}
      className="block rounded-lg border p-4 transition-all hover:-translate-y-0.5"
      style={{
        background: "var(--background-card)",
        borderColor: owned ? "var(--border-teal)" : wanted ? "rgba(251,191,36,0.4)" : "var(--border-default)",
        boxShadow: owned ? "var(--shadow-teal)" : "var(--shadow-sm)",
      }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded flex items-center justify-center shrink-0"
            style={{ background: "rgba(17,78,98,0.15)", border: "1px solid rgba(17,78,98,0.3)" }}>
            <Package size={16} style={{ color: "var(--accent-secondary)" }} />
          </div>
          <div>
            <h3 className="font-semibold text-sm line-clamp-1" style={{ color: "var(--text-primary)" }}>
              {blueprint.name}
            </h3>
            {blueprint.category && (
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {blueprint.category}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {owned && <CheckCircle size={14} style={{ color: "#4ADE80" }} title="You own this" />}
          {wanted && !owned && <Star size={14} style={{ color: "#FBBF24" }} title="You want this" />}
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{ background: "rgba(71,0,0,0.2)", color: "var(--status-error-text)", border: "1px solid rgba(71,0,0,0.4)" }}>
            T{blueprint.tier}
          </span>
        </div>
      </div>

      {blueprint.description && (
        <p className="text-xs line-clamp-2 mb-3" style={{ color: "var(--text-secondary)" }}>
          {blueprint.description}
        </p>
      )}

      {blueprint.recipeMaterials.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Materials</p>
          <div className="flex flex-wrap gap-1">
            {blueprint.recipeMaterials.slice(0, 4).map((rm) => (
              <span key={rm.material.name} className="px-1.5 py-0.5 rounded text-[10px] border"
                style={{ background: "var(--background-elevated)", borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
                {rm.quantity}{rm.unit ? ` ${rm.unit}` : "×"} {rm.material.name}
              </span>
            ))}
            {blueprint.recipeMaterials.length > 4 && (
              <span className="px-1.5 py-0.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
                +{blueprint.recipeMaterials.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {ownerCount} owner{ownerCount !== 1 ? "s" : ""}
        </span>
        {(blueprint._count?.craftingRequests ?? 0) > 0 && (
          <span className="text-xs" style={{ color: "var(--accent-secondary)" }}>
            {blueprint._count!.craftingRequests} active request{blueprint._count!.craftingRequests !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </Link>
  );
}
