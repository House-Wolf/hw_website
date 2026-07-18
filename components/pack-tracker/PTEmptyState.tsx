import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { InboxIcon } from "lucide-react";

interface PTEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
}

export default function PTEmptyState({ icon: Icon = InboxIcon, title, description, action, actionHref, actionLabel }: PTEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-8 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center border"
        style={{ background: "rgba(17,78,98,0.1)", borderColor: "var(--border-teal)" }}>
        <Icon size={28} style={{ color: "var(--accent-secondary)" }} />
      </div>
      <div>
        <h3 className="font-semibold text-base mb-1" style={{ color: "var(--text-primary)" }}>
          {title}
        </h3>
        <p className="text-sm max-w-xs" style={{ color: "var(--text-secondary)" }}>
          {description}
        </p>
      </div>
      {action}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="px-4 py-2 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all hover:brightness-110"
          style={{ background: "var(--accent-primary)", color: "var(--text-primary)" }}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
