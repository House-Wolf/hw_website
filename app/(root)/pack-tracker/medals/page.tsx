import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMedalDefinitions, getMedalLeaderboard } from "@/lib/packtracker/medals";
import PTEmptyState from "@/components/pack-tracker/PTEmptyState";
import Image from "next/image";
import { Award, Star } from "lucide-react";

export const metadata = { title: "Medals — PackTracker" };

const TIER_STYLES = {
  BRONZE:   { color: "#CD7F32", glow: "0 0 12px rgba(205,127,50,0.3)" },
  SILVER:   { color: "#C0C0C0", glow: "0 0 12px rgba(192,192,192,0.3)" },
  GOLD:     { color: "#FFD700", glow: "0 0 12px rgba(255,215,0,0.3)" },
  PLATINUM: { color: "#E5E4E2", glow: "0 0 12px rgba(229,228,226,0.4)" },
} as const;

export default async function MedalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  const [medals, leaderboard] = await Promise.all([getMedalDefinitions(), getMedalLeaderboard(10)]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center border"
          style={{ background: "rgba(255,215,0,0.1)", borderColor: "rgba(255,215,0,0.3)", boxShadow: "0 0 12px rgba(255,215,0,0.2)" }}>
          <Award size={18} style={{ color: "#FFD700" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest" style={{ color: "#FFD700" }}>
            Medals & Recognition
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Outstanding contributions to House Wolf operations
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Medal definitions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
            Available Medals
          </h2>

          {medals.length === 0 ? (
            <PTEmptyState
              icon={Award}
              title="No medals defined"
              description="Medal definitions can be created by administrators."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {medals.map((medal) => {
                const style = TIER_STYLES[medal.tier];
                return (
                  <div
                    key={medal.id}
                    className="rounded-lg border p-4 flex items-start gap-3"
                    style={{
                      background: "var(--background-card)",
                      borderColor: `${style.color}44`,
                      boxShadow: style.glow,
                    }}>
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border"
                      style={{ background: `${style.color}15`, borderColor: `${style.color}44` }}>
                      {medal.imageUrl ? (
                        <Image src={medal.imageUrl} alt={medal.name} width={28} height={28} className="rounded-full object-cover" />
                      ) : (
                        <Star size={18} style={{ color: style.color }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                          {medal.name}
                        </h3>
                        <span className="text-[10px] font-bold uppercase" style={{ color: style.color }}>
                          {medal.tier}
                        </span>
                      </div>
                      <p className="text-xs line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                        {medal.description}
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                        Awarded {medal._count.awards} time{medal._count.awards !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
            Top Recipients
          </h2>

          {leaderboard.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No medals awarded yet.</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, i) => {
                if (!entry.user) return null;
                const avatar = entry.user.avatarUrl ?? "https://cdn.discordapp.com/embed/avatars/0.png";
                const name = entry.user.discordDisplayName || entry.user.discordUsername;
                const rankColor = i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "var(--text-muted)";
                return (
                  <div
                    key={entry.user.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                    style={{ background: "var(--background-card)", borderColor: "var(--border-subtle)" }}>
                    <span className="w-6 text-center text-xs font-bold" style={{ color: rankColor }}>
                      #{i + 1}
                    </span>
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border shrink-0"
                      style={{ borderColor: "var(--border-crimson)" }}>
                      <Image src={avatar} alt={name} fill sizes="32px" className="object-cover" />
                    </div>
                    <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {name}
                    </span>
                    <span className="text-xs font-bold" style={{ color: "#FFD700" }}>
                      {entry.totalMedals}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
