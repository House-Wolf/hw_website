import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  ClipboardList,
  Hammer,
  Layers3,
  LibraryBig,
  MapPin,
  PackageSearch,
  ShieldCheck,
  Warehouse,
} from "lucide-react";

import {
  PackTrackerMetric,
  PackTrackerUnavailable,
  StatusPill,
} from "@/app/(dashboard)/dashboard/packtracker/_components/PackTrackerPanels";
import { prisma } from "@/lib/prisma";
import { getPackTrackerAccess } from "@/lib/packtracker/server";

export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

type BlueprintRow = {
  id: string;
  slug: string;
  blueprintName: string;
  craftedItemName: string;
  category: string;
  description: string | null;
  isInGameAvailable: boolean;
  acquisitionSummary: string | null;
  acquisitionLocation: string | null;
  ownerCount: number;
  ownedByViewer: boolean;
  recipeSummary: string;
  materials: string[];
};

type InventoryRow = {
  id: string;
  materialName: string;
  materialType: string;
  tier: string;
  quantityOnHand: string;
  quantityReserved: string;
  storageLocation: string | null;
};

type BlueprintsState =
  | Exclude<Awaited<ReturnType<typeof getPackTrackerAccess>>, { kind: "ready" }>
  | {
      kind: "ready";
      counts: {
        blueprints: number;
        materials: number;
        inventoryItems: number;
        ownedBlueprints: number;
      };
      blueprints: BlueprintRow[];
      inventory: InventoryRow[];
    };

function formatNumber(value: unknown) {
  return numberFormatter.format(Number(value));
}

async function getBlueprints(): Promise<BlueprintsState> {
  const access = await getPackTrackerAccess();

  if (access.kind !== "ready") {
    return access;
  }

  try {
    const [
      blueprintsCount,
      materialsCount,
      inventoryCount,
      ownedCount,
      blueprints,
      inventory,
    ] = await prisma.$transaction([
      prisma.packTrackerBlueprint.count(),
      prisma.packTrackerMaterial.count(),
      prisma.packTrackerOrgInventoryItem.count(),
      prisma.packTrackerMemberBlueprintOwnership.count({
        where: { memberProfileId: access.profile.id },
      }),
      prisma.packTrackerBlueprint.findMany({
        orderBy: [{ category: "asc" }, { craftedItemName: "asc" }],
        take: 36,
        select: {
          id: true,
          slug: true,
          blueprintName: true,
          craftedItemName: true,
          category: true,
          description: true,
          isInGameAvailable: true,
          acquisitionSummary: true,
          acquisitionLocation: true,
          ownerCount: true,
          ownerships: {
            where: { memberProfileId: access.profile.id },
            take: 1,
            select: { id: true },
          },
          recipe: {
            select: {
              outputQuantity: true,
              craftingStationType: true,
              materials: {
                take: 6,
                select: {
                  quantityRequired: true,
                  unit: true,
                  material: {
                    select: {
                      name: true,
                      tier: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.packTrackerOrgInventoryItem.findMany({
        orderBy: { updatedAt: "desc" },
        take: 12,
        select: {
          id: true,
          quantityOnHand: true,
          quantityReserved: true,
          storageLocation: true,
          material: {
            select: {
              name: true,
              materialType: true,
              tier: true,
            },
          },
        },
      }),
    ]);

    return {
      kind: "ready",
      counts: {
        blueprints: blueprintsCount,
        materials: materialsCount,
        inventoryItems: inventoryCount,
        ownedBlueprints: ownedCount,
      },
      blueprints: blueprints.map((item) => ({
        id: item.id,
        slug: item.slug,
        blueprintName: item.blueprintName,
        craftedItemName: item.craftedItemName,
        category: item.category,
        description: item.description,
        isInGameAvailable: item.isInGameAvailable,
        acquisitionSummary: item.acquisitionSummary,
        acquisitionLocation: item.acquisitionLocation,
        ownerCount: item.ownerCount,
        ownedByViewer: item.ownerships.length > 0,
        recipeSummary: item.recipe
          ? `${item.recipe.outputQuantity} output${
              item.recipe.craftingStationType
                ? ` / ${item.recipe.craftingStationType}`
                : ""
            }`
          : "Recipe pending",
        materials:
          item.recipe?.materials.map(
            (recipeMaterial) =>
              `${formatNumber(recipeMaterial.quantityRequired)} ${
                recipeMaterial.unit
              } ${recipeMaterial.material.name}`
          ) ?? [],
      })),
      inventory: inventory.map((item) => ({
        id: item.id,
        materialName: item.material.name,
        materialType: item.material.materialType,
        tier: item.material.tier,
        quantityOnHand: formatNumber(item.quantityOnHand),
        quantityReserved: formatNumber(item.quantityReserved),
        storageLocation: item.storageLocation,
      })),
    };
  } catch (error) {
    return {
      kind: "pendingMigration",
      message:
        error instanceof Error ? error.message : "PackTracker blueprints are unavailable.",
    };
  }
}

export default async function PackTrackerBlueprintsPage() {
  const state = await getBlueprints();

  if (state.kind !== "ready") {
    return <PackTrackerUnavailable state={state} />;
  }

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/dashboard/packtracker"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--accent-primary)]"
            >
              <ArrowLeft size={16} />
              PackTracker
            </Link>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-primary)]">
              Crafting Library
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
              Blueprints
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Recipes, member ownership, acquisition notes, and org material
              inventory are available from the unified House Wolf database.
            </p>
          </div>
          <Link className="btn btn-secondary" href="/dashboard/packtracker/requests">
            Requests
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PackTrackerMetric label="Blueprints" value={state.counts.blueprints} icon={LibraryBig} />
        <PackTrackerMetric label="Materials" value={state.counts.materials} icon={Layers3} />
        <PackTrackerMetric label="Inventory Lines" value={state.counts.inventoryItems} icon={Warehouse} />
        <PackTrackerMetric label="Owned By You" value={state.counts.ownedBlueprints} icon={ShieldCheck} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-primary)]">
                Recipes
              </p>
              <h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">
                Blueprint Library
              </h2>
            </div>
            <PackageSearch className="text-[var(--accent-primary)]" size={22} />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {state.blueprints.length === 0 ? (
              <p className="py-10 text-sm text-[var(--text-secondary)]">
                No blueprints have been imported into PackTracker yet.
              </p>
            ) : (
              state.blueprints.map((blueprint) => (
                <article
                  key={blueprint.id}
                  className="rounded-lg border border-[var(--border-default)] bg-[var(--background-elevated)] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={blueprint.ownedByViewer ? "active" : "neutral"}>
                      {blueprint.ownedByViewer ? "Owned" : "Unclaimed"}
                    </StatusPill>
                    <StatusPill tone={blueprint.isInGameAvailable ? "active" : "warning"}>
                      {blueprint.isInGameAvailable ? "Available" : "Unavailable"}
                    </StatusPill>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-[var(--text-primary)]">
                    {blueprint.craftedItemName}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {blueprint.blueprintName} / {blueprint.category}
                  </p>
                  {blueprint.description && (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {blueprint.description}
                    </p>
                  )}
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        Owners
                      </dt>
                      <dd className="mt-1 font-semibold text-[var(--text-primary)]">
                        {blueprint.ownerCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        Recipe
                      </dt>
                      <dd className="mt-1 font-semibold text-[var(--text-primary)]">
                        {blueprint.recipeSummary}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 border-t border-[var(--border-default)] pt-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      <Hammer size={14} />
                      Materials
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {blueprint.materials.length > 0
                        ? blueprint.materials.join(", ")
                        : "Materials pending"}
                    </p>
                  </div>
                  {(blueprint.acquisitionSummary || blueprint.acquisitionLocation) && (
                    <div className="mt-4 flex gap-2 text-sm text-[var(--text-secondary)]">
                      <MapPin className="mt-0.5 shrink-0 text-[var(--accent-primary)]" size={16} />
                      <span>
                        {blueprint.acquisitionSummary ||
                          blueprint.acquisitionLocation}
                      </span>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </div>

        <aside className="card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-primary)]">
                Supply
              </p>
              <h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">
                Org Inventory
              </h2>
            </div>
            <Boxes className="text-[var(--accent-primary)]" size={22} />
          </div>

          <div className="mt-5 divide-y divide-[var(--border-default)]">
            {state.inventory.length === 0 ? (
              <p className="py-10 text-sm text-[var(--text-secondary)]">
                Inventory lines will appear after materials are imported.
              </p>
            ) : (
              state.inventory.map((item) => (
                <article key={item.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)]">
                        {item.materialName}
                      </h3>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {item.tier} / {item.materialType}
                      </p>
                    </div>
                    <StatusPill tone="active">{item.quantityOnHand}</StatusPill>
                  </div>
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">
                    Reserved {item.quantityReserved}
                    {item.storageLocation ? ` / ${item.storageLocation}` : ""}
                  </p>
                </article>
              ))
            )}
          </div>

          <Link className="btn btn-primary mt-5 w-full" href="/dashboard/packtracker/requests">
            <ClipboardList size={16} />
            View Requests
          </Link>
        </aside>
      </section>
    </div>
  );
}
