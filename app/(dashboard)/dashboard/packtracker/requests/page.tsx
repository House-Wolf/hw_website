import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  ClipboardList,
  Clock3,
  Hammer,
  Radio,
} from "lucide-react";

import {
  PackTrackerMetric,
  PackTrackerUnavailable,
  StatusPill,
} from "@/app/(dashboard)/dashboard/packtracker/_components/PackTrackerPanels";
import { prisma } from "@/lib/prisma";
import {
  formatPackTrackerPriority,
  formatPackTrackerStatus,
  getPackTrackerAccess,
} from "@/lib/packtracker/server";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = [0, 1, 2];
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type PackTrackerRequestRow = {
  id: string;
  type: "Assistance" | "Crafting" | "Procurement";
  title: string;
  detail: string;
  status: number;
  priority: number;
  requester: string;
  assignee: string | null;
  updatedAt: Date;
  dueAt: Date | null;
  isPinned: boolean;
};

type RequestsState =
  | Exclude<Awaited<ReturnType<typeof getPackTrackerAccess>>, { kind: "ready" }>
  | {
      kind: "ready";
      counts: {
        assistance: number;
        crafting: number;
        procurement: number;
      };
      requests: PackTrackerRequestRow[];
    };

function profileName(profile: { discordDisplayName: string | null; username: string }) {
  return profile.discordDisplayName || profile.username;
}

function formatDate(value: Date | null) {
  return value ? dateFormatter.format(value) : "No deadline";
}

function statusTone(status: number) {
  return ACTIVE_STATUSES.includes(status) ? "active" : "neutral";
}

async function getRequests(): Promise<RequestsState> {
  const access = await getPackTrackerAccess();

  if (access.kind !== "ready") {
    return access;
  }

  try {
    const [
      assistanceCount,
      craftingCount,
      procurementCount,
      assistance,
      crafting,
      procurement,
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
      prisma.packTrackerAssistanceRequest.findMany({
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
        take: 20,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          isPinned: true,
          updatedAt: true,
          dueAt: true,
          materialName: true,
          quantityNeeded: true,
          meetingLocation: true,
          createdByProfile: {
            select: { username: true, discordDisplayName: true },
          },
          assignedToProfile: {
            select: { username: true, discordDisplayName: true },
          },
        },
      }),
      prisma.packTrackerCraftingRequest.findMany({
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
        take: 20,
        select: {
          id: true,
          itemName: true,
          status: true,
          priority: true,
          isPinned: true,
          updatedAt: true,
          requiredBy: true,
          deliveryLocation: true,
          quantityRequested: true,
          minimumQuality: true,
          blueprint: {
            select: {
              blueprintName: true,
              craftedItemName: true,
              category: true,
            },
          },
          requesterProfile: {
            select: { username: true, discordDisplayName: true },
          },
          assignedCrafterProfile: {
            select: { username: true, discordDisplayName: true },
          },
        },
      }),
      prisma.packTrackerMaterialProcurementRequest.findMany({
        orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
        take: 20,
        select: {
          id: true,
          status: true,
          priority: true,
          isPinned: true,
          updatedAt: true,
          deliveryLocation: true,
          quantityRequested: true,
          quantityDelivered: true,
          material: {
            select: {
              name: true,
              tier: true,
              materialType: true,
            },
          },
          requesterProfile: {
            select: { username: true, discordDisplayName: true },
          },
          assignedToProfile: {
            select: { username: true, discordDisplayName: true },
          },
        },
      }),
    ]);

    const requests: PackTrackerRequestRow[] = [
      ...assistance.map((item) => ({
        id: item.id,
        type: "Assistance" as const,
        title: item.title,
        detail:
          item.materialName && item.quantityNeeded
            ? `${item.quantityNeeded}x ${item.materialName}`
            : item.meetingLocation || item.description || "General assistance request",
        status: item.status,
        priority: item.priority,
        requester: profileName(item.createdByProfile),
        assignee: item.assignedToProfile ? profileName(item.assignedToProfile) : null,
        updatedAt: item.updatedAt,
        dueAt: item.dueAt,
        isPinned: item.isPinned,
      })),
      ...crafting.map((item) => ({
        id: item.id,
        type: "Crafting" as const,
        title: item.itemName || item.blueprint.craftedItemName || item.blueprint.blueprintName,
        detail: `${item.quantityRequested} requested / quality ${item.minimumQuality} / ${item.blueprint.category}`,
        status: item.status,
        priority: item.priority,
        requester: profileName(item.requesterProfile),
        assignee: item.assignedCrafterProfile
          ? profileName(item.assignedCrafterProfile)
          : null,
        updatedAt: item.updatedAt,
        dueAt: item.requiredBy,
        isPinned: item.isPinned,
      })),
      ...procurement.map((item) => ({
        id: item.id,
        type: "Procurement" as const,
        title: item.material.name,
        detail: `${Number(item.quantityDelivered).toLocaleString()} / ${Number(
          item.quantityRequested
        ).toLocaleString()} ${item.material.tier} ${item.material.materialType}`,
        status: item.status,
        priority: item.priority,
        requester: item.requesterProfile ? profileName(item.requesterProfile) : "Operations",
        assignee: item.assignedToProfile ? profileName(item.assignedToProfile) : null,
        updatedAt: item.updatedAt,
        dueAt: null,
        isPinned: item.isPinned,
      })),
    ]
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      })
      .slice(0, 40);

    return {
      kind: "ready",
      counts: {
        assistance: assistanceCount,
        crafting: craftingCount,
        procurement: procurementCount,
      },
      requests,
    };
  } catch (error) {
    return {
      kind: "pendingMigration",
      message: error instanceof Error ? error.message : "PackTracker requests are unavailable.",
    };
  }
}

export default async function PackTrackerRequestsPage() {
  const state = await getRequests();

  if (state.kind !== "ready") {
    return <PackTrackerUnavailable state={state} />;
  }

  const totalActive =
    state.counts.assistance + state.counts.crafting + state.counts.procurement;

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
              Operations Queue
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
              Requests
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              Assistance, crafting, and procurement requests are merged into one
              dispatch view for command and logistics.
            </p>
          </div>
          <Link className="btn btn-secondary" href="/dashboard/packtracker/blueprints">
            Blueprints
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PackTrackerMetric label="Active Work" value={totalActive} icon={ClipboardList} />
        <PackTrackerMetric label="Assistance" value={state.counts.assistance} icon={Radio} />
        <PackTrackerMetric label="Crafting" value={state.counts.crafting} icon={Hammer} />
        <PackTrackerMetric label="Procurement" value={state.counts.procurement} icon={Boxes} />
      </section>

      <section className="card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-primary)]">
              Live Queue
            </p>
            <h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">
              Latest Requests
            </h2>
          </div>
          <Clock3 className="text-[var(--accent-primary)]" size={22} />
        </div>

        <div className="mt-5 divide-y divide-[var(--border-default)]">
          {state.requests.length === 0 ? (
            <p className="py-10 text-sm text-[var(--text-secondary)]">
              No PackTracker requests have been created yet.
            </p>
          ) : (
            state.requests.map((item) => (
              <article
                key={`${item.type}-${item.id}`}
                className="grid gap-4 py-5 lg:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={statusTone(item.status)}>
                      {formatPackTrackerStatus(item.status)}
                    </StatusPill>
                    <StatusPill tone={item.priority >= 2 ? "warning" : "neutral"}>
                      {formatPackTrackerPriority(item.priority)}
                    </StatusPill>
                    {item.isPinned && <StatusPill tone="warning">Pinned</StatusPill>}
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-[var(--text-primary)]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {item.type} / {item.detail}
                  </p>
                </div>
                <dl className="grid min-w-[260px] grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Requester
                    </dt>
                    <dd className="mt-1 font-semibold text-[var(--text-primary)]">
                      {item.requester}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Assignee
                    </dt>
                    <dd className="mt-1 font-semibold text-[var(--text-primary)]">
                      {item.assignee || "Unassigned"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Updated
                    </dt>
                    <dd className="mt-1 font-semibold text-[var(--text-primary)]">
                      {formatDate(item.updatedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Due
                    </dt>
                    <dd className="mt-1 font-semibold text-[var(--text-primary)]">
                      {formatDate(item.dueAt)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
