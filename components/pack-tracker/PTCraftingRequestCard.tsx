import Link from "next/link";
import { MessageSquare, Hammer, Pin, Package } from "lucide-react";
import { PTStatusBadge, PTPriorityDot } from "./PTStatusBadge";

type RequestCardProps = {
  request: {
    id: string;
    itemName: string;
    quantityRequested: number;
    materialSupplyMode: string;
    status: any;
    priority: any;
    isPinned: boolean;
    maxClaims: number;
    blueprint: { id: number; name: string; category?: string | null };
    createdBy: { discordDisplayName?: string | null; discordUsername: string };
    assignedCrafter?: { discordDisplayName?: string | null; discordUsername: string } | null;
    claims: any[];
    _count: { comments: number; linkedProcurementRequests?: number };
  };
};

const SUPPLY_LABELS: Record<string, string> = {
  REQUESTER_WILL_SUPPLY: "Requester Supplies",
  CRAFTER_MUST_SUPPLY:   "Crafter Supplies",
  NEGOTIABLE:            "Negotiable",
};

export default function PTCraftingRequestCard({ request }: RequestCardProps) {
  return (
    <Link
      href={`/pack-tracker/crafting/${request.id}`}
      className="block rounded-lg border p-4 transition-all hover:border-opacity-80"
      style={{
        background: "var(--background-card)",
        borderColor: request.isPinned ? "var(--accent-primary)" : "var(--border-default)",
        boxShadow: request.isPinned ? "var(--shadow-crimson)" : "var(--shadow-sm)",
      }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {request.isPinned && <Pin size={12} className="shrink-0" style={{ color: "var(--accent-primary)" }} />}
          <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border"
            style={{ background: "rgba(50,10,10,0.3)", color: "var(--accent-secondary)", borderColor: "var(--border-crimson)" }}>
            <Hammer size={10} /> Crafting
          </span>
          <PTStatusBadge status={request.status} />
        </div>
        <PTPriorityDot priority={request.priority} />
      </div>

      <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>
        {request.itemName}
        {request.quantityRequested > 1 && (
          <span className="ml-1 text-xs font-normal" style={{ color: "var(--text-muted)" }}>
            ×{request.quantityRequested}
          </span>
        )}
      </h3>

      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        Blueprint: {request.blueprint.name}
      </p>

      <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Package size={11} />
            {SUPPLY_LABELS[request.materialSupplyMode] ?? request.materialSupplyMode}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare size={11} />
            {request._count.comments}
          </span>
        </div>
        <div>
          {request.assignedCrafter
            ? <span style={{ color: "#4ADE80" }}>{request.assignedCrafter.discordDisplayName ?? request.assignedCrafter.discordUsername}</span>
            : <span>{request.createdBy.discordDisplayName ?? request.createdBy.discordUsername}</span>}
        </div>
      </div>
    </Link>
  );
}
