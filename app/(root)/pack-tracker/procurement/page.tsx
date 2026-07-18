import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getProcurementRequests } from "@/lib/packtracker/procurement";
import PTProcurementRequestCard from "@/components/pack-tracker/PTProcurementRequestCard";
import PTEmptyState from "@/components/pack-tracker/PTEmptyState";
import { ShoppingCart, Plus } from "lucide-react";

export const metadata = { title: "Procurement Queue — PackTracker" };

export default async function ProcurementPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const sp = await searchParams;
  const requests = await getProcurementRequests({
    status: sp.status as any ?? undefined,
  });

  const statuses = ["OPEN", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center border"
            style={{ background: "rgba(10,40,60,0.2)", borderColor: "rgba(17,78,98,0.5)", boxShadow: "0 0 15px rgba(17,78,98,0.2)" }}>
            <ShoppingCart size={20} style={{ color: "#60A5FA" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold uppercase tracking-widest" style={{ color: "#60A5FA" }}>
              Procurement Queue
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Material sourcing requests — claim to source and deliver
            </p>
          </div>
        </div>
        <Link
          href="/pack-tracker/procurement/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all hover:brightness-110"
          style={{ background: "var(--accent-primary)", color: "var(--text-primary)" }}>
          <Plus size={16} /> New Request
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/pack-tracker/procurement"
          className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
          style={{
            background: !sp.status ? "var(--accent-primary)" : "transparent",
            borderColor: !sp.status ? "var(--accent-primary)" : "var(--border-default)",
            color: !sp.status ? "var(--text-primary)" : "var(--text-muted)",
          }}>All</Link>
        {statuses.map((s) => (
          <Link key={s} href={`/pack-tracker/procurement?status=${s}`}
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
          title="No procurement requests"
          description="No material sourcing requests at this time."
          actionHref="/pack-tracker/procurement/new"
          actionLabel="New Request"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {requests.map((r) => (
            <PTProcurementRequestCard key={r.id} request={r as any} />
          ))}
        </div>
      )}
    </div>
  );
}
