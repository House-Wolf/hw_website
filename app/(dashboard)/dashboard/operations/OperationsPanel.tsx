"use client";
import Link from "next/link";
import { CircleAlert, RefreshCw, Swords } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import EventWizard, { api, type Operation } from "./EventWizard";
import CrewPanel from "./CrewPanel";

export function OperationsList({ canCreate, embedded = false }: { canCreate: boolean; embedded?: boolean }) {
  const [rows, setRows] = useState<Operation[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    void api<Operation[]>("operations")
      .then(data => { setRows(data); setError(""); })
      .catch(error => setError(error instanceof Error ? error.message : "Operations could not be loaded. Please try again."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
    const refresh = () => { if (document.visibilityState === "visible") load(); };
    const timer = setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [load]);
  function retry() { setError(""); setLoading(true); load(); }

  return <div className="space-y-6">
    {!embedded && <div className="dash-page-heading"><div><p className="dash-eyebrow">HOUSE WOLF COMMAND</p><h1>Operations</h1><p>Plan your next deployment and find your place in the pack.</p></div>{canCreate && !error && <Link className="dash-button" href="/dashboard/operations/new">Create event</Link>}</div>}
    {loading ? <div className="dash-panel flex items-center gap-3 text-foreground-muted" role="status"><RefreshCw size={17} className="animate-spin" />Loading operations...</div>
      : error ? <section className="dash-panel dash-empty" role="alert"><CircleAlert size={28} /><h2 className="text-xl font-semibold">Operations unavailable</h2><p>{error}</p><button className="dash-button dash-button-secondary" onClick={retry}><RefreshCw size={15} />Check again</button></section>
      : !rows.length ? <section className="dash-panel dash-empty"><Swords size={28} /><h2 className="text-xl font-semibold">No operations scheduled</h2><p>{canCreate ? "Create an event to begin coordinating your next deployment." : "Upcoming operations will appear here when command schedules them."}</p></section>
      : <ul className="grid gap-4 md:grid-cols-2">{rows.map(op => <li key={op.id} className="dash-panel"><Link href={`/dashboard/operations/${op.id}`} className="text-xl font-semibold underline decoration-[var(--accent-secondary)] underline-offset-4">{op.input.title}</Link><p className="mt-3 text-foreground-muted">{new Date(op.input.start).toLocaleString()} / {op.state}</p><p className="text-sm text-foreground-muted">{op.syncState !== "CLEAN" ? op.syncState : op.nativeEventId ? "Discord event linked" : "Native event not posted"}</p></li>)}</ul>}
  </div>;
}
export function NewOperation() {
  const [saved, setSaved] = useState<Operation | null>(null);
  return saved ? <div className="space-y-5"><h1 className="text-3xl font-bold">Operation saved</h1><p>State: {saved.state}. Discord publication is confirmed separately by the worker.</p><Link className="underline" href={`/dashboard/operations/${saved.id}`}>Open operation and delivery status →</Link></div> : <EventWizard onSaved={setSaved} />;
}
export function OperationDetail({ id }: { id: string }) {
  const [op, setOp] = useState<Operation | null>(null), [error, setError] = useState(""), [editing, setEditing] = useState(false), [pending, setPending] = useState(false);
  const [preferences, setPreferences] = useState(""), [commitment, setCommitment] = useState("TENTATIVE"), [message, setMessage] = useState("");
  const load = useCallback(async () => { try { const row = await api<Operation>(`operations/${id}`); setOp(row); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Load failed."); } }, [id]);
  useEffect(() => { let active = true; api<Operation>(`operations/${id}`).then((row) => { if (active) setOp(row); }).catch((e) => { if (active) setError(e.message); }); const refresh = () => { if (document.visibilityState === "visible") void load(); }; const timer = setInterval(refresh, 5000); window.addEventListener("focus", refresh); return () => { active = false; clearInterval(timer); window.removeEventListener("focus", refresh); }; }, [id, load]);
  async function mutate(action: string) {
    if (!op) return;
    setPending(true); setError("");
    try { await api(`operations/${id}`, "PATCH", { action, revision: op.revision }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Change failed."); }
    finally { setPending(false); }
  }
  if (!op) return <p role={error ? "alert" : "status"}>{error || "Loading operation…"}</p>;
  const jobs = op.deliveries?.filter((job) => job.revision === op.revision) || [];
  const deliveryLabel = (status: string) => ({ PENDING: "Pending", PROCESSING: "Pending", POSTED: "Published", FAILED: "Failed", BLOCKED: "Blocked", AMBIGUOUS: "Blocked (outcome uncertain)", SUPERSEDED: "Superseded" }[status] || status);
  const native = jobs.find((job) => job.kind === "NATIVE"), announcement = jobs.find((job) => job.kind === "ANNOUNCEMENT");
  return <div className="space-y-6"><Link href="/dashboard/operations" className="underline">← Operations</Link><h1 className="text-3xl font-bold">{op.input.title}</h1><p className="whitespace-pre-wrap">{op.input.description}</p><p>Start: {new Date(op.input.start).toLocaleString()} (your timezone). Authored in {op.input.timezone}.</p><p>End: {op.input.end ? new Date(op.input.end).toLocaleString() : "Not specified"}</p><p>{op.input.entityType === "VOICE" ? `Voice channel: ${op.voiceChannelName || "Channel unavailable"}` : op.input.location}</p><div role="status" className="rounded-xl border border-[var(--border-default)] p-5"><p>Operation: {op.state} · Revision {op.revision}</p><p>Native event: {native ? deliveryLabel(native.status) : op.nativeEventId ? "Published" : "Not published"}. Sync: {op.syncState}.</p>{op.nativeEventId && <a href={`https://discord.com/events/${op.guildId}/${op.nativeEventId}`} target="_blank" rel="noopener noreferrer" className="underline">View Discord event →</a>}{(native?.status === "POSTED" || (!native && op.nativeEventId)) && !announcement && !op.announcementChannelId && <p>Discord event created. Text-channel announcement not configured.</p>}{announcement && <p>Text announcement: {deliveryLabel(announcement.status)}{native?.status === "POSTED" && announcement.status !== "POSTED" ? " — Partial delivery" : ""}</p>}{jobs.filter((job) => job.errorCode).map((job) => <p key={job.id}>{job.kind}: {job.errorCode}</p>)}</div>
    {op.canManage && op.syncState === "CONFLICT" && op.remoteSnapshot && <details open className="rounded-xl border border-amber-700 p-5"><summary>Review changes made in Discord</summary><h2 className="mt-4 font-bold">{op.remoteSnapshot.name}</h2><p className="whitespace-pre-wrap">{op.remoteSnapshot.description}</p><p>Start (UTC): {op.remoteSnapshot.start}</p><p>End (UTC): {op.remoteSnapshot.end || "Not specified"}</p><p>Location: {op.remoteSnapshot.location || (op.remoteSnapshot.channel_id === op.input.channelId ? op.voiceChannelName : null) || "Discord voice channel"}</p><p>Discord lifecycle status: {op.remoteSnapshot.status}. Adopting keeps the remote cover; reapplying uses the dashboard cover choice. Neither action records attendance.</p></details>}{error && <p role="alert" className="text-red-300">{error}</p>}
    {op.canManage && <div className="flex flex-wrap gap-3">{[...(op.state === "DRAFT" ? ["publish"] : []), ...(op.state === "PUBLISHED" ? ["start", "cancel"] : []), ...(op.state === "ACTIVE" ? ["complete", "cancel"] : []), ...(["COMPLETED", "CANCELLED"].includes(op.state) ? ["archive"] : []), ...(jobs.some((job) => ["FAILED", "BLOCKED"].includes(job.status)) ? ["retry"] : []), ...(jobs.some((job) => job.status === "AMBIGUOUS") ? ["reconcile"] : []), ...(op.syncState === "CONFLICT" ? ["adopt", "reapply"] : []), ...(op.syncState === "DELETED" ? ["recreate"] : [])].map((action) => <button key={action} disabled={pending} onClick={() => void mutate(action)} className="rounded-lg border border-[var(--border-default)] px-4 py-3 disabled:opacity-50">{action === "reconcile" ? "Reconcile uncertain native event" : action === "adopt" ? "Adopt supported Discord edits" : action === "reapply" ? "Overwrite Discord with dashboard version" : action === "recreate" ? "Authorize recreation of deleted event" : action}</button>)}{["DRAFT", "PUBLISHED"].includes(op.state) && op.syncState === "CLEAN" && <button onClick={() => setEditing((v) => !v)} className="rounded-lg border border-[var(--border-default)] px-4 py-3">{editing ? "Close editor" : "Edit event"}</button>}</div>}
    {editing && <EventWizard operation={op} onSaved={() => { setEditing(false); void load(); }} />}
    {op.staffingEnabled ? <CrewPanel operationId={id} revisionKey={`${op.state}:${op.revision}:${op.signups?.[0]?.status || ""}`} /> : <section className="dash-panel space-y-2"><h2 className="text-xl font-bold">Ships &amp; crew</h2><p className="text-foreground-muted">Ship attachment and crew assignment are currently disabled. Ask a site administrator to enable operation staffing.</p></section>}
    {["PUBLISHED", "ACTIVE"].includes(op.state) && <form onSubmit={async (event) => { event.preventDefault(); setPending(true); setError(""); try { await api(`operations/${id}`, "POST", { status: commitment, preferences }); setMessage("Your House Wolf commitment was saved. This is separate from Discord Interested and attendance."); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Signup failed."); } finally { setPending(false); } }} className="space-y-4 rounded-xl border border-[var(--border-default)] p-5"><h2 className="text-xl font-bold">Your commitment</h2><p>Saved: {op.signups?.[0]?.status || "No confirmed signup"}. Interested does not assign a crew seat or record attendance.</p><label className="block">Commitment<select value={commitment} onChange={(e) => setCommitment(e.target.value)} className="ml-3 rounded border border-[var(--border-default)] bg-[var(--background-card)] p-3">{["COMMITTED", "TENTATIVE", "RESERVE", "WITHDRAWN"].map((status) => <option key={status}>{status}</option>)}</select></label><label className="block">Role preferences and availability<textarea className="mt-2 w-full rounded border border-[var(--border-default)] bg-[var(--background-card)] p-3" maxLength={500} value={preferences} onChange={(e) => setPreferences(e.target.value)} /></label><button disabled={pending} className="rounded border border-[var(--border-teal)] px-4 py-3 disabled:opacity-50">Save commitment</button>{message && <p role="status">{message}</p>}</form>}
  </div>;
}
