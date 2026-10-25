"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import EventWizard, { api, type Operation, type EventInput } from "./EventWizard";
import CrewPanel from "./CrewPanel";
import OperationsBrowser from "./OperationsBrowser";
import PlanningPanel from "./PlanningPanel";

export function OperationsList(props: { canCreate: boolean; embedded?: boolean }) { return <OperationsBrowser {...props} />; }
export function NewOperation() {
  const [saved, setSaved] = useState<Operation | null>(null);
  const [templates, setTemplates] = useState<{ id: string; name: string; input: Partial<EventInput> }[]>([]), [templateId, setTemplateId] = useState("");
  useEffect(() => { let active = true; api<typeof templates>("operation-templates").then((rows) => { if (active) setTemplates(rows); }).catch(() => {}); return () => { active = false; }; }, []);
  return saved ? <div className="space-y-5"><h1 className="text-3xl font-bold">Operation saved</h1><p>State: {saved.state}. Open the operation to configure capacity, reminders, repeat drafts and staffing.</p><Link className="underline" href={`/dashboard/operations/${saved.id}`}>Open operation</Link></div> : <div className="space-y-5">
    {templates.length > 0 && <label className="dash-panel block">Start from a template<select className="mt-2 w-full rounded-lg border border-border-default bg-background-card p-3" value={templateId} onChange={(e) => setTemplateId(e.target.value)}><option value="">Blank operation</option>{templates.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select><span className="mt-2 block text-xs text-foreground-muted">Dates and covers are entered for each new operation.</span></label>}
    <EventWizard key={templateId} initialValues={templates.find((row) => row.id === templateId)?.input} onSaved={setSaved} />
  </div>;
}
export function OperationDetail({ id }: { id: string }) {
  const [planningVersion, setPlanningVersion] = useState(0);
  const [op, setOp] = useState<Operation | null>(null), [error, setError] = useState(""), [editing, setEditing] = useState(false), [pending, setPending] = useState(false);
  const [section, setSection] = useState("crew");
  const load = useCallback(async () => { try { setOp(await api<Operation>(`operations/${id}`)); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Load failed."); } }, [id]);
  useEffect(() => {
    let active = true;
    api<Operation>(`operations/${id}`).then((row) => { if (active) setOp(row); }).catch((e) => { if (active) setError(e.message); });
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    const timer = setInterval(refresh, 30000); window.addEventListener("focus", refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [id, load]);
  async function mutate(action: string) {
    if (!op || pending) return;
    setPending(true); setError("");
    try { await api(`operations/${id}`, "PATCH", { action, revision: op.revision }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Change failed."); }
    finally { setPending(false); }
  }
  if (!op) return <p role={error ? "alert" : "status"}>{error || "Loading operation…"}</p>;
  const jobs = op.deliveries?.filter((job) => job.revision === op.revision) || [];
  const deliveryLabel = (status: string) => ({ PENDING: "Pending", PROCESSING: "Pending", POSTED: "Published", FAILED: "Failed", BLOCKED: "Blocked", AMBIGUOUS: "Blocked (outcome uncertain)", SUPERSEDED: "Superseded" }[status] || status);
  const native = jobs.find((job) => job.kind === "NATIVE"), announcement = jobs.find((job) => job.kind === "ANNOUNCEMENT");
  const open = ["DRAFT", "PUBLISHED", "ACTIVE"].includes(op.state);
  const editable = op.canManage && ["DRAFT", "PUBLISHED"].includes(op.state) && op.syncState === "CLEAN";
  const actionLabel: Record<string, string> = { publish: "Publish operation", start: "Start operation", cancel: "Cancel operation", complete: "Complete operation", archive: "Archive operation", retry: "Retry delivery", reconcile: "Review uncertain delivery", adopt: "Adopt Discord changes", reapply: "Overwrite Discord changes", recreate: "Recreate deleted event" };
  const actions = [...(op.state === "DRAFT" ? ["publish"] : []), ...(op.state === "PUBLISHED" ? ["start", "cancel"] : []), ...(op.state === "ACTIVE" ? ["complete", "cancel"] : []), ...(["COMPLETED", "CANCELLED"].includes(op.state) ? ["archive"] : []), ...(jobs.some((job) => ["FAILED", "BLOCKED"].includes(job.status)) ? ["retry"] : []), ...(jobs.some((job) => job.status === "AMBIGUOUS") ? ["reconcile"] : []), ...(op.syncState === "CONFLICT" ? ["adopt", "reapply"] : []), ...(op.syncState === "DELETED" ? ["recreate"] : [])];
  const button = "inline-flex min-h-10 items-center justify-center rounded-lg border border-border-default px-4 py-2 text-sm font-medium hover:bg-steel/15 disabled:opacity-50";
  const changed = () => { setPlanningVersion((n) => n + 1); void load(); };
  const editSchedule = () => { setSection("briefing"); setEditing(true); };
  const view = !op.staffingEnabled && section === "crew" ? "briefing" : section;
  return <div className="mx-auto max-w-7xl space-y-5">
    <Link href="/dashboard/operations" className="text-sm text-foreground-muted hover:underline">← All operations</Link>
    <header className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-foreground-muted">Operation briefing &amp; crew</p><h1 className="break-words text-2xl font-bold sm:text-3xl">{op.input.title}</h1></div><span className="rounded-full border border-steel/40 bg-steel/15 px-3 py-1 text-xs font-semibold">{op.state.charAt(0) + op.state.slice(1).toLowerCase()}</span></div>
      <div className="grid gap-3 rounded-xl border border-border-default bg-background-card p-4 text-sm sm:grid-cols-3">
        <div><p className="mb-1 text-xs text-foreground-muted">Start · your timezone</p><p>{new Date(op.input.start).toLocaleString()}</p></div>
        <div><p className="mb-1 text-xs text-foreground-muted">End · your timezone</p><p>{op.input.end ? new Date(op.input.end).toLocaleString() : "End time needed for staffing"}</p></div>
        <div><p className="mb-1 text-xs text-foreground-muted">Meeting point</p><p>{op.input.entityType === "VOICE" ? `Voice channel: ${op.voiceChannelName || "Channel unavailable"}` : op.input.location}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{editable && <button type="button" className={button} onClick={() => editing ? setEditing(false) : editSchedule()}>{editing ? "Close editor" : "Edit briefing & schedule"}</button>}{op.nativeEventId && <a href={`https://discord.com/events/${op.guildId}/${op.nativeEventId}`} target="_blank" rel="noopener noreferrer" className={button}>View Discord event ↗</a>}{op.canManage && <details className="relative"><summary className={`${button} cursor-pointer`}>Manage operation</summary><div className="absolute left-0 z-20 mt-2 flex min-w-64 flex-col gap-2 rounded-xl border border-border-default bg-background-card p-3 shadow-xl">{actions.map((action) => <button type="button" key={action} disabled={pending} onClick={() => void mutate(action)} className={`${button} justify-start ${action === "cancel" ? "text-red-300" : ""}`}>{actionLabel[action]}</button>)}{!actions.length && <p className="p-2 text-xs text-foreground-muted">No lifecycle changes available.</p>}</div></details>}</div>
    </header>
    {error && <p role="alert" className="rounded-lg border border-red-300/25 bg-red-300/5 p-3 text-sm text-red-200">{error}</p>}
    {open && op.staffingEnabled && !op.input.end && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/25 bg-amber-300/5 p-4"><div><p className="font-semibold text-amber-200">Set an end time before assigning crew</p><p className="mt-1 text-sm text-foreground-muted">Seats can be created now. An end time is required to check availability and prevent overlapping assignments.</p></div>{editable && <button type="button" className={button} onClick={editSchedule}>Set end time</button>}</div>}
    {op.canManage && op.syncState === "CONFLICT" && op.remoteSnapshot && <details open className="rounded-xl border border-amber-700 p-4"><summary className="cursor-pointer font-semibold">Discord changes need review</summary><h2 className="mt-4 font-bold">{op.remoteSnapshot.name}</h2><p className="whitespace-pre-wrap text-sm">{op.remoteSnapshot.description}</p><p className="mt-2 text-sm">UTC: {op.remoteSnapshot.start} – {op.remoteSnapshot.end || "No end time"}</p><p className="text-sm">Location: {op.remoteSnapshot.location || (op.remoteSnapshot.channel_id === op.input.channelId ? op.voiceChannelName : null) || "Discord voice channel"}</p><p className="mt-2 text-xs text-foreground-muted">Review the adopt or overwrite actions under Manage operation. Adopting preserves the remote cover. Neither action records attendance.</p></details>}
    <nav aria-label="Operation sections" className="flex flex-wrap gap-2 border-b border-border-default pb-3">{[["briefing", "Briefing"], ...(op.staffingEnabled ? [["crew", "Crew & ships"]] : []), ...(op.advancedEnabled ? [["planning", "Planning tools"]] : [])].map(([key, title]) => <button type="button" key={key} aria-pressed={view === key} className={`${button} ${view === key ? "border-steel-light bg-steel/20" : "text-foreground-muted"}`} onClick={() => { setSection(key); setEditing(false); }}>{title}</button>)}</nav>
    {view === "briefing" && <div className="space-y-5">
      {editing ? <section className="dash-panel"><EventWizard operation={op} onSaved={() => { setEditing(false); changed(); }} /></section> : <section className="dash-panel"><h2 className="mb-4 text-xl font-semibold">Mission briefing</h2><p className="whitespace-pre-wrap text-sm leading-7">{op.input.description || "No briefing has been added yet."}</p><p className="mt-4 text-xs text-foreground-muted">Schedule authored in {op.input.timezone}. Times above use your timezone.</p></section>}
      <details className="rounded-xl border border-border-default p-4"><summary className="cursor-pointer text-sm font-semibold">Discord delivery &amp; sync details</summary><div className="mt-3 space-y-2 text-sm text-foreground-muted"><p>Revision {op.revision} · Sync: {op.syncState}</p><p>Native event: {native ? deliveryLabel(native.status) : op.nativeEventId ? "Published" : "Not published"}</p>{announcement ? <p>Text announcement: {deliveryLabel(announcement.status)}{native?.status === "POSTED" && announcement.status !== "POSTED" ? " · Partial delivery" : ""}</p> : !op.announcementChannelId && <p>Text-channel announcement not configured.</p>}{jobs.filter((job) => job.errorCode).map((job) => <p key={job.id}>{job.kind}: {job.errorCode}</p>)}</div></details>
    </div>}
    {view === "crew" && <CrewPanel operationId={id} revisionKey={`${op.state}:${op.revision}:${op.signups?.[0]?.status || ""}:${planningVersion}`} staffingInput={op.input} onChanged={() => void load()} onEditSchedule={editable ? editSchedule : undefined} />}
    {view === "planning" && <PlanningPanel operationId={id} revisionKey={`${op.state}:${op.revision}:${op.signups?.[0]?.status || ""}:${planningVersion}`} onChanged={changed} />}
    {["PUBLISHED", "ACTIVE"].includes(op.state) && <CommitmentCard key={`${id}:${op.signups?.[0]?.status || ""}:${op.signups?.[0]?.preferences || ""}`} operation={op} onSaved={changed} />}
  </div>;
}

function CommitmentCard({ operation, onSaved }: { operation: Operation; onSaved: () => void }) {
  const saved = operation.signups?.[0];
  const [status, setStatus] = useState(saved?.status || "TENTATIVE"), [preferences, setPreferences] = useState(saved?.preferences || ""), [pending, setPending] = useState(false), [error, setError] = useState("");
  return <details className="rounded-xl border border-border-default bg-background-card p-4"><summary className="cursor-pointer text-sm font-semibold">Your commitment <span className="ml-2 font-normal text-foreground-muted">{saved ? saved.status.charAt(0) + saved.status.slice(1).toLowerCase() : "Not saved yet"}</span></summary><form className="mt-4 space-y-4" onSubmit={async (event) => { event.preventDefault(); if (pending) return; setPending(true); setError(""); try { await api(`operations/${operation.id}`, "POST", { status, preferences }); onSaved(); } catch (e) { setError(e instanceof Error ? e.message : "Could not save commitment."); } finally { setPending(false); } }}>
    <p className="text-sm text-foreground-muted">Commit to become available for a crew seat. Discord Interested does not assign a seat or record attendance.</p>
    <label className="block max-w-sm text-sm">Your availability<select className="mt-1 w-full rounded-lg border border-border-default bg-background-card p-2.5" value={status} onChange={(e) => setStatus(e.target.value)}>{["COMMITTED", "TENTATIVE", "RESERVE", "WITHDRAWN"].map((value) => <option key={value} value={value}>{value.charAt(0) + value.slice(1).toLowerCase()}</option>)}</select></label>
    <label className="block text-sm">Role preferences &amp; availability notes<textarea className="mt-1 w-full rounded-lg border border-border-default bg-background-card p-3" rows={2} maxLength={500} value={preferences} onChange={(e) => setPreferences(e.target.value)} /></label>
    {operation.advancedEnabled && <p className="text-xs text-foreground-muted">For assignment suggestions, list role codes in preference order: PILOT, MEDIC, GUNNER. Separate them with commas. Other text is kept as availability notes.</p>}
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}<button disabled={pending} className="min-h-10 rounded-lg border border-border-default px-4 py-2 text-sm disabled:opacity-50">{pending ? "Saving…" : "Save commitment"}</button>
  </form></details>;
}
