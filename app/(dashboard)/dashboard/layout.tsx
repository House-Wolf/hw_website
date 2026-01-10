"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
import { ThemeProvider } from "@/contexts/ThemeContext";
import { RANK_PRIORITY } from "@/lib/role-constants";

type UserRole = {
  discordRole: {
    id: string;
    name: string;
    color: number | null;
    position: number | null;
  };
};

type UserData = {
  discordUsername: string;
  discordDisplayName: string | null;
  name: string | null;
  avatarUrl: string | null;
  image: string | null;
  roles: UserRole[];
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/user/profile')
      .then(res => res.json())
      .then(data => {
        setUserData(data);
      })
      .catch(() => {
        // Silently fail, will show defaults
      });
  }, []);

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

  // Determine user's rank and division
  const getUserRank = () => {
    if (!userData?.roles) return "Dragoon";
    const roleNames = new Set(userData.roles.map(r => r.discordRole.name));
    return RANK_PRIORITY.find(rank => roleNames.has(rank)) || "Dragoon";
  };

  const getUserDivision = () => {
    if (!userData?.roles) return "Dragoon Division";

    const roleNames = new Set(userData.roles.map(r => r.discordRole.name));

    // Check subdivision roles to determine division
    // Priority order: Command roles first, then regular subdivision roles

    // TACOPS
    if (roleNames.has("TACOPS - Command")) return "TACOPS Command";
    if (roleNames.has("TACOPS - Dire Wolfs") || roleNames.has("TACOPS - Howlers")) return "TACOPS";

    // SPECOPS
    if (roleNames.has("SPECOPS - Command")) return "SPECOPS Command";
    if (roleNames.has("SPECOPS - Wolfen") || roleNames.has("SPECOPS - Medic") || roleNames.has("SPECOPS - Inquisitor")) return "SPECOPS";

    // LOCOPS
    if (roleNames.has("LOCOPS - Command")) return "LOCOPS Command";
    if (roleNames.has("LOCOPS - Heavy Lift") || roleNames.has("LOCOPS - Salvage") || roleNames.has("LOCOPS - Mining") || roleNames.has("LOCOPS - Engineer")) return "LOCOPS";

    // ARCOPS
    if (roleNames.has("ARCOPS - Command")) return "ARCOPS Command";
    if (roleNames.has("ARCOPS - Chimeras") || roleNames.has("ARCOPS - Wayfinders") || roleNames.has("ARCOPS - Replicators")) return "ARCOPS";

    // House Wolf Command
    if (roleNames.has("Leadership Core") || roleNames.has("Officers") || roleNames.has("Non-Commissioned Officers")) return "House Wolf Command";

    return "Dragoon Division";
  };

  const discordColorToHex = (color: number | null | undefined): string | null => {
    if (color === null || color === undefined) return null;
    return `#${color.toString(16).padStart(6, "0")}`;
  };

  const getDivisionColor = () => {
    if (!userData?.roles) return "var(--accent-secondary)";

    // Map division names to role names to find the color
    const divisionRoleMap: Record<string, string[]> = {
      "TACOPS Command": ["TACOPS - Command"],
      "TACOPS": ["TACOPS - Dire Wolfs", "TACOPS - Howlers"],
      "SPECOPS Command": ["SPECOPS - Command"],
      "SPECOPS": ["SPECOPS - Wolfen", "SPECOPS - Medic", "SPECOPS - Inquisitor"],
      "LOCOPS Command": ["LOCOPS - Command"],
      "LOCOPS": ["LOCOPS - Heavy Lift", "LOCOPS - Salvage", "LOCOPS - Mining", "LOCOPS - Engineer"],
      "ARCOPS Command": ["ARCOPS - Command"],
      "ARCOPS": ["ARCOPS - Chimeras", "ARCOPS - Wayfinders", "ARCOPS - Replicators"],
      "House Wolf Command": ["Leadership Core", "Officers", "Non-Commissioned Officers"],
    };

    const division = getUserDivision();
    const roleNamesToCheck = divisionRoleMap[division];

    if (roleNamesToCheck) {
      for (const roleName of roleNamesToCheck) {
        const role = userData.roles.find(r => r.discordRole.name === roleName);
        if (role?.discordRole.color) {
          const hexColor = discordColorToHex(role.discordRole.color);
          return hexColor || "var(--accent-secondary)";
        }
      }
    }

    return "var(--accent-secondary)";
  };

  const userAvatar = userData?.avatarUrl || userData?.image || "https://cdn.discordapp.com/embed/avatars/0.png";
  const userRank = getUserRank();
  const userDivision = getUserDivision();
  const divisionColor = getDivisionColor();

  return (
    <ThemeProvider>
      <div id="dashboard-theme-container" className="flex h-[calc(100dvh-4rem)] md:h-[calc(100dvh-5rem)] bg-background text-foreground overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "w-64" : "w-16 md:w-20"
          } h-full min-h-0 bg-background-elevated border-r border-border transition-all duration-300 flex flex-col shrink-0`}
        >
        {/* Header */}
        <div
          className={`shrink-0 flex items-center ${
            sidebarOpen ? "justify-between" : "justify-center"
          } p-3 md:p-4 border-b`}
          style={{
            borderBottomColor: "var(--border-crimson)",
            background: "linear-gradient(180deg, rgba(var(--accent-primary-rgb), 0.05) 0%, transparent 100%)"
          }}
        >
          <h1
            className={`font-bold text-base md:text-lg tracking-widest uppercase transition-all duration-200 ${
              sidebarOpen ? "opacity-100" : "opacity-0 w-0 hidden"
            }`}
            style={{ color: "var(--accent-primary)" }}
          >
            House Wolf
          </h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`text-foreground-muted transition-all duration-200 hover:scale-110 cursor-pointer ${
              sidebarOpen ? "" : "p-2"
            } focus:outline-none focus:ring-2 rounded-md`}
            style={{
              "--tw-ring-color": "var(--accent-primary)"
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--accent-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)";
            }}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <Menu size={20} className="md:w-[22px] md:h-[22px]" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-2 mt-4 md:mt-6 space-y-1.5 md:space-y-2">
          {/* Dashboard Pages */}
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2.5 md:py-3 rounded-md text-xs md:text-sm font-medium transition-all duration-300 ${
                  active
                    ? ""
                    : "hover:bg-background-soft text-foreground-muted hover:text-foreground"
                }`}
                style={
                  active
                    ? {
                        background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)",
                        color: "var(--text-primary)",
                        boxShadow: "var(--shadow-crimson)",
                        borderLeft: "3px solid var(--accent-primary-hover)",
                      }
                    : undefined
                }
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
        <div className="shrink-0 p-2 md:p-4 border-t flex flex-col items-center gap-2 md:gap-3"
          style={{
            borderTopColor: "var(--border-crimson)",
            background: "linear-gradient(180deg, transparent 0%, rgba(var(--accent-primary-rgb), 0.05) 100%)"
          }}
        >
        <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 transition-all duration-300"
          style={{
            borderColor: "var(--accent-primary)",
            boxShadow: "var(--shadow-crimson), 0 0 16px rgba(var(--accent-primary-rgb), 0.4)"
          }}
        >
          <Image
            src={userAvatar}
            alt="User avatar"
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>

          {sidebarOpen && (
            <>
              <span className="text-xs md:text-sm font-semibold text-foreground text-center truncate w-full px-2">
                {userRank}
              </span>
              <span className="text-[10px] md:text-xs font-mono font-medium text-center uppercase tracking-wider"
                style={{ color: divisionColor }}
              >
                {userDivision}
              </span>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top bar */}
        <header className="shrink-0 px-4 md:px-6 lg:px-8 py-3 md:py-4 border-b shadow-md"
          style={{
            borderBottomColor: "var(--border-crimson)",
            backgroundColor: "var(--background-card)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3), inset 0 -1px 0 var(--border-crimson)"
          }}
        >
          {pathname === "/dashboard/admin" ? (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-[var(--accent-primary)]/15 border flex items-center justify-center"
                style={{
                  borderColor: "var(--accent-primary)",
                  boxShadow: "0 0 12px rgba(var(--accent-primary-rgb), 0.3)"
                }}
              >
                <Shield className="text-[var(--accent-primary)]" size={18} />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-bold tracking-widest uppercase"
                  style={{
                    color: "var(--accent-primary)",
                    textShadow: "0 0 20px rgba(var(--accent-primary-rgb), 0.4)"
                  }}
                >
                  Admin Panel
                </h2>
                <p className="text-xs md:text-sm text-foreground-muted">
                  Manage dossiers, divisions, users, suspensions, and audit logs.
                </p>
              </div>
            </div>
          ) : (
            <h2 className="text-base md:text-lg font-bold tracking-widest uppercase truncate"
              style={{
                color: "var(--accent-primary)",
                textShadow: "0 0 20px rgba(var(--accent-primary-rgb), 0.4)"
              }}
            >
              {pathname === "/dashboard/marketplace"
                ? "Marketplace Management"
                : pathname === "/dashboard/profile"
                ? "Mercenary Bio"
                : pathname === "/dashboard/settings"
                ? "Settings"
                : "Command Center"}
            </h2>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-background p-3 md:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
    </ThemeProvider>
  );
}
