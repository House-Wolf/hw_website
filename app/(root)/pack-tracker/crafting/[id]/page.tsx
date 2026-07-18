import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCraftingRequestById } from "@/lib/packtracker/crafting";
import { PTStatusBadge, PTPriorityDot } from "@/components/pack-tracker/PTStatusBadge";
import PTRequestCommentThread from "@/components/pack-tracker/PTRequestCommentThread";
import PTRequestActionBar from "@/components/pack-tracker/PTRequestActionBar";
import PTProcurementRequestCard from "@/components/pack-tracker/PTProcurementRequestCard";
import { ChevronLeft, Hammer, Package, MapPin, Gift, Calendar } from "lucide-react";

const SUPPLY_LABELS: Record<string, string> = {
  REQUESTER_WILL_SUPPLY: "Requester Supplies",
  CRAFTER_MUST_SUPPLY:   "Crafter Supplies",
  NEGOTIABLE:            "Negotiable",
};

export default async function CraftingRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const { id } = await params;
  const request = await getCraftingRequestById(id);
  if (!request) notFound();

  const userId = session.user.id!;
  const claimedByUser = request.claims.some((c) => c.profileId === userId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/pack-tracker/crafting" className="flex items-center gap-1 text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
        <ChevronLeft size={14} /> Crafting Queue
      </Link>

      <div className="rounded-xl border p-6 space-y-4"
        style={{ background: "var(--background-card)", borderColor: "var(--border-default)" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center border shrink-0"
            style={{ background: "rgba(71,0,0,0.15)", borderColor: "var(--border-crimson)" }}>
            <Hammer size={18} style={{ color: "var(--accent-primary)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <PTStatusBadge status={request.status} />
              <PTPriorityDot priority={request.priority} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              {request.itemName}
              {request.quantityRequested > 1 && (
                <span className="ml-2 text-base font-normal" style={{ color: "var(--text-muted)" }}>×{request.quantityRequested}</span>
              )}
            </h1>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Blueprint: <span style={{ color: "var(--accent-secondary)" }}>{request.blueprint.name}</span>
              {" · "}Posted by{" "}
              <span style={{ color: "var(--text-secondary)" }}>
                {request.createdBy.discordDisplayName ?? request.createdBy.discordUsername}
              </span>{" "}
              · {new Date(request.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Detail rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-md px-3 py-2" style={{ background: "var(--background-elevated)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Material Supply</p>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{SUPPLY_LABELS[request.materialSupplyMode] ?? request.materialSupplyMode}</p>
          </div>
          <div className="rounded-md px-3 py-2" style={{ background: "var(--background-elevated)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Min Quality</p>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{request.minimumQuality}%</p>
          </div>
          {request.deliveryLocation && (
            <div className="rounded-md px-3 py-2" style={{ background: "var(--background-elevated)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                <MapPin size={10} className="inline mr-1" />Delivery
              </p>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{request.deliveryLocation}</p>
            </div>
          )}
          {request.rewardOffered && (
            <div className="rounded-md px-3 py-2" style={{ background: "var(--background-elevated)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                <Gift size={10} className="inline mr-1" />Reward
              </p>
              <p className="text-sm font-medium" style={{ color: "#4ADE80" }}>{request.rewardOffered}</p>
            </div>
          )}
          {request.requiredBy && (
            <div className="rounded-md px-3 py-2" style={{ background: "var(--background-elevated)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                <Calendar size={10} className="inline mr-1" />Required By
              </p>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{new Date(request.requiredBy).toLocaleString()}</p>
            </div>
          )}
          {request.assignedCrafter && (
            <div className="rounded-md px-3 py-2" style={{ background: "rgba(26,95,58,0.15)", border: "1px solid rgba(74,222,128,0.3)" }}>
              <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Assigned Crafter</p>
              <p className="text-sm font-medium" style={{ color: "#4ADE80" }}>
                {request.assignedCrafter.discordDisplayName ?? request.assignedCrafter.discordUsername}
              </p>
            </div>
          )}
        </div>

        {request.notes && (
          <div className="rounded-lg p-4" style={{ background: "var(--background-elevated)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Notes</p>
            <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{request.notes}</p>
          </div>
        )}

        {/* Blueprint materials */}
        {request.blueprint.recipeMaterials.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
              <Package size={12} className="inline mr-1" />
              Blueprint Materials
            </p>
            <div className="flex flex-wrap gap-2">
              {request.blueprint.recipeMaterials.map((rm) => (
                <span key={rm.id} className="text-xs px-2 py-1 rounded border" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", background: "var(--background-elevated)" }}>
                  {rm.quantity} {rm.unit ?? "SCU"} {rm.material.name}
                  {rm.isOptional && " (optional)"}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <PTRequestActionBar
          requestType="crafting"
          requestId={request.id}
          status={request.status}
          isPinned={request.isPinned}
          currentUserId={userId}
          createdById={request.createdById}
          claimedByCurrentUser={claimedByUser}
          claimsCount={request.claims.length}
          maxClaims={request.maxClaims}
          showPin
        />
      </div>

      {/* Linked Procurement */}
      {request.linkedProcurementRequests.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>
            Linked Procurement Requests
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {request.linkedProcurementRequests.map((pr) => (
              <PTProcurementRequestCard key={pr.id} request={pr as any} />
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="rounded-xl border p-6"
        style={{ background: "var(--background-card)", borderColor: "var(--border-default)" }}>
        <PTRequestCommentThread
          comments={request.comments.map((c) => ({
            ...c,
            createdAt: c.createdAt.toISOString(),
            editedAt: c.editedAt?.toISOString() ?? null,
          }))}
          currentUserId={userId}
          requestType="crafting"
          requestId={request.id}
        />
      </div>
    </div>
  );
}
