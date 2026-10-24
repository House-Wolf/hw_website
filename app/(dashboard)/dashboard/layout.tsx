"use client";

import "./dashboard.css";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Compass, ExternalLink, Home, IdCard, LogOut, Menu, PackageSearch, Palette, Settings, Shield, Store, Swords, X, type LucideIcon } from "lucide-react";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { DashboardProfileProvider, useDashboardProfile } from "@/contexts/DashboardContext";
import { getTheme } from "@/lib/theme-config";
import { RANK_PRIORITY } from "@/lib/role-constants";

type NavItem = { name: string; href: string; icon: LucideIcon };
const workspace: NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: Home },
  { name: "Operations", href: "/dashboard/operations", icon: Swords },
  { name: "PackTracker", href: "/dashboard/packtracker", icon: PackageSearch },
  { name: "Marketplace", href: "/dashboard/marketplace", icon: Store },
];
const personal: NavItem[] = [
  { name: "Mercenary bio", href: "/dashboard/profile", icon: IdCard },
  { name: "Appearance", href: "/dashboard/settings", icon: Palette },
];
const community: NavItem[] = [
  { name: "Fleet registry", href: "/fleet", icon: Compass },
  { name: "Divisions", href: "/divisions", icon: Swords },
  { name: "Public marketplace", href: "/marketplace", icon: ExternalLink },
];

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useDashboardProfile();
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [canManageCommand, setCanManageCommand] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);
  const displayName = user?.discordDisplayName || user?.name || user?.discordUsername || "Your workspace";
  const roleNames = new Set(user?.roles.map(role => role.discordRole.name));
  const rank = RANK_PRIORITY.find(name => roleNames.has(name)) || "House Wolf member";
  const canAdmin = user?.permissions.some(permission => ["SITE_ADMIN", "DOSSIER_ADMIN"].includes(permission.key));
  const administration: NavItem[] = [
    ...(canManageCommand ? [{ name: "Discord", href: "/dashboard/organization", icon: Settings }] : []),
    ...(canAdmin ? [{ name: "Administration", href: "/dashboard/admin", icon: Shield }] : []),
  ];
  const current = [...workspace, ...personal, ...administration].find(item => item.href === "/dashboard" ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/"));
  const title = current?.name || "Command center";
  const detail = pathname === "/dashboard/operations/new" ? "New operation" : pathname.startsWith("/dashboard/operations/") ? "Operation details" : null;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/command/settings", { signal: controller.signal }).then(response => setCanManageCommand(response.ok))
      .catch(() => { if (!controller.signal.aborted) setCanManageCommand(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    content.current?.scrollTo({ top: 0 });
    content.current?.focus({ preventScroll: true });
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const panel = sidebar.current;
    const trigger = menuButton.current;
    const elements = () => Array.from(panel?.querySelectorAll<HTMLElement>('a[href], button') || []).filter(element => element.getClientRects().length);
    elements()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
      if (event.key === "Tab") {
        const items = elements(), first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const resize = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    document.addEventListener("keydown", keydown);
    window.addEventListener("resize", resize);
    return () => { document.removeEventListener("keydown", keydown); window.removeEventListener("resize", resize); trigger?.focus(); };
  }, [mobileOpen]);

  function navGroup(label: string, items: NavItem[]) {
    if (!items.length) return null;
    return <div className="dash-nav-group"><p className="dash-nav-label">{label}</p>{items.map(item => {
      const active = item.href === "/dashboard" ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
      const Icon = item.icon;
      return <Link key={item.href} href={item.href} className="dash-nav-link" aria-current={active ? "page" : undefined} aria-label={item.name} title={collapsed ? item.name : undefined} onClick={() => setMobileOpen(false)}>
        <Icon size={18} aria-hidden="true" /><span className="dash-nav-text">{item.name}</span>
        {!item.href.startsWith("/dashboard") && <ArrowUpRight size={13} className="dash-nav-external" aria-hidden="true" />}
      </Link>;
    })}</div>;
  }

  return <div id="dashboard-theme-container" className="dashboard-shell" data-collapsed={collapsed}>
    <a className="dash-skip" href="#dashboard-content">Skip to content</a>
    {mobileOpen && <button className="dash-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" tabIndex={-1} />}
    <aside ref={sidebar} id="dashboard-navigation" className="dash-sidebar" data-open={mobileOpen} role={mobileOpen ? "dialog" : undefined} aria-modal={mobileOpen || undefined} aria-label="Dashboard navigation">
      <Link href="/dashboard" className="dash-brand" onClick={() => setMobileOpen(false)} title="House Wolf overview">
        <Image src="/images/global/HWiconnew.png" width={34} height={34} alt="" />
        <span className="dash-nav-text"><strong>HOUSE WOLF</strong><span>Command workspace</span></span>
      </Link>
      <button className="dash-icon-button dash-mobile-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20} /></button>
      <nav aria-label="Primary" className="dash-navigation">
        {navGroup("Workspace", workspace)}{navGroup("Personal", personal)}{navGroup("Command", administration)}{navGroup("Explore", community)}
      </nav>
      <div className="dash-sidebar-bottom">
        <Link href="/dashboard/profile" className="dash-account" onClick={() => setMobileOpen(false)} title={displayName}>
          <Image src={user?.avatarUrl || user?.image || "https://cdn.discordapp.com/embed/avatars/0.png"} width={36} height={36} alt="" className="dash-avatar" />
          <span className="dash-nav-text"><strong>{displayName}</strong><span>{rank}</span></span>
        </Link>
        <div className="dash-sidebar-actions">
          <button className="dash-icon-button" onClick={() => void signOut({ callbackUrl: "/" })} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button>
          <button className="dash-icon-button dash-collapse" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} aria-expanded={!collapsed} title={collapsed ? "Expand navigation" : "Collapse navigation"}>{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}</button>
        </div>
      </div>
    </aside>
    <div className="dash-workspace" inert={mobileOpen ? true : undefined}>
      <header className="dash-topbar">
        <div className="dash-breadcrumb"><button ref={menuButton} className="dash-icon-button dash-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="dashboard-navigation"><Menu size={21} /></button>
          <Link href="/dashboard" className="dash-breadcrumb-root">Workspace</Link><ChevronRight size={14} aria-hidden="true" /><span>{title}</span>{detail && <><ChevronRight size={14} aria-hidden="true" /><span>{detail}</span></>}
        </div>
        <div className="dash-topbar-actions"><Link href="/dashboard/settings" className="dash-theme-shortcut" title="Change appearance"><span className="dash-theme-dot" /><span>{getTheme(theme).displayName}</span></Link><span className="dash-topbar-divider" /><Link href="/" className="dash-public-link">View website <ArrowUpRight size={14} /></Link></div>
      </header>
      <main ref={content} id="dashboard-content" className="dash-main" tabIndex={-1}><div className="dash-content">{children}</div></main>
    </div>
  </div>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider><DashboardProfileProvider><DashboardShell>{children}</DashboardShell></DashboardProfileProvider></ThemeProvider>;
}
