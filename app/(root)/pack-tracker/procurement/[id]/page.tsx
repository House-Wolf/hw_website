import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getProcurementRequestById } from "@/lib/packtracker/procurement";
import { PTStatusBadge, PTPriorityDot } from "@/components/pack-tracker/PTStatusBadge";
import PTRequestCommentThread from "@/components/pack-tracker/PTRequestCommentThread";
import PTRequestActionBar from "@/components/pack-tracker/PTRequestActionBar";
import { ChevronLeft, ShoppingCart, MapPin, Gift, CheckCircle2 } from "lucide-react";

const FORM_LABELS: Record<string, string> = {
  ANY: "Any", REFINED: "Refined", RAW: "Raw Ore",
};

export default async function ProcurementRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const { id } = await params;
  const request = await getProcurementRequestById(id);
  if (!request) notFound();

  const userId = session.user.id!;
  const claimedByUser = request.claims.some((c) => c.profileId === userId);
  const deliveryPct = request.quantityRequested > 0
    ? Math.min(100, Math.round((request.quantityDelivered / request.quantityRequested) * 100))
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/pack-tracker/procurement" className="flex items-center gap-1 text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
        <ChevronLeft size={14} /> Procurement Queue
      </Link>

      <div className="rounded-xl border p-6 space-y-4"
        style={{ background: "var(--background-card)", borderColor: "var(--border-default)" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center border shrink-0"
            style={{ background: "rgba(10,40,60,0.2)", borderColor: "rgba(17,78,98,0.5)" }}>
            <ShoppingCart size={18} style={{ color: "#60A5FA" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <PTStatusBadge status={request.status} />
              <PTPriorityDot priority={request.priority} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              {request.materialName}
            </h1>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Posted by{" "}
              <span style={{ color: "var(--text-secondary)" }}>
                {request.createdBy.discordDisplayName ?? request.createdBy.discordUsername}
              </span>{" "}
              · {new Date(request.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="flex items-center gap-1">
              <CheckCircle2 size={12} />
              Delivery progress
            </span>
            <span style={{ color: request.quantityDelivered >= request.quantityRequested ? "#4ADE80" : "var(--text-primary)" }}>
              {request.quantityDelivered} / {request.quantityRequested} SCU
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${deliveryPct}%`, background: "#4ADE80" }} />
          </div>
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-md px-3 py-2" style={{ background: "var(--background-elevated)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Form</p>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{FORM_LABELS[request.preferredForm] ?? request.preferredForm}</p>
          </div>
          <div className="rounded-md px-3 py-2" style={{ background: "var(--background-elevated)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Min Quality</p>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{request.minimumQuality}%</p>
          </div>
          {request.deliveryLocation && (
            <div className="rounded-md px-3 py-2" style={{ background: "var(--background-elevated)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                <MapPin size={10} className="inline mr-1" />Delivery Location
              </p>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{request.deliveryLocation}</p>
            </div>
          )}
          {request.rewardOffered && (
            <div className="rounded-md px-3 py-2" style={{ background: "rgba(26,95,58,0.15)", border: "1px solid rgba(74,222,128,0.3)" }}>
              <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                <Gift size={10} className="inline mr-1" />Reward
              </p>
              <p className="text-sm font-medium" style={{ color: "#4ADE80" }}>{request.rewardOffered}</p>
            </div>
          )}
          {request.linkedCraftingRequest && (
            <div className="rounded-md px-3 py-2 col-span-full" style={{ background: "var(--background-elevated)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Linked Crafting Request</p>
              <Link href={`/pack-tracker/crafting/${request.linkedCraftingRequest.id}`}
                className="text-sm font-medium hover:underline" style={{ color: "var(--accent-secondary)" }}>
                {request.linkedCraftingRequest.itemName}
              </Link>
            </div>
          )}
        </div>

        {request.notes && (
          <div className="rounded-lg p-4" style={{ background: "var(--background-elevated)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Notes</p>
            <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{request.notes}</p>
          </div>
        )}

        {/* Claims */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
            Suppliers ({request.claims.length}/{request.maxClaims})
          </p>
          <div className="flex flex-wrap gap-2">
            {request.claims.map((claim) => (
              <span key={claim.id} className="text-xs px-2 py-1 rounded-md border"
                style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", background: "var(--background-elevated)" }}>
                {(claim as any).profile?.discordDisplayName ?? (claim as any).profile?.discordUsername ?? "Unknown"}
              </span>
            ))}
            {request.claims.length === 0 && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>No one has claimed this yet.</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <PTRequestActionBar
          requestType="procurement"
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
          requestType="procurement"
          requestId={request.id}
        />
      </div>
    </div>
  );
}
