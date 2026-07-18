import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAssistanceRequestById } from "@/lib/packtracker/assistance";
import { PTStatusBadge, PTPriorityDot } from "@/components/pack-tracker/PTStatusBadge";
import PTRequestCommentThread from "@/components/pack-tracker/PTRequestCommentThread";
import PTRequestActionBar from "@/components/pack-tracker/PTRequestActionBar";
import { ChevronLeft, HelpCircle, Users, Clock, MapPin, Gift, Mic } from "lucide-react";

const KIND_LABELS: Record<string, string> = {
  MINING_MATERIALS: "Mining Materials",
  TRADING_GOODS:    "Trading Goods",
  SHIP_COMPONENTS:  "Ship Components",
  MISSION_BACKUP:   "Mission Backup",
  CARGO_ESCORT:     "Cargo Escort",
  COMBAT_SUPPORT:   "Combat Support",
  SHIP_CREW:        "Ship Crew",
  TRANSPORTATION:   "Transportation",
  LOCATION_SCOUT:   "Location Scout",
  GUIDANCE:         "Guidance",
  EVENT_SUPPORT:    "Event Support",
  OTHER:            "Other",
};

export default async function AssistanceRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const { id } = await params;
  const request = await getAssistanceRequestById(id);
  if (!request) notFound();

  const userId = session.user.id!;
  const claimedByUser = request.claims.some((c) => c.profileId === userId);
  const claimsCount = request.claims.length;

  const detailRows = [
    request.playerHandle && { label: "RSI Handle", value: request.playerHandle },
    request.timezone && { label: "Timezone", value: request.timezone },
    request.availability && { label: "Availability", value: request.availability },
    request.assetsShips && { label: "Assets / Ships", value: request.assetsShips },
    request.meetingLocation && { label: "Meeting Location", value: request.meetingLocation, icon: MapPin },
    request.rewardOffered && { label: "Reward", value: request.rewardOffered, icon: Gift },
    request.hasMicrophone != null && { label: "Microphone", value: request.hasMicrophone ? "Yes" : "No", icon: Mic },
    request.urgency && { label: "Urgency", value: request.urgency },
    request.groupPreference && { label: "Group Preference", value: request.groupPreference },
    request.dueAt && { label: "Due Date", value: new Date(request.dueAt).toLocaleString(), icon: Clock },
  ].filter(Boolean) as { label: string; value: string; icon?: any }[];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/pack-tracker/assistance" className="flex items-center gap-1 text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
        <ChevronLeft size={14} /> Assistance Hub
      </Link>

      <div className="rounded-xl border p-6 space-y-4"
        style={{ background: "var(--background-card)", borderColor: "var(--border-default)" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center border shrink-0"
            style={{ background: "rgba(71,0,0,0.15)", borderColor: "var(--border-crimson)" }}>
            <HelpCircle size={18} style={{ color: "var(--accent-primary)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded border" style={{ background: "rgba(71,0,0,0.2)", color: "var(--accent-secondary)", borderColor: "var(--border-crimson)" }}>
                {KIND_LABELS[request.kind] ?? request.kind}
              </span>
              <PTStatusBadge status={request.status} />
              <PTPriorityDot priority={request.priority} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{request.title}</h1>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Posted by{" "}
              <span style={{ color: "var(--text-secondary)" }}>
                {request.createdBy.discordDisplayName ?? request.createdBy.discordUsername}
              </span>{" "}
              · {new Date(request.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {request.description && (
          <div className="rounded-lg p-4" style={{ background: "var(--background-elevated)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{request.description}</p>
          </div>
        )}

        {/* Detail grid */}
        {detailRows.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {detailRows.map(({ label, value }) => (
              <div key={label} className="rounded-md px-3 py-2" style={{ background: "var(--background-elevated)", border: "1px solid var(--border-subtle)" }}>
                <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Claims */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
            <Users size={12} className="inline mr-1" />
            Helpers ({claimsCount}/{request.maxClaims})
          </p>
          <div className="flex flex-wrap gap-2">
            {request.claims.map((claim) => (
              <span key={claim.id} className="text-xs px-2 py-1 rounded-md border" style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", background: "var(--background-elevated)" }}>
                {(claim as any).profile?.discordDisplayName ?? (claim as any).profile?.discordUsername ?? "Unknown"}
              </span>
            ))}
            {claimsCount === 0 && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>No one has claimed this yet.</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <PTRequestActionBar
          requestType="assistance"
          requestId={request.id}
          status={request.status}
          isPinned={request.isPinned}
          currentUserId={userId}
          createdById={request.createdById}
          claimedByCurrentUser={claimedByUser}
          claimsCount={claimsCount}
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
          requestType="assistance"
          requestId={request.id}
        />
      </div>
    </div>
  );
}
