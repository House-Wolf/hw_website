import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Boxes,
  ClipboardList,
  Hammer,
  PackageSearch,
  Radio,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import {
  PackTrackerMetric,
  PackTrackerUnavailable,
} from "@/app/(dashboard)/dashboard/packtracker/_components/PackTrackerPanels";
import {
  formatPackTrackerPriority,
  formatPackTrackerStatus,
  getPackTrackerAccess,
} from "@/lib/packtracker/server";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = [0, 1, 2];

type SummaryState =
  | { kind: "unauthorized" }
  | { kind: "unconfigured" }
  | { kind: "pendingMigration"; message: string }
  | {
      kind: "ready";
      displayName: string;
      metrics: {
        assistanceOpen: number;
        craftingOpen: number;
        procurementOpen: number;
        blueprints: number;
        materials: number;
        inventoryItems: number;
        ownedBlueprints: number;
      };
      recent: Array<{
        id: string;
        type: "Assistance" | "Crafting" | "Procurement";
        title: string;
        status: number;
        priority: number;
        updatedAt: Date;
      }>;
    };

async function getSummary(): Promise<SummaryState> {
  const access = await getPackTrackerAccess();

  if (access.kind !== "ready") {
    return access;
  }

  try {
    const [
      assistanceOpen,
      craftingOpen,
      procurementOpen,
      blueprints,
      materials,
      inventoryItems,
      ownedBlueprints,
      recentAssistance,
      recentCrafting,
      recentProcurement,
    ] = await prisma.$transaction([
      prisma.packTrackerAssistanceRequest.count({
        where: { status: { in: ACTIVE_STATUSES } },
      }),
      prisma.packTrackerCraftingRequest.count({
        where: { status: { in: ACTIVE_STATUSES } },
      }),
      prisma.packTrackerMaterialProcurementRequest.count({
        where: { status: { in: ACTIVE_STATUSES } },
      }),
      prisma.packTrackerBlueprint.count(),
      prisma.packTrackerMaterial.count(),
      prisma.packTrackerOrgInventoryItem.count(),
      prisma.packTrackerMemberBlueprintOwnership.count({
        where: { memberProfileId: access.profile.id },
      }),
      prisma.packTrackerAssistanceRequest.findMany({
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
        take: 4,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          updatedAt: true,
        },
      }),
      prisma.packTrackerCraftingRequest.findMany({
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
        take: 4,
        select: {
          id: true,
          itemName: true,
          status: true,
          priority: true,
          updatedAt: true,
          blueprint: {
            select: {
              craftedItemName: true,
              blueprintName: true,
            },
          },
        },
      }),
      prisma.packTrackerMaterialProcurementRequest.findMany({
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
        take: 4,
        select: {
          id: true,
          status: true,
          priority: true,
          updatedAt: true,
          material: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    const recent = [
      ...recentAssistance.map((item) => ({
        id: item.id,
        type: "Assistance" as const,
        title: item.title,
        status: item.status,
        priority: item.priority,
        updatedAt: item.updatedAt,
      })),
      ...recentCrafting.map((item) => ({
        id: item.id,
        type: "Crafting" as const,
        title: item.itemName || item.blueprint.craftedItemName || item.blueprint.blueprintName,
        status: item.status,
        priority: item.priority,
        updatedAt: item.updatedAt,
      })),
      ...recentProcurement.map((item) => ({
        id: item.id,
        type: "Procurement" as const,
        title: item.material.name,
        status: item.status,
        priority: item.priority,
        updatedAt: item.updatedAt,
      })),
    ]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 8);

    return {
      kind: "ready",
      displayName: access.displayName,
      metrics: {
        assistanceOpen,
        craftingOpen,
        procurementOpen,
        blueprints,
        materials,
        inventoryItems,
        ownedBlueprints,
      },
      recent,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "PackTracker data is unavailable.";
    return {
      kind: "pendingMigration",
      message,
    };
  }
}

export default async function PackTrackerDashboardPage() {
  const summary = await getSummary();

  if (summary.kind !== "ready") {
    return <PackTrackerUnavailable state={summary} />;
  }

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-primary)]">
              PackTracker Command
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
              {summary.displayName}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Operations, logistics, crafting, blueprints, and member support are now anchored to the House Wolf account system.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="btn btn-primary" href="/dashboard/packtracker/requests">
              <ClipboardList size={16} />
              Requests
            </Link>
            <Link className="btn btn-secondary" href="/dashboard/packtracker/blueprints">
              <PackageSearch size={16} />
              Blueprints
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PackTrackerMetric label="Assistance" value={summary.metrics.assistanceOpen} icon={Radio} />
        <PackTrackerMetric label="Crafting" value={summary.metrics.craftingOpen} icon={Hammer} />
        <PackTrackerMetric label="Procurement" value={summary.metrics.procurementOpen} icon={Boxes} />
        <PackTrackerMetric label="Owned Blueprints" value={summary.metrics.ownedBlueprints} icon={ShieldCheck} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-primary)]">
                Live Work
              </p>
              <h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">Recent Requests</h2>
            </div>
            <Activity className="text-[var(--accent-primary)]" size={22} />
          </div>

          <div className="mt-5 divide-y divide-[var(--border-default)]">
            {summary.recent.length === 0 ? (
              <p className="py-8 text-sm text-[var(--text-secondary)]">
                No PackTracker requests have been created in the unified database yet.
              </p>
            ) : (
              summary.recent.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--background-soft)] text-[var(--accent-primary)]">
                    {item.type === "Crafting" ? (
                      <Hammer size={18} />
                    ) : item.type === "Procurement" ? (
                      <Boxes size={18} />
                    ) : (
                      <Radio size={18} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[var(--text-primary)]">{item.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {item.type} / {formatPackTrackerStatus(item.status)} / {formatPackTrackerPriority(item.priority)}
                    </p>
                  </div>
                  <ArrowRight className="shrink-0 text-[var(--text-secondary)]" size={18} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <PackTrackerMetric label="Blueprints" value={summary.metrics.blueprints} icon={PackageSearch} />
          <PackTrackerMetric label="Materials" value={summary.metrics.materials} icon={Sparkles} />
          <PackTrackerMetric label="Inventory Lines" value={summary.metrics.inventoryItems} icon={Users} />
        </div>
      </section>
    </div>
  );
}
