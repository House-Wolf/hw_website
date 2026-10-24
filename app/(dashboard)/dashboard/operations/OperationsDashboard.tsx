"use client";

import "./operations.css";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { Activity, ArrowRight, ArrowUpRight, CalendarDays, CircleAlert, Crosshair, RefreshCw, Rocket, ShieldCheck, Swords, Users } from "lucide-react";
import type { OperationsOverview } from "@/lib/command/overview";
import { api } from "./EventWizard";
import { OperationsList } from "./OperationsPanel";

const statusNames: Record<string, string> = { DRAFT: "Draft", PUBLISHED: "Scheduled", ACTIVE: "Active", COMPLETED: "Completed", CANCELLED: "Cancelled", ARCHIVED: "Archived" };
const statusColors: Record<string, string> = { DRAFT: "var(--text-muted)", PUBLISHED: "var(--accent-secondary)", ACTIVE: "var(--accent-primary)", COMPLETED: "var(--status-success-text)", CANCELLED: "var(--status-error-text)", ARCHIVED: "var(--status-warning-text)" };
const actionNames: Record<string, string> = { CREATED: "created", SAVE: "updated", PUBLISH: "published", START: "started", COMPLETE: "completed", CANCEL: "cancelled", ARCHIVE: "archived", RETRIED: "retried delivery for", ADOPT: "synced Discord changes to", REAPPLY: "reapplied changes to", RECREATE: "requested recreation of", RECONCILE: "reconciled" };

function date(value: string, time = false) {
  return new Intl.DateTimeFormat("en-US", time ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function OperationsTrend({ trend }: { trend: OperationsOverview["trend"] }) {
  const max = Math.max(4, Math.ceil(Math.max(...trend.map(month => month.count), 0) / 4) * 4);
  const point = (index: number, count: number) => [42 + index * 87, 174 - (count / max) * 142];
  const points = trend.map((month, index) => point(index, month.count).join(",")).join(" ");
  const total = trend.reduce((sum, month) => sum + month.count, 0);
  return <>
    <div className="ops-chart" role="img" aria-label={`${total} operations created in the last six calendar months. ${trend.map(month => `${month.label}: ${month.count}`).join(". ")}.`}>
      <svg viewBox="0 0 510 215" aria-hidden="true">
        {[0, 1, 2, 3, 4].map(tick => {
          const y = 174 - tick * 35.5;
          return <g key={tick}><line x1="42" y1={y} x2="477" y2={y} className="ops-grid-line" /><text x="26" y={y + 4} textAnchor="end" className="ops-axis-label">{max * tick / 4}</text></g>;
        })}
        {total > 0 && <polygon points={`42,174 ${points} 477,174`} className="ops-chart-area" />}
        <polyline points={points} className="ops-chart-line" />
        {trend.map((month, index) => {
          const [x, y] = point(index, month.count);
          return <g key={month.month}><circle cx={x} cy={y} r="3.5" className="ops-chart-point"><title>{`${month.label}: ${month.count}`}</title></circle><text x={x} y="203" textAnchor="middle" className="ops-axis-label">{month.label}</text></g>;
        })}
      </svg>
    </div>
    <div className="ops-chart-footnote"><span className="ops-legend-dot" />Operations created<span>{total} total</span></div>
  </>;
}

function StatusBreakdown({ statuses }: { statuses: OperationsOverview["statuses"] }) {
  const total = statuses.reduce((sum, status) => sum + status.count, 0);
  if (!total) return <div className="ops-chart-empty"><Crosshair size={29} strokeWidth={1.3} /><strong>No operations in this window yet</strong><p>The breakdown will appear as operations are created.</p></div>;
  const segments = statuses.map((status, index) => {
    const start = statuses.slice(0, index).reduce((sum, previous) => sum + previous.count, 0) / total * 100;
    const end = start + status.count / total * 100;
    return `${statusColors[status.state] || "var(--text-secondary)"} ${start}% ${end}%`;
  });
  return <div className="ops-breakdown"><div className="ops-donut" style={{ background: `conic-gradient(${segments.join(",")})` }} role="img" aria-label={statuses.map(status => `${statusNames[status.state] || status.state}: ${status.count}`).join(". ")}><div><strong>{total}</strong><span>operations</span></div></div><ul className="ops-status-legend">{statuses.map(status => <li key={status.state}><span className="ops-legend-dot" style={{ background: statusColors[status.state] }} /><span>{statusNames[status.state] || status.state}</span><strong>{status.count}</strong></li>)}</ul></div>;
}

export function OperationsOverviewContent({ data }: { data: OperationsOverview }) {
  const metrics = [
    { label: "Total members", value: data.members.total.toLocaleString(), note: `+${data.members.newThisMonth} registered this month`, source: "Active website members", icon: Users, href: "/divisions" },
    { label: "Active operations", value: data.operations.active.toLocaleString(), note: `${data.operations.scheduled} scheduled`, source: "Currently underway", icon: Crosshair, href: "/dashboard/operations?view=operations" },
    { label: "Registered ships", value: data.fleet.total === null ? "Unavailable" : `${data.fleet.total.toLocaleString()}${data.fleet.status === "partial" ? "+" : ""}`, note: data.fleet.status === "partial" ? "Partial registry data" : data.fleet.status === "unavailable" ? "Registry could not be loaded" : "Public FleetYards registry", source: "House Wolf fleet", icon: Rocket, href: "/fleet" },
  ];
  return <div className="ops-overview">
    <section className="ops-metrics" aria-label="Organization at a glance">{metrics.map(({ label, value, note, source, icon: Icon, href }) => <Link className="ops-metric" href={href} key={label}><div className="ops-metric-heading"><span>{label}</span><span className="ops-metric-icon"><Icon size={19} /></span></div><strong className={value === "Unavailable" ? "ops-metric-unavailable" : undefined}>{value}</strong><div className="ops-metric-footer"><span>{note}</span><ArrowUpRight size={14} /></div><span className="ops-metric-source">{source}</span></Link>)}</section>

    {data.leadership && <section aria-labelledby="performance-heading"><div className="ops-section-heading"><div><h2 id="performance-heading">Org performance</h2><p>Leadership view</p></div><span className="ops-section-tag"><ShieldCheck size={13} />Command insight</span></div><div className="ops-performance-grid"><div className="ops-metric ops-reliability"><div className="ops-metric-heading"><span>Attendance reliability</span><span className="ops-metric-icon"><ShieldCheck size={18} /></span></div><strong className="ops-metric-unavailable">Not measured</strong><p>{data.reliability.description}</p></div><div className="ops-performance-note"><Swords size={22} /><div><strong>Build a record worth following.</strong><p>Operation commitments show intent to attend. Reliability is based on recorded mission attendance, so no score is shown yet.</p></div></div></div></section>}

    <section className="ops-two-column" aria-label="Operation analytics"><article className="ops-panel"><div className="ops-panel-heading"><div><h2>Operations over time</h2><p>Last 6 months · Created per month · UTC</p></div><Activity size={17} /></div><OperationsTrend trend={data.trend} /></article><article className="ops-panel"><div className="ops-panel-heading"><div><h2>Operation status breakdown</h2><p>Created in the last 90 days</p></div><Crosshair size={17} /></div><StatusBreakdown statuses={data.statuses} /></article></section>

    <section className="ops-panel" aria-labelledby="upcoming-heading"><div className="ops-panel-heading"><div><h2 id="upcoming-heading">On the horizon</h2><p>Active and upcoming operations</p></div><Link className="ops-view-link" href="/dashboard/operations?view=operations">View operations <ArrowRight size={13} /></Link></div>{data.upcoming.length ? <ul className="ops-upcoming-list">{data.upcoming.map(operation => <li key={operation.id}><Link href={`/dashboard/operations/${operation.id}`}><span className="ops-upcoming-icon"><CalendarDays size={18} /></span><span><strong>{operation.title}</strong><span>{operation.start && Number.isFinite(Date.parse(operation.start)) ? date(operation.start, true) : "Time to be confirmed"}</span></span><span className="ops-state-pill" style={{ "--operation-status": statusColors[operation.state] } as CSSProperties}>{statusNames[operation.state]}</span><ArrowUpRight size={16} /></Link></li>)}</ul> : <div className="ops-upcoming-empty"><CalendarDays size={22} /><div><strong>No deployments on the horizon</strong><p>New operations will appear here once they are scheduled.</p></div></div>}</section>

    <section className={`ops-two-column ${!data.leadership ? "ops-single-column" : ""}`} aria-label="Recent organization activity">
      {data.leadership && <article className="ops-panel"><div className="ops-panel-heading"><div><h2>Recent members</h2><p>Newest registered House Wolf members</p></div><Users size={17} /></div>{data.recentMembers.length ? <ul className="ops-member-list">{data.recentMembers.map((member, index) => <li key={`${member.name}-${index}`}><span className="ops-member-initials" aria-hidden="true">{member.name.split(/[\s_-]+/).map(part => part[0]).slice(0, 2).join("").toUpperCase()}</span><div><strong>{member.name}</strong><span>Registered {date(member.joinedAt)}</span></div><span className="ops-member-rank">{member.rank}</span></li>)}</ul> : <p className="ops-empty-copy">New members will appear here after they register on the website.</p>}</article>}
      <article className="ops-panel"><div className="ops-panel-heading"><div><h2>Recent activity</h2><p>Latest operation updates</p></div><Link className="ops-view-link" href="/dashboard/operations?view=operations">View operations <ArrowRight size={13} /></Link></div>{data.recentActivity.length ? <ul className="ops-activity-list">{data.recentActivity.map(activity => <li key={activity.id}><span className="ops-activity-dot" /><div><p><strong>{activity.actor}</strong> {actionNames[activity.action.replace("COMMAND_OPERATION_", "")] || "updated"} <Link href={`/dashboard/operations/${activity.operationId}`}>{activity.title}</Link></p><time dateTime={activity.at}>{date(activity.at, true)}</time></div></li>)}</ul> : <p className="ops-empty-copy">No activity yet. Operation updates will appear here as your plans take shape.</p>}</article>
    </section>
    <p className="ops-updated">Updated {date(data.generatedAt, true)}<span>Charts reflect operations you can access.</span></p>
  </div>;
}

export default function OperationsDashboard({ canCreate, view }: { canCreate: boolean; view: "overview" | "operations" }) {
  const [data, setData] = useState<OperationsOverview | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (view !== "overview") return;
    let active = true;
    api<OperationsOverview>("operations/overview").then(result => { if (active) { setData(result); setError(""); } })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : "The overview could not be loaded."); });
    return () => { active = false; };
  }, [view, revision]);
  return <div className="ops-dashboard">
    <div className="dash-page-heading"><div><p className="dash-eyebrow">HOUSE WOLF COMMAND</p><h1>Operations</h1><p>Your organization at a glance. Your next move, in focus.</p></div><div className="ops-heading-actions">{view === "overview" && <button className="dash-icon-button" title="Refresh overview" aria-label="Refresh overview" onClick={() => { setData(null); setError(""); setRevision(value => value + 1); }}><RefreshCw size={17} /></button>}{canCreate && <Link className="dash-button" href="/dashboard/operations/new">Create event <ArrowUpRight size={14} /></Link>}</div></div>
    <nav className="ops-tabs" aria-label="Operations views"><Link href="/dashboard/operations" aria-current={view === "overview" ? "page" : undefined}>Overview</Link><Link href="/dashboard/operations?view=operations" aria-current={view === "operations" ? "page" : undefined}>Operations{data && <span>{data.operations.total}</span>}</Link></nav>
    {view === "operations" ? <OperationsList canCreate={canCreate} embedded /> : error ? <section className="dash-panel dash-empty" role="alert"><CircleAlert size={28} /><h2 className="text-xl font-semibold">Overview unavailable</h2><p>{error}</p><button className="dash-button dash-button-secondary" onClick={() => { setError(""); setRevision(value => value + 1); }}>Try again</button></section> : data ? <OperationsOverviewContent data={data} /> : <div className="ops-loading" role="status" aria-label="Loading Operations overview"><div className="ops-metrics">{[0, 1, 2].map(index => <div className="dash-skeleton ops-loading-metric" key={index} />)}</div><div className="ops-two-column"><div className="dash-skeleton ops-loading-chart" /><div className="dash-skeleton ops-loading-chart" /></div><span className="sr-only">Loading organization statistics...</span></div>}
  </div>;
}
