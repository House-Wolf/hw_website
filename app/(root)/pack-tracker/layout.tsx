"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  LayoutDashboard,
  Package,
  TrendingUp,
  Hammer,
  Globe,
  ChevronLeft,
  Award,
  HelpCircle,
  ShoppingCart,
  MessageCircle,
} from "lucide-react";

const navGroups = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard",        href: "/pack-tracker/dashboard",   icon: LayoutDashboard },
      { label: "Assistance Hub",   href: "/pack-tracker/assistance",  icon: HelpCircle },
      { label: "Crafting Queue",   href: "/pack-tracker/crafting",    icon: Hammer },
      { label: "Procurement",      href: "/pack-tracker/procurement", icon: ShoppingCart },
      { label: "Lobby Chat",       href: "/pack-tracker/chat",        icon: MessageCircle },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "Blueprints",       href: "/pack-tracker/blueprints",  icon: Package },
      { label: "Trading Hub",      href: "/pack-tracker/trading",     icon: TrendingUp },
      { label: "Medals",           href: "/pack-tracker/medals",      icon: Award },
    ],
  },
];

export default function PackTrackerLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/pack-tracker/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div
      className="flex min-h-[calc(100dvh-8rem)] md:min-h-[calc(100dvh-9rem)]"
      style={{ background: "var(--background-base)" }}>
      {/* Sidebar */}
      <aside
        className="shrink-0 flex flex-col border-r transition-all duration-300"
        style={{
          width: collapsed ? "3.5rem" : "13rem",
          background: "var(--background-elevated)",
          borderColor: "var(--border-crimson)",
        }}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-3 border-b shrink-0"
          style={{ borderColor: "var(--border-crimson)" }}>
          {!collapsed && (
            <span
              className="text-xs font-bold uppercase tracking-widest truncate"
              style={{ color: "var(--accent-primary)" }}>
              PackTracker
            </span>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1 rounded transition-colors ml-auto"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-secondary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
            {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-1.5 py-3 space-y-3">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-2.5 mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ label, href, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={collapsed ? label : undefined}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all"
                      style={
                        active
                          ? {
                              background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)",
                              color: "var(--text-primary)",
                              boxShadow: "var(--shadow-crimson)",
                            }
                          : { color: "var(--text-muted)" }
                      }
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "var(--text-primary)"; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "var(--text-muted)"; }}>
                      <Icon size={16} className="shrink-0" />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="border-t my-2" style={{ borderColor: "var(--border-subtle)" }} />

          <Link
            href="/"
            title={collapsed ? "Back to Site" : undefined}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
            <Globe size={16} className="shrink-0" />
            {!collapsed && <span>Back to Site</span>}
          </Link>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
