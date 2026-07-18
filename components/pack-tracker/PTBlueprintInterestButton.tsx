'use client'

import { useState } from "react";
import { CheckCircle, Star, Loader2 } from "lucide-react";
import type { PtInterestType, PtOwnershipStatus } from "@prisma/client";

type Props = {
  blueprintId: number;
  interestType: PtInterestType;
  initialActive: boolean;
  initialOwnerStatus?: PtOwnershipStatus | null;
};

export default function PTBlueprintInterestButton({
  blueprintId,
  interestType,
  initialActive,
  initialOwnerStatus,
}: Props) {
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      if (active) {
        await fetch(`/api/packtracker/blueprints/${blueprintId}/interest?interestType=${interestType}`, {
          method: "DELETE",
        });
        setActive(false);
      } else {
        await fetch(`/api/packtracker/blueprints/${blueprintId}/interest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interestType,
            ownerStatus: interestType === "OWNS" ? "CLAIMED" : undefined,
          }),
        });
        setActive(true);
      }
    } finally {
      setLoading(false);
    }
  }

  const isOwns = interestType === "OWNS";
  const label = isOwns ? (active ? "Owned" : "Mark Owned") : (active ? "Wanted" : "Mark Wanted");
  const Icon = isOwns ? CheckCircle : Star;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all disabled:opacity-50 border"
      style={{
        background: active
          ? isOwns ? "rgba(26,95,58,0.3)" : "rgba(138,90,0,0.3)"
          : "var(--background-elevated)",
        borderColor: active
          ? isOwns ? "rgba(74,222,128,0.5)" : "rgba(251,191,36,0.5)"
          : "var(--border-default)",
        color: active
          ? isOwns ? "#4ADE80" : "#FBBF24"
          : "var(--text-muted)",
      }}>
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
      {label}
    </button>
  );
}
