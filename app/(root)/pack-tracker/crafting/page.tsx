import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCraftingRequests } from "@/lib/packtracker/crafting";
import PTCraftingRequestCard from "@/components/pack-tracker/PTCraftingRequestCard";
import PTEmptyState from "@/components/pack-tracker/PTEmptyState";
import { Hammer, Plus } from "lucide-react";

export const metadata = { title: "Crafting Queue — PackTracker" };

export default async function CraftingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const sp = await searchParams;
  const requests = await getCraftingRequests({
    status: sp.status as any ?? undefined,
  });

  const statuses = ["OPEN", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center border"
            style={{ background: "rgba(71,0,0,0.15)", borderColor: "var(--border-crimson)", boxShadow: "var(--shadow-crimson)" }}>
            <Hammer size={20} style={{ color: "var(--accent-primary)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold uppercase tracking-widest" style={{ color: "var(--accent-primary)" }}>
              Crafting Queue
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Blueprint crafting requests — claim as crafter or track your orders
            </p>
          </div>
        </div>
        <Link
          href="/pack-tracker/crafting/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all hover:brightness-110"
          style={{ background: "var(--accent-primary)", color: "var(--text-primary)" }}>
          <Plus size={16} /> New Request
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/pack-tracker/crafting"
          className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
          style={{
            background: !sp.status ? "var(--accent-primary)" : "transparent",
            borderColor: !sp.status ? "var(--accent-primary)" : "var(--border-default)",
            color: !sp.status ? "var(--text-primary)" : "var(--text-muted)",
          }}>All</Link>
        {statuses.map((s) => (
          <Link key={s} href={`/pack-tracker/crafting?status=${s}`}
            className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
            style={{
              background: sp.status === s ? "var(--accent-primary)" : "transparent",
              borderColor: sp.status === s ? "var(--accent-primary)" : "var(--border-default)",
              color: sp.status === s ? "var(--text-primary)" : "var(--text-muted)",
            }}>
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <PTEmptyState
          title="No crafting requests"
          description="No crafting requests match the current filter."
          actionHref="/pack-tracker/crafting/new"
          actionLabel="New Request"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {requests.map((r) => (
            <PTCraftingRequestCard key={r.id} request={r as any} />
          ))}
        </div>
      )}
    </div>
  );
}
