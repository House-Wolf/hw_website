'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, UserMinus, CheckCircle2, XCircle, Pin, PinOff, PlayCircle } from "lucide-react";
import type { PtRequestStatus } from "@prisma/client";

type Props = {
  requestType: "assistance" | "crafting" | "procurement";
  requestId: string;
  status: PtRequestStatus;
  isPinned: boolean;
  currentUserId: string;
  createdById: string;
  claimedByCurrentUser: boolean;
  claimsCount: number;
  maxClaims: number;
  showPin?: boolean;
};

export default function PTRequestActionBar({
  requestType,
  requestId,
  status,
  isPinned,
  currentUserId,
  createdById,
  claimedByCurrentUser,
  claimsCount,
  maxClaims,
  showPin = false,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const isOwner = currentUserId === createdById;
  const canClaim = !claimedByCurrentUser && claimsCount < maxClaims && (status === "OPEN" || status === "ACCEPTED");
  const canUnclaim = claimedByCurrentUser && status !== "COMPLETED" && status !== "CANCELLED";
  const canComplete = isOwner && (status === "ACCEPTED" || status === "IN_PROGRESS");
  const canCancel = isOwner && status !== "COMPLETED" && status !== "CANCELLED";
  const canMarkInProgress = isOwner && status === "ACCEPTED";

  const actionLabel = requestType === "crafting" ? "craft" : "claim";

  async function patch(action: string, extra?: Record<string, unknown>) {
    setLoading(action);
    try {
      await fetch(`/api/packtracker/${requestType}/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  function Btn({
    action,
    label,
    icon: Icon,
    color,
    extra,
  }: {
    action: string;
    label: string;
    icon: any;
    color: string;
    extra?: Record<string, unknown>;
  }) {
    return (
      <button
        onClick={() => patch(action, extra)}
        disabled={!!loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all disabled:opacity-50 border"
        style={{ borderColor: `${color}55`, color, background: `${color}15` }}>
        {loading === action ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canClaim && requestType !== "crafting" && (
        <Btn action="claim" label={`Accept ${actionLabel}`} icon={UserPlus} color="#4ADE80" />
      )}
      {canClaim && requestType === "crafting" && (
        <Btn action="assign" label="Accept as Crafter" icon={UserPlus} color="#4ADE80" />
      )}
      {canUnclaim && requestType !== "crafting" && (
        <Btn action="unclaim" label="Release claim" icon={UserMinus} color="#FBBF24" />
      )}
      {canUnclaim && requestType === "crafting" && (
        <Btn action="unassign" label="Release assignment" icon={UserMinus} color="#FBBF24" />
      )}
      {canMarkInProgress && (
        <Btn action="status" label="Mark In Progress" icon={PlayCircle} color="#60A5FA" extra={{ status: "IN_PROGRESS" }} />
      )}
      {canComplete && (
        <Btn action="status" label="Mark Complete" icon={CheckCircle2} color="#4ADE80" extra={{ status: "COMPLETED" }} />
      )}
      {canCancel && (
        <Btn action="status" label="Cancel" icon={XCircle} color="#FF6B6B" extra={{ status: "CANCELLED" }} />
      )}
      {showPin && isOwner && (
        <Btn
          action="pin"
          label={isPinned ? "Unpin" : "Pin"}
          icon={isPinned ? PinOff : Pin}
          color="var(--accent-primary)"
          extra={{ isPinned: !isPinned }}
        />
      )}
    </div>
  );
}
