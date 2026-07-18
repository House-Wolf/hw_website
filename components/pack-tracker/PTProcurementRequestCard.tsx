import Link from "next/link";
import { MessageSquare, ShoppingCart, Pin, CheckCircle2 } from "lucide-react";
import { PTStatusBadge, PTPriorityDot } from "./PTStatusBadge";

type RequestCardProps = {
  request: {
    id: string;
    materialName: string;
    quantityRequested: number;
    quantityDelivered: number;
    preferredForm: string;
    status: any;
    priority: any;
    isPinned: boolean;
    maxClaims: number;
    createdBy: { discordDisplayName?: string | null; discordUsername: string };
    claims: any[];
    _count: { comments: number };
  };
};

const FORM_LABELS: Record<string, string> = {
  ANY:     "Any",
  REFINED: "Refined",
  RAW:     "Raw",
};

export default function PTProcurementRequestCard({ request }: RequestCardProps) {
  const deliveryPct = request.quantityRequested > 0
    ? Math.min(100, Math.round((request.quantityDelivered / request.quantityRequested) * 100))
    : 0;

  return (
    <Link
      href={`/pack-tracker/procurement/${request.id}`}
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
            style={{ background: "rgba(10,40,60,0.3)", color: "#60A5FA", borderColor: "rgba(17,78,98,0.5)" }}>
            <ShoppingCart size={10} /> Procurement
          </span>
          <PTStatusBadge status={request.status} />
        </div>
        <PTPriorityDot priority={request.priority} />
      </div>

      <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--text-primary)" }}>
        {request.materialName}
      </h3>

      <div className="flex items-center gap-3 text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        <span>{request.quantityRequested} SCU · {FORM_LABELS[request.preferredForm] ?? request.preferredForm}</span>
        {request.quantityDelivered > 0 && (
          <span className="flex items-center gap-1" style={{ color: "#4ADE80" }}>
            <CheckCircle2 size={11} />
            {request.quantityDelivered}/{request.quantityRequested} delivered
          </span>
        )}
      </div>

      {request.quantityDelivered > 0 && (
        <div className="h-1 rounded-full mb-2 overflow-hidden" style={{ background: "var(--border-subtle)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${deliveryPct}%`, background: "#4ADE80" }} />
        </div>
      )}

      <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
        <div className="flex items-center gap-3">
          <span>{request.claims.length}/{request.maxClaims} claimed</span>
          <span className="flex items-center gap-1">
            <MessageSquare size={11} />
            {request._count.comments}
          </span>
        </div>
        <span>{request.createdBy.discordDisplayName ?? request.createdBy.discordUsername}</span>
      </div>
    </Link>
  );
}
