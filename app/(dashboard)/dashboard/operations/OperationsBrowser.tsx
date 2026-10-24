"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, List, Search } from "lucide-react";
import { type Operation } from "./EventWizard";

const control = "rounded-lg border border-border-default bg-background-card px-3 py-2.5 text-sm text-foreground";
const date = (value: string) => new Date(value).toLocaleString("en-US", { timeZone: "UTC", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
export default function OperationsBrowser({ canCreate, embedded = false }: { canCreate: boolean; embedded?: boolean }) {
  const [view, setView] = useState<"list" | "calendar">("list"), [q, setQ] = useState(""), [state, setState] = useState("ALL"), [type, setType] = useState("ALL");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7)), [page, setPage] = useState(1), [retry, setRetry] = useState(0);
  const [data, setData] = useState<{ items: Operation[]; total: number; page: number; pageSize: number } | null>(null), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  const days = useMemo(() => {
    const first = new Date(`${month}-01T00:00:00Z`), start = new Date(first);
    start.setUTCDate(1 - (first.getUTCDay() + 6) % 7);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * 86400000));
  }, [month]);
  const query = useMemo(() => {
    const params = new URLSearchParams({ browse: "1", q, state, type, page: String(view === "calendar" ? 1 : page), pageSize: view === "calendar" ? "500" : "12" });
    if (view === "calendar") { params.set("from", days[0].toISOString()); params.set("to", new Date(days[41].getTime() + 86400000).toISOString()); }
    return params.toString();
  }, [q, state, type, page, view, days]);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/command/operations?${query}`, { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Operations could not be loaded.");
        if (!controller.signal.aborted) { setData(result.data); setError(""); }
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Operations unavailable."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    const timer = setTimeout(() => void load(), 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, retry]);
  function changeMonth(delta: number) {
    const day = new Date(`${month}-01T00:00:00Z`); day.setUTCMonth(day.getUTCMonth() + delta); setMonth(day.toISOString().slice(0, 7));
  }
  const rows = data?.items || [], pages = Math.max(1, Math.ceil((data?.total || 0) / 12));
  return <div className="space-y-5">
    <div className={embedded ? "flex flex-wrap items-center justify-between gap-4" : "dash-page-heading"}>
      <div>{!embedded && <p className="dash-eyebrow">HOUSE WOLF COMMAND</p>}<h1 className={embedded ? "text-xl font-bold" : ""}>Operations</h1><p className="text-sm text-foreground-muted">Find your next deployment. Dates and times shown in UTC.</p></div>
      {canCreate && <Link href="/dashboard/operations/new" className="dash-button">Create operation</Link>}
    </div>
    <div className="dash-panel flex flex-wrap items-end gap-3">
      <label className="flex min-w-44 flex-1 flex-col gap-1 text-xs text-foreground-muted"><span className="flex items-center gap-1"><Search size={13} />Search operations</span><input className={control} maxLength={100} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Operation title" /></label>
      <label className="flex flex-col gap-1 text-xs text-foreground-muted">Status<select className={control} value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}>{["ALL", "DRAFT", "PUBLISHED", "ACTIVE", "COMPLETED", "CANCELLED", "ARCHIVED"].map((value) => <option key={value} value={value}>{value === "ALL" ? "All statuses" : value.charAt(0) + value.slice(1).toLowerCase()}</option>)}</select></label>
      <label className="flex flex-col gap-1 text-xs text-foreground-muted">Meeting type<select className={control} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}><option value="ALL">All types</option><option value="VOICE">Discord voice</option><option value="EXTERNAL">External location</option></select></label>
      <div className="flex gap-1" aria-label="Operation view">{(["list", "calendar"] as const).map((value) => <button key={value} type="button" aria-pressed={view === value} className={`${control} inline-flex items-center gap-2 ${view === value ? "border-steel-light bg-steel/20" : ""}`} onClick={() => setView(value)}>{value === "list" ? <List size={16} /> : <CalendarDays size={16} />}{value === "list" ? "List" : "Calendar"}</button>)}</div>
    </div>
    {error && <div role="alert" className="dash-notice">{error} <button type="button" className="underline" onClick={() => setRetry((n) => n + 1)}>Try again</button></div>}
    {loading && <p role="status" className="text-sm text-foreground-muted">Loading operations…</p>}
    {view === "calendar" ? <section aria-label="Operations calendar" className="dash-panel overflow-hidden">
      <div className="mb-5 flex items-center justify-between gap-3"><button className={control} onClick={() => changeMonth(-1)} aria-label="Previous month"><ChevronLeft size={17} /></button><label className="text-sm font-semibold"><span className="sr-only">Calendar month</span><input type="month" className={control} value={month} onChange={(e) => { if (/^\d{4}-\d{2}$/.test(e.target.value)) setMonth(e.target.value); }} /></label><button className={control} onClick={() => changeMonth(1)} aria-label="Next month"><ChevronRight size={17} /></button></div>
      <div className="overflow-x-auto"><div className="min-w-[700px]"><div className="grid grid-cols-7 text-center text-xs text-foreground-muted">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day} className="pb-3">{day}</span>)}</div><div className="grid grid-cols-7 border-l border-t border-border-default">{days.map((day) => {
        const key = day.toISOString().slice(0, 10), items = rows.filter((op) => op.input.start?.slice(0, 10) === key);
        return <div key={key} className={`min-h-28 border-b border-r border-border-default p-2 ${key.startsWith(month) ? "" : "bg-black/15 text-foreground-muted"}`}><time dateTime={key} className="text-xs font-mono">{day.getUTCDate()}</time><div className="mt-2 max-h-48 space-y-1 overflow-y-auto">{items.map((op) => <Link key={op.id} href={`/dashboard/operations/${op.id}`} className="block break-words rounded border border-steel/40 bg-steel/15 px-2 py-1.5 text-xs hover:bg-steel/30"><span className="block font-semibold">{op.input.title}</span><span className="text-[10px] text-foreground-muted">{op.input.start.slice(11, 16)} · {op.state}</span></Link>)}</div></div>;
      })}</div></div></div>
      {(data?.total || 0) > 500 && <p className="mt-4 text-sm text-foreground-muted">Showing the first 500 matches. Refine the filters or use the paginated list to see more.</p>}
    </section> : !loading && !rows.length && !error ? <section className="dash-panel dash-empty"><h2 className="text-xl font-semibold">No matching operations</h2><p>Try another title, status or meeting type.</p></section> : <>
      <ul className="grid gap-4 md:grid-cols-2">{rows.map((op) => <li key={op.id} className="dash-panel"><div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider"><span className="rounded-full border border-steel/40 bg-steel/15 px-2.5 py-1">{op.state}</span><span className="text-foreground-muted">{op.input.entityType === "VOICE" ? "Discord voice" : "External location"}</span></div><Link href={`/dashboard/operations/${op.id}`} className="text-xl font-semibold underline decoration-steel underline-offset-4">{op.input.title}</Link><p className="mt-3 text-sm text-foreground-muted">{date(op.input.start)} UTC</p><p className="mt-1 text-xs text-foreground-muted">{op.syncState !== "CLEAN" ? op.syncState : op.nativeEventId ? "Discord event linked" : "Awaiting Discord publication"}</p></li>)}</ul>
      <nav aria-label="Operation pages" className="flex items-center justify-between gap-3 text-sm"><button className={control} disabled={page === 1 || loading} onClick={() => setPage((n) => n - 1)}>Previous</button><span className="text-foreground-muted">Page {page} of {pages} · {data?.total || 0} operations</span><button className={control} disabled={page >= pages || loading} onClick={() => setPage((n) => n + 1)}>Next</button></nav>
    </>}
  </div>;
}
