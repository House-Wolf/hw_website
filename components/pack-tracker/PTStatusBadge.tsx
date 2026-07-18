import type { PtRequestStatus, PtRequestPriority } from "@prisma/client";

const STATUS_STYLES: Record<PtRequestStatus, { label: string; bg: string; text: string; border: string }> = {
  OPEN:        { label: "Open",        bg: "rgba(17,78,98,0.2)",  text: "#60A5FA", border: "rgba(17,78,98,0.5)" },
  ACCEPTED:    { label: "Accepted",    bg: "rgba(71,0,0,0.2)",    text: "#FF6B6B", border: "rgba(71,0,0,0.5)" },
  IN_PROGRESS: { label: "In Progress", bg: "rgba(138,90,0,0.2)",  text: "#FBBF24", border: "rgba(138,90,0,0.5)" },
  COMPLETED:   { label: "Completed",   bg: "rgba(26,95,58,0.2)",  text: "#4ADE80", border: "rgba(26,95,58,0.5)" },
  CANCELLED:   { label: "Cancelled",   bg: "rgba(40,40,40,0.4)",  text: "#6B6B6B", border: "rgba(100,100,100,0.3)" },
  REFUSED:     { label: "Refused",     bg: "rgba(80,0,0,0.3)",    text: "#FF4444", border: "rgba(120,0,0,0.5)" },
};

const PRIORITY_STYLES: Record<PtRequestPriority, { label: string; color: string }> = {
  LOW:      { label: "Low",      color: "#6B6B6B" },
  MEDIUM:   { label: "Medium",   color: "#60A5FA" },
  HIGH:     { label: "High",     color: "#FBBF24" },
  CRITICAL: { label: "Critical", color: "#FF6B6B" },
};

export function PTStatusBadge({ status }: { status: PtRequestStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.OPEN;
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}>
      {s.label}
    </span>
  );
}

export function PTPriorityDot({ priority }: { priority: PtRequestPriority }) {
  const p = PRIORITY_STYLES[priority];
  return (
    <span className="flex items-center gap-1 text-xs font-medium" style={{ color: p.color }}>
      <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
      {p.label}
    </span>
  );
}
