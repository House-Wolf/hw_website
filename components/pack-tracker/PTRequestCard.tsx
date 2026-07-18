"use client";

import Link from "next/link";
import { MessageSquare, Clock } from "lucide-react";
import { PTStatusBadge, PTPriorityDot } from "./PTStatusBadge";
import type { PtRequestStatus, PtRequestPriority } from "@prisma/client";

interface PTRequestCardProps {
  request: {
    id: string;
    type?: string;
    status: PtRequestStatus;
    priority: PtRequestPriority;
    title: string;
    description?: string | null;
    createdAt: Date | string;
    createdBy: { discordDisplayName?: string | null; discordUsername: string; avatarUrl?: string | null };
    blueprint?: { name: string; category?: string | null } | null;
    _count?: { comments: number };
  };
}

export default function PTRequestCard({ request }: PTRequestCardProps) {
  const author = request.createdBy.discordDisplayName ?? request.createdBy.discordUsername;
  const ago = formatAgo(new Date(request.createdAt));

  return (
    <Link
      href={`/pack-tracker/requests/${request.id}`}
      className="block rounded-lg border p-4 transition-all hover:-translate-y-0.5"
      style={{
        background: "var(--background-card)",
        borderColor: "var(--border-default)",
        boxShadow: "var(--shadow-sm)",
      }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {request.type && (
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest"
              style={{ background: "rgba(17,78,98,0.15)", color: "var(--accent-secondary)", border: "1px solid rgba(17,78,98,0.3)" }}>
              {request.type}
            </span>
          )}
          <PTStatusBadge status={request.status} />
          <PTPriorityDot priority={request.priority} />
        </div>
        {request._count && request._count.comments > 0 && (
          <span className="flex items-center gap-1 text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
            <MessageSquare size={12} />
            {request._count.comments}
          </span>
        )}
      </div>

      <h3 className="font-semibold text-sm mb-1 line-clamp-1" style={{ color: "var(--text-primary)" }}>
        {request.title}
      </h3>

      {request.blueprint && (
        <p className="text-xs mb-2" style={{ color: "var(--accent-secondary)" }}>
          Blueprint: {request.blueprint.name}
        </p>
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{author}</span>
        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
          <Clock size={11} />
          {ago}
        </span>
      </div>
    </Link>
  );
}

function formatAgo(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
