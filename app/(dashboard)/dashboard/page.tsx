"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Clock3, KeyRound, PackageSearch, Palette, RefreshCw, Shield, Store, Swords, type LucideIcon } from "lucide-react";
import { useDashboardProfile } from "@/contexts/DashboardContext";
import { RANK_PRIORITY } from "@/lib/role-constants";

const destinations: { title: string; description: string; href: string; icon: LucideIcon; action: string }[] = [
  { title: "Operations", description: "Find your next deployment and coordinate with the pack.", href: "/dashboard/operations", icon: Swords, action: "View operations" },
  { title: "PackTracker", description: "Keep shared resources, requests and blueprints in view.", href: "/dashboard/packtracker", icon: PackageSearch, action: "Open PackTracker" },
  { title: "Marketplace", description: "Manage your listings and prepare your next trade.", href: "/dashboard/marketplace", icon: Store, action: "Manage listings" },
];
const permissionNames: Record<string, string> = { SITE_ADMIN: "Site administration", MARKETPLACE_ADMIN: "Marketplace management", DOSSIER_ADMIN: "Dossier management", COMMAND_SETTINGS_MANAGE: "Organization settings", COMMAND_EVENT_MANAGE: "Operation management" };
function readablePermission(key: string) {
  return permissionNames[key] || key.toLowerCase().replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());
}
function formatDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));
}
function roleColor(value: number | null) { return value && value > 0 ? `#${value.toString(16).padStart(6, "0")}` : "var(--text-muted)"; }

export default function DashboardHomePage() {
  const { user, loading, error, needsSignIn, refresh } = useDashboardProfile();
  if (loading && !user) return <div className="dash-loading" role="status" aria-label="Loading your workspace"><div className="dash-skeleton dash-skeleton-heading" /><div className="dash-skeleton dash-skeleton-hero" /><div className="dash-quick-grid">{[0, 1, 2].map(value => <div key={value} className="dash-skeleton dash-skeleton-tile" />)}</div><span className="sr-only">Loading your workspace...</span></div>;
  if (!user) return <section className="dash-panel dash-empty" role="alert"><Shield size={28} /><h1>{needsSignIn ? "Sign in to load your Discord profile" : "Your profile could not be loaded"}</h1><p>{needsSignIn ? "Your session no longer matches an account in this environment. Sign in with Discord to load your name, avatar and roles." : "Check your connection, then try again."}</p>{needsSignIn ? <Link className="dash-button" href="/auth/signin">Sign in with Discord</Link> : <button className="dash-button" onClick={refresh}>Try again <RefreshCw size={15} /></button>}</section>;
  const roles = [...user.roles].sort((a, b) => (b.discordRole.position ?? 0) - (a.discordRole.position ?? 0) || a.discordRole.name.localeCompare(b.discordRole.name));
  const roleNames = new Set(roles.map(role => role.discordRole.name));
  const rank = RANK_PRIORITY.find(name => roleNames.has(name)) || "House Wolf member";
  const name = user.discordDisplayName || user.name || user.discordUsername;
  const permissions = user.permissions;
  function roleRows(items: typeof roles) {
    return items.map(({ discordRole: role }) => <li className="dash-role-row" key={role.id}><span className="dash-role-dot" style={{ background: roleColor(role.color) }} aria-hidden="true" /><span className="dash-role-name">{role.name}</span><span className="dash-role-position">{role.position != null ? `Position ${role.position}` : "Member role"}</span></li>);
  }
  return <div className="dash-overview">
    <div className="dash-page-heading"><div><p className="dash-eyebrow">HOUSE WOLF COMMAND</p><h1>Command center</h1><p>Your people. Your operations. Everything in one place.</p></div><Link href="/dashboard/profile" className="dash-button dash-button-secondary">View my profile <ArrowUpRight size={15} /></Link></div>
    {error && <p className="dash-notice" role="alert">Your profile could not be refreshed. Showing the last loaded details. <button onClick={refresh}>Try again</button></p>}
    <section className="dash-panel dash-welcome">
      <div className="dash-welcome-main"><Image src={user.avatarUrl || user.image || "https://cdn.discordapp.com/embed/avatars/0.png"} alt="" width={64} height={64} className="dash-welcome-avatar" /><div><span className="dash-pill"><span />Discord linked</span><h2>Welcome back, {name}.</h2><p>{rank}<span className="dash-inline-divider">/</span>@{user.discordUsername}</p></div></div>
      <div className="dash-welcome-note"><Shield size={18} /><div><strong>One banner. One pack.</strong><span>Strength. Honor. Brotherhood.</span></div></div>
    </section>
    <section aria-labelledby="workspace-heading"><div className="dash-section-heading"><h2 id="workspace-heading">Your workspace</h2><span>Choose where to begin</span></div><div className="dash-quick-grid">{destinations.map(({ title, description, href, icon: Icon, action }) => <Link className="dash-destination" key={href} href={href}><div className="dash-destination-top"><span className="dash-feature-icon"><Icon size={21} /></span><ArrowUpRight size={18} className="dash-destination-arrow" /></div><h3>{title}</h3><p>{description}</p><span className="dash-destination-action">{action}<ArrowRight size={15} /></span></Link>)}</div></section>
    <section aria-labelledby="profile-heading"><div className="dash-section-heading"><h2 id="profile-heading">Your command profile</h2><button className="dash-text-button" onClick={refresh} disabled={loading}><RefreshCw size={13} className={loading ? "animate-spin" : undefined} />{loading ? "Refreshing..." : "Refresh profile"}</button></div>
      <div className="dash-metrics"><div><Shield size={18} /><span><strong>{roles.length}</strong><span>Discord roles</span></span></div><div><KeyRound size={18} /><span><strong>{permissions.length}</strong><span>Site capabilities</span></span></div><div className="dash-metric-date"><Clock3 size={18} /><span><strong>{formatDate(user.lastLoginAt)}</strong><span>Last sign-in / UTC</span></span></div></div>
      <div className="dash-profile-grid">
        <div className="dash-panel"><div className="dash-panel-heading"><div><p className="dash-eyebrow">IDENTITY & MEMBERSHIP</p><h3>Discord roles</h3></div><span className="dash-count">{roles.length}</span></div><p className="dash-panel-description">Your roles, ordered by Discord hierarchy.</p>
          {roles.length ? <><ul className="dash-role-list">{roleRows(roles.slice(0, 5))}</ul>{roles.length > 5 && <details className="dash-details"><summary>View {roles.length - 5} more roles</summary><ul className="dash-role-list">{roleRows(roles.slice(5))}</ul></details>}</> : <p className="dash-muted">No roles are linked yet. Refresh your profile after your Discord roles are synced.</p>}
          <div className="dash-panel-footnote">Member since {user.createdAt && Number.isFinite(Date.parse(user.createdAt)) ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(user.createdAt)) : "date not recorded"}.</div>
        </div>
        <div className="dash-profile-aside"><div className="dash-panel"><div className="dash-panel-heading"><div><p className="dash-eyebrow">ACCESS</p><h3>Site capabilities</h3></div><KeyRound size={18} className="dash-muted" /></div><p className="dash-panel-description">The tools available through your Discord roles.</p>
          {permissions.length ? <ul className="dash-permission-list">{permissions.map(permission => <li key={permission.key}><span className="dash-permission-check"><Check size={14} /></span><div><strong>{readablePermission(permission.key)}</strong><p>{permission.description || "Granted by your assigned roles."}</p></div></li>)}</ul> : <p className="dash-muted">Your account has standard member access.</p>}
        </div><Link href="/dashboard/settings" className="dash-appearance-link"><Palette size={21} /><span><strong>Make it your own</strong><span>Four carefully tuned dashboard themes.</span></span><ArrowRight size={16} /></Link></div>
      </div>
    </section>
  </div>;
}
