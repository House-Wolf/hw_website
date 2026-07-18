import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBlueprints, getBlueprintCategories } from "@/lib/packtracker/blueprints";
import PTBlueprintCard from "@/components/pack-tracker/PTBlueprintCard";
import PTEmptyState from "@/components/pack-tracker/PTEmptyState";
import { Package } from "lucide-react";

export const metadata = { title: "Blueprint Explorer — PackTracker" };

interface Props {
  searchParams: Promise<{ q?: string; category?: string }>;
}

export default async function BlueprintsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const { q, category } = await searchParams;
  const [blueprints, categories] = await Promise.all([
    getBlueprints(q, category),
    getBlueprintCategories(),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest" style={{ color: "var(--accent-primary)" }}>
            Blueprint Explorer
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {blueprints.length} blueprint{blueprints.length !== 1 ? "s" : ""} available
          </p>
        </div>

        {/* Search */}
        <form className="flex gap-2 flex-wrap">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search blueprints..."
            className="px-3 py-2 rounded-md text-sm border outline-none focus:ring-1"
            style={{
              background: "var(--background-card)",
              borderColor: "var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
          <select
            name="category"
            defaultValue={category}
            className="px-3 py-2 rounded-md text-sm border outline-none"
            style={{
              background: "var(--background-card)",
              borderColor: "var(--border-default)",
              color: "var(--text-secondary)",
            }}>
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 rounded-md text-sm font-semibold uppercase tracking-wider"
            style={{ background: "var(--accent-primary)", color: "var(--text-primary)" }}>
            Search
          </button>
        </form>
      </div>

      {/* Category Pills */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <a
            href="/pack-tracker/blueprints"
            className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
            style={
              !category
                ? { background: "var(--accent-primary)", color: "var(--text-primary)", borderColor: "var(--accent-primary)" }
                : { borderColor: "var(--border-default)", color: "var(--text-muted)" }
            }>
            All
          </a>
          {categories.map((c) => (
            <a
              key={c}
              href={`/pack-tracker/blueprints?category=${encodeURIComponent(c)}`}
              className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
              style={
                category === c
                  ? { background: "var(--accent-secondary)", color: "var(--text-primary)", borderColor: "var(--accent-secondary)" }
                  : { borderColor: "var(--border-default)", color: "var(--text-muted)" }
              }>
              {c}
            </a>
          ))}
        </div>
      )}

      {/* Grid */}
      {blueprints.length === 0 ? (
        <PTEmptyState
          icon={Package}
          title="No blueprints found"
          description={
            q || category
              ? "Try adjusting your search or clearing the filters."
              : "No blueprints have been added yet. Blueprints are synced from the Star Citizen Wiki."
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {blueprints.map((bp) => (
            <PTBlueprintCard key={bp.id} blueprint={bp} currentUserId={session.user!.id} />
          ))}
        </div>
      )}
    </div>
  );
}
