import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getDashboardData } from "@/lib/packtracker/dashboard";
import { LayoutDashboard, ClipboardList, CheckCircle2, Loader2, HelpCircle, Hammer, ShoppingCart, Pin } from "lucide-react";

export const metadata = { title: "Dashboard — PackTracker" };

export default async function PackTrackerDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin");

  const data = await getDashboardData(session.user.id);
  const { counts, pinned, myActiveTasks, myOpenRequests } = data;

  const stats = [
    {
      label: "Open Requests",
      value: counts.totalOpen,
      icon: ClipboardList,
      accent: "#60A5FA",
      glow: "0 0 20px rgba(96,165,250,0.15)",
      sub: `${counts.openAssistance} assist · ${counts.openCrafting} craft · ${counts.openProcurement} proc`,
    },
    {
      label: "In Progress",
      value: counts.totalInProgress,
      icon: Loader2,
      accent: "#FBBF24",
      glow: "0 0 20px rgba(251,191,36,0.15)",
    },
    {
      label: "Completed Today",
      value: counts.completedToday,
      icon: CheckCircle2,
      accent: "#4ADE80",
      glow: "0 0 20px rgba(74,222,128,0.15)",
    },
  ];

  const hasPinned =
    pinned.assistance.length > 0 || pinned.crafting.length > 0 || pinned.procurement.length > 0;
  const hasMyTasks =
    myActiveTasks.assistance.length > 0 ||
    myActiveTasks.crafting.length > 0 ||
    myActiveTasks.procurement.length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center border"
          style={{ background: "rgba(71,0,0,0.15)", borderColor: "var(--border-crimson)", boxShadow: "var(--shadow-crimson)" }}>
          <LayoutDashboard size={20} style={{ color: "var(--accent-primary)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold uppercase tracking-widest" style={{ color: "var(--accent-primary)" }}>
            Operations Dashboard
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Live status across all PackTracker operations
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, accent, glow, sub }) => (
          <div
            key={label}
            className="rounded-lg border p-5 flex items-center gap-4"
            style={{ background: "var(--background-card)", borderColor: "var(--border-default)", boxShadow: "var(--shadow-sm)" }}>
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${accent}22`, border: `1px solid ${accent}44`, boxShadow: glow }}>
              <Icon size={22} style={{ color: accent }} />
            </div>
            <div>
              <p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
              <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
              {sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: "/pack-tracker/assistance/new", icon: HelpCircle, label: "New Assistance Request", color: "var(--accent-primary)" },
          { href: "/pack-tracker/crafting/new",   icon: Hammer,     label: "New Crafting Request",   color: "var(--accent-primary)" },
          { href: "/pack-tracker/procurement/new",icon: ShoppingCart,label: "New Procurement Request",color: "var(--accent-primary)" },
        ].map(({ href, icon: Icon, label, color }) => (
          <Link key={href} href={href}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-all hover:brightness-110"
            style={{ background: "rgba(71,0,0,0.1)", borderColor: "var(--border-crimson)", color }}>
            <Icon size={16} />
            <span className="text-sm font-semibold">{label}</span>
          </Link>
        ))}
      </div>

      {/* Pinned requests */}
      {hasPinned && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-secondary)" }}>
            <Pin size={13} style={{ color: "var(--accent-primary)" }} />
            Pinned Requests
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pinned.assistance.map((r) => (
              <Link key={r.id} href={`/pack-tracker/assistance/${r.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-all hover:brightness-110"
                style={{ background: "var(--background-card)", borderColor: "var(--accent-primary)" }}>
                <HelpCircle size={14} style={{ color: "var(--accent-primary)" }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{r.title}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Assistance · {r.status.replace("_", " ")}</p>
                </div>
              </Link>
            ))}
            {pinned.crafting.map((r) => (
              <Link key={r.id} href={`/pack-tracker/crafting/${r.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-all hover:brightness-110"
                style={{ background: "var(--background-card)", borderColor: "var(--accent-primary)" }}>
                <Hammer size={14} style={{ color: "var(--accent-primary)" }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{r.itemName}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Crafting · {r.status.replace("_", " ")}</p>
                </div>
              </Link>
            ))}
            {pinned.procurement.map((r) => (
              <Link key={r.id} href={`/pack-tracker/procurement/${r.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-all hover:brightness-110"
                style={{ background: "var(--background-card)", borderColor: "var(--accent-primary)" }}>
                <ShoppingCart size={14} style={{ color: "#60A5FA" }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{r.materialName}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Procurement · {r.status.replace("_", " ")}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* My active tasks */}
      {hasMyTasks && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-secondary)" }}>
            My Active Tasks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myActiveTasks.assistance.map((r) => (
              <Link key={r.id} href={`/pack-tracker/assistance/${r.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-all hover:brightness-110"
                style={{ background: "var(--background-card)", borderColor: "var(--border-default)" }}>
                <HelpCircle size={14} style={{ color: "var(--accent-primary)" }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{r.title}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Assistance · {r.status.replace("_", " ")}</p>
                </div>
              </Link>
            ))}
            {myActiveTasks.crafting.map((r) => (
              <Link key={r.id} href={`/pack-tracker/crafting/${r.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-all hover:brightness-110"
                style={{ background: "var(--background-card)", borderColor: "var(--border-default)" }}>
                <Hammer size={14} style={{ color: "var(--accent-primary)" }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{r.itemName}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Crafting · {r.status.replace("_", " ")}</p>
                </div>
              </Link>
            ))}
            {myActiveTasks.procurement.map((r) => (
              <Link key={r.id} href={`/pack-tracker/procurement/${r.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-all hover:brightness-110"
                style={{ background: "var(--background-card)", borderColor: "var(--border-default)" }}>
                <ShoppingCart size={14} style={{ color: "#60A5FA" }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{r.materialName}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Procurement · {r.status.replace("_", " ")}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* My open requests */}
      {(myOpenRequests.assistance.length > 0 || myOpenRequests.crafting.length > 0 || myOpenRequests.procurement.length > 0) && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-secondary)" }}>
            My Open Requests
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myOpenRequests.assistance.map((r) => (
              <Link key={r.id} href={`/pack-tracker/assistance/${r.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-all hover:brightness-110"
                style={{ background: "var(--background-card)", borderColor: "var(--border-default)" }}>
                <HelpCircle size={14} style={{ color: "var(--accent-primary)" }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{r.title}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Assistance · {r.status.replace("_", " ")}</p>
                </div>
              </Link>
            ))}
            {myOpenRequests.crafting.map((r) => (
              <Link key={r.id} href={`/pack-tracker/crafting/${r.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-all hover:brightness-110"
                style={{ background: "var(--background-card)", borderColor: "var(--border-default)" }}>
                <Hammer size={14} style={{ color: "var(--accent-primary)" }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                    {(r as any).blueprint?.name ?? r.itemName}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Crafting · {r.status.replace("_", " ")}</p>
                </div>
              </Link>
            ))}
            {myOpenRequests.procurement.map((r) => (
              <Link key={r.id} href={`/pack-tracker/procurement/${r.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-all hover:brightness-110"
                style={{ background: "var(--background-card)", borderColor: "var(--border-default)" }}>
                <ShoppingCart size={14} style={{ color: "#60A5FA" }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{r.materialName}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Procurement · {r.status.replace("_", " ")}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!hasPinned && !hasMyTasks && counts.totalOpen === 0 && (
        <div className="rounded-xl border p-12 text-center"
          style={{ borderColor: "var(--border-default)", background: "var(--background-card)" }}>
          <p className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No active operations</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Post an assistance, crafting, or procurement request to get started.
          </p>
        </div>
      )}
    </div>
  );
}
