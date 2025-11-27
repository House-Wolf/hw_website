"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Store,
  Settings,
  Home,
  ExternalLink,
  Globe,
  IdCard,
  Shield,
  Swords,
  Users,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  const navItems = [
    { name: "Command Center", icon: Home, href: "/dashboard" },
    { name: "Marketplace", icon: Store, href: "/dashboard/marketplace" },
    { name: "Mercenary Bio", icon: IdCard, href: "/dashboard/profile" },
    { name: "Settings", icon: Settings, href: "/dashboard/settings" },
  ];

  const externalLinks = [
    { name: "Public Marketplace", icon: ExternalLink, href: "/marketplace" },
    { name: "Site Home", icon: Globe, href: "/" },
    { name: "Divisions", icon: Swords, href: "/divisions" },
    { name: "Admin Panel", icon: Shield, href: "/dashboard/admin" },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16 md:w-20"
        } bg-background-elevated border-r border-border transition-all duration-300 flex flex-col shrink-0`}
      >
        {/* Header */}
        <div
          className={`flex items-center ${
            sidebarOpen ? "justify-between" : "justify-center"
          } p-3 md:p-4 border-b border-border-subtle`}
        >
          <h1
            className={`text-accent font-bold text-base md:text-lg tracking-widest uppercase transition-all duration-200 ${
              sidebarOpen ? "opacity-100" : "opacity-0 w-0 hidden"
            }`}
          >
            House Wolf
          </h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`text-foreground-muted hover:text-accent transition-all duration-200 hover:scale-110 ${
              sidebarOpen ? "" : "p-2"
            } focus:outline-none focus:ring-2 focus:ring-accent rounded-md`}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <Menu size={20} className="md:w-[22px] md:h-[22px]" />
          </button>
        </div>

        {/* Nav */}
        <nav className="grow px-2 mt-4 md:mt-6 space-y-1.5 md:space-y-2">
          {/* Dashboard Pages */}
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2.5 md:py-3 rounded-md text-xs md:text-sm font-medium transition-all ${
                  active
                    ? "bg-linear-to-r from-crimson to-crimson-light text-foreground shadow-crimson"
                    : "hover:bg-background-soft text-foreground-muted hover:text-foreground"
                }`}
              >
                <Icon size={16} className="md:w-[18px] md:h-[18px] shrink-0" />
                {sidebarOpen && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}

          {/* Divider */}
          {sidebarOpen && (
            <div className="border-t border-border-subtle my-3 md:my-4"></div>
          )}

          {/* External Links */}
          {externalLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2.5 md:py-3 rounded-md text-xs md:text-sm font-medium transition-all hover:bg-background-soft text-foreground-muted hover:text-foreground"
              >
                <Icon size={16} className="md:w-[18px] md:h-[18px] shrink-0" />
                {sidebarOpen && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 md:p-4 border-t border-border-subtle flex flex-col items-center gap-2 md:gap-3">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-linear-to-br from-crimson to-crimson-light flex items-center justify-center shadow-crimson">
          <Users size={20} className="text-foreground" />
        </div>

          {sidebarOpen && (
            <>
              <span className="text-xs md:text-sm font-semibold text-foreground text-center truncate w-full px-2">
                Dragoon
              </span>
              <span className="text-[10px] md:text-xs text-accent-secondary font-mono font-medium text-center uppercase tracking-wider">
                Warrior
              </span>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-y-auto min-w-0">
        {/* Top bar */}
        <header className="flex justify-between items-center px-4 md:px-6 lg:px-8 py-3 md:py-4 border-b border-border bg-background-card shadow-md">
          <h2 className="text-base md:text-lg font-bold text-accent tracking-widest uppercase truncate">
            {pathname === "/dashboard/marketplace"
              ? "Marketplace Management"
              : pathname === "/dashboard/profile"
              ? "Mercenary Bio"
              : pathname === "/dashboard/settings"
              ? "Settings"
              : pathname === "/dashboard/admin"
              ? "Admin Panel"
              : "Command Center"}
          </h2>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-background p-3 md:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
