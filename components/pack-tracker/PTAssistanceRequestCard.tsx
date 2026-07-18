import Link from "next/link";
import { MessageSquare, Users, Pin, Clock } from "lucide-react";
import { PTStatusBadge, PTPriorityDot } from "./PTStatusBadge";
import type { PtAssistanceKind } from "@prisma/client";

const KIND_LABELS: Record<PtAssistanceKind, string> = {
  MINING_MATERIALS:  "Mining",
  TRADING_GOODS:     "Trading",
  SHIP_COMPONENTS:   "Ship Components",
  MISSION_BACKUP:    "Mission Backup",
  CARGO_ESCORT:      "Cargo Escort",
  COMBAT_SUPPORT:    "Combat",
  SHIP_CREW:         "Ship Crew",
  TRANSPORTATION:    "Transport",
  LOCATION_SCOUT:    "Scouting",
  GUIDANCE:          "Guidance",
  EVENT_SUPPORT:     "Event",
  OTHER:             "Other",
};

type RequestCardProps = {
  request: {
    id: string;
    title: string;
    kind: PtAssistanceKind;
    status: any;
    priority: any;
    isPinned: boolean;
    maxClaims: number;
    dueAt?: string | Date | null;
    createdAt: string | Date;
    createdBy: { discordDisplayName?: string | null; discordUsername: string; avatarUrl?: string | null };
    claims: { profileId?: string; profile?: any }[];
    _count: { comments: number };
  };
};

export default function PTAssistanceRequestCard({ request }: RequestCardProps) {
  const claimsRemaining = request.maxClaims - request.claims.length;

  return (
    <Link
      href={`/pack-tracker/assistance/${request.id}`}
      className="block rounded-lg border p-4 transition-all hover:border-opacity-80"
      style={{
        background: "var(--background-card)",
        borderColor: request.isPinned ? "var(--accent-primary)" : "var(--border-default)",
        boxShadow: request.isPinned ? "var(--shadow-crimson)" : "var(--shadow-sm)",
      }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {request.isPinned && <Pin size={12} className="shrink-0" style={{ color: "var(--accent-primary)" }} />}
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(71,0,0,0.2)", color: "var(--accent-secondary)", borderColor: "var(--border-crimson)", border: "1px solid" }}>
            {KIND_LABELS[request.kind]}
          </span>
          <PTStatusBadge status={request.status} />
        </div>
        <PTPriorityDot priority={request.priority} />
      </div>

      <h3 className="font-semibold text-sm mb-2 line-clamp-2" style={{ color: "var(--text-primary)" }}>
        {request.title}
      </h3>

      <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Users size={11} />
            {request.claims.length}/{request.maxClaims}
            {claimsRemaining > 0 && <span style={{ color: "#4ADE80" }}> ({claimsRemaining} open)</span>}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare size={11} />
            {request._count.comments}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {request.dueAt && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {new Date(request.dueAt).toLocaleDateString()}
            </span>
          )}
          <span>{request.createdBy.discordDisplayName ?? request.createdBy.discordUsername}</span>
        </div>
      </div>
    </Link>
  );
}
