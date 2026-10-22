import {
  AlertTriangle,
  Database,
  LockKeyhole,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import type { PackTrackerAccessState } from "@/lib/packtracker/server";

export function PackTrackerUnavailable({
  state,
}: {
  state: Exclude<PackTrackerAccessState, { kind: "ready" }>;
}) {
  const isUnauthorized = state.kind === "unauthorized";
  const Icon = isUnauthorized ? LockKeyhole : Database;

  return (
    <section className="card">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-primary)]">
            PackTracker
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
            {isUnauthorized ? "Discord sign-in required" : "Operations database pending"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            {state.kind === "unauthorized"
              ? "Sign in with Discord to access PackTracker operations."
              : state.kind === "unconfigured"
              ? "DATABASE_URL is not configured for this runtime."
              : "The PackTracker Prisma models are present, but the database migration has not been applied yet."}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-[var(--border-crimson)] bg-[var(--background-elevated)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent-primary)]">
          <Icon size={16} />
          {state.kind === "unauthorized"
            ? "Locked"
            : state.kind === "unconfigured"
            ? "Env Missing"
            : "Migration Pending"}
        </div>
      </div>
      {state.kind === "pendingMigration" && (
        <pre className="mt-5 max-h-56 overflow-x-auto rounded-lg border border-[var(--border-default)] bg-black/30 p-4 text-xs text-[var(--text-secondary)]">
          {state.message}
        </pre>
      )}
    </section>
  );
}

export function PackTrackerMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--background-elevated)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          {label}
        </p>
        <Icon className="text-[var(--accent-primary)]" size={20} />
      </div>
      <p className="mt-4 text-3xl font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "active" | "warning";
}) {
  const className =
    tone === "active"
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
      : tone === "warning"
      ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
      : "border-[var(--border-default)] bg-[var(--background-soft)] text-[var(--text-secondary)]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.06em] ${className}`}
    >
      {tone === "warning" ? <AlertTriangle size={13} /> : <ShieldCheck size={13} />}
      {children}
    </span>
  );
}
