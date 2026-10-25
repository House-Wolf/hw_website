"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "./EventWizard";

type Entry = { userId: string; name: string; status: string; note?: string };
type Snapshot = { revision: number; action: string; reason: string; createdAt: string; snapshot: { entries?: Entry[]; summary?: string; privateNotes?: string } };
type Debrief = { revision: number; finalizedAt: string | null; reportState: string; summary: string; privateNotes?: string; officer: boolean; canManage: boolean; canReview: boolean; editable: boolean; canFinalize: boolean; entries: Entry[]; candidates: { id: string; name: string }[]; history?: Snapshot[]; totals: { present: number; absent: number; excused: number; value: number | null } };
type Statistics = { present: number; absent: number; excused: number; operations: number; value: number | null; members?: { id: string; name: string; present: number; absent: number; excused: number; operations: number; value: number | null }[] };
const control = "mt-1 w-full rounded-lg border border-border-default bg-background-card p-3 text-sm";
const button = "min-h-11 rounded-lg border border-border-default px-4 py-2 text-sm disabled:opacity-50";

export default function DebriefPanel({ operationId }: { operationId: string }) {
  const [data, setData] = useState<Debrief | null>(null), [stats, setStats] = useState<Statistics | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]), [summary, setSummary] = useState(""), [notes, setNotes] = useState(""), [reason, setReason] = useState("");
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [pending, setPending] = useState(false);
  const [memberId, setMemberId] = useState(""), [members, setMembers] = useState<{ id: string; name: string; username?: string }[]>([]), [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false), [searched, setSearched] = useState(false);
  const path = `operations/${operationId}/debrief`;
  const install = useCallback((row: Debrief) => {
    setData(row); setSummary(row.summary); setNotes(row.privateNotes || "");
    setMembers([]); setMemberId(""); setSearched(false);
    const recorded = new Map(row.entries.map((entry) => [entry.userId, entry]));
    for (const person of row.candidates) if (!recorded.has(person.id)) recorded.set(person.id, { userId: person.id, name: person.name, status: "", note: "" });
    setEntries([...recorded.values()].sort((a, b) => a.name.localeCompare(b.name)));
  }, []);
  useEffect(() => {
    let active = true;
    api<Debrief>(path).then((row) => { if (active) install(row); }).catch((e) => { if (active) setError(e.message); });
    api<Statistics>("attendance").then((row) => { if (active) setStats(row); }).catch(() => {});
    return () => { active = false; };
  }, [path, install]);
  async function save(action: string) {
    if (!data || pending) return;
    setPending(true); setError(""); setMessage("");
    try {
      await api(path, "POST", { action, revision: data.revision, input: { entries: entries.filter((row) => row.status).map(({ userId, status, note }) => ({ userId, status, note })), summary, privateNotes: notes, reason } });
      install(await api<Debrief>(path)); setStats(await api<Statistics>("attendance")); setReason(""); setMessage(action === "reviewReport" ? "Review recorded. The summary is now visible to members." : "Saved. Attendance totals use finalized records only.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save debrief."); }
    finally { setPending(false); }
  }
  if (!data) return <section className="dash-panel"><p role={error ? "alert" : "status"}>{error || "Loading attendance and report..."}</p></section>;
  const edit = data.canManage && data.editable;
  const unmarked = entries.some((row) => !row.status);
  return <section className="space-y-5" aria-labelledby="debrief-heading">
    <div className="dash-panel space-y-3"><h2 id="debrief-heading" className="text-xl font-semibold">Attendance &amp; after-action report</h2>
      <p className="text-sm text-foreground-muted">Record members who show up, including anyone who did not sign up. Save a draft during the operation, then finalize it after completion.</p>
      {!data.editable && <p role="status" className="text-sm">Start a one-time operation to record attendance. Complete it before finalizing attendance and its report.</p>}
      {edit && !data.canFinalize && <p role="status" className="text-sm">Operation in progress. Draft attendance is saved to this operation; it counts toward member totals only after finalization.</p>}
      {stats && <p className="text-sm">{data.officer ? "Organization" : "Your"} finalized record: {stats.present} present · {stats.absent} absent · {stats.excused} excused across {stats.operations} operations. Reliability: {stats.value === null ? "Not measured" : `${stats.value}%`}. Excused absences are excluded.</p>}
      {data.officer && !!stats?.members?.length && <details><summary className="cursor-pointer text-sm">Member attendance totals</summary><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Finalized attendance across completed operations</caption><thead><tr>{["Member", "Operations", "Present", "Absent", "Excused", "Reliability"].map((label) => <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead><tbody>{stats.members.map((person) => <tr key={person.id} className="border-t border-border-default"><th scope="row" className="p-2">{person.name}</th><td className="p-2">{person.operations}</td><td className="p-2">{person.present}</td><td className="p-2">{person.absent}</td><td className="p-2">{person.excused}</td><td className="p-2">{person.value === null ? "Not measured" : `${person.value}%`}</td></tr>)}</tbody></table></div></details>}
    </div>
    {error && <p role="alert" className="dash-notice">{error} <button type="button" className={button} disabled={pending} onClick={() => { void api<Debrief>(path).then((row) => { install(row); setError(""); }).catch((e) => setError(e.message)); }}>Reload saved version</button></p>}
    {message && <p role="status" className="dash-notice">{message}</p>}
    <div className="dash-panel space-y-4"><h3 className="text-lg font-semibold">{data.officer ? "Attendance roster" : "Your attendance"} · {data.finalizedAt ? "Finalized" : "Draft"}</h3>
      {!entries.length && <p className="text-sm">{data.officer ? "No participants recorded. Add walk-ins or record committed members and assigned crew." : "No finalized attendance recorded for you."}</p>}
      <fieldset disabled={pending || !edit} className="space-y-3">{entries.map((entry) => <div key={entry.userId} className="grid gap-3 rounded-lg border border-border-default p-3 sm:grid-cols-2"><label className="text-sm">{entry.name}<select aria-label={`Attendance for ${entry.name}`} className={control} value={entry.status} onChange={(e) => setEntries((rows) => rows.map((row) => row.userId === entry.userId ? { ...row, status: e.target.value } : row))}><option value="">Not recorded</option><option value="PRESENT">Present</option><option value="ABSENT">Absent</option><option value="EXCUSED">Excused</option></select></label>{data.officer && <label className="text-sm">Private attendance note<input className={control} maxLength={1000} value={entry.note || ""} onChange={(e) => setEntries((rows) => rows.map((row) => row.userId === entry.userId ? { ...row, note: e.target.value } : row))} /></label>}</div>)}</fieldset>
      {edit && <section className="rounded-lg border border-border-default p-4 space-y-3" aria-labelledby="walk-in-heading">
        <h4 id="walk-in-heading" className="font-semibold">Add a walk-in member</h4>
        <p className="text-sm text-foreground-muted">Search House Wolf Discord members and add anyone who showed up. Website registration and event signup are not required. Save attendance below to keep the change.</p>
        <form className="space-y-3" onSubmit={async (e) => {
          e.preventDefault(); if (searching || pending) return;
          setSearching(true); setSearched(false); setMemberId(""); setMembers([]); setError("");
          try { setMembers(await api(`${path}/members?q=${encodeURIComponent(query)}`)); setSearched(true); }
          catch (e) { setError(e instanceof Error ? e.message : "Member search failed."); }
          finally { setSearching(false); }
        }}>
          <label className="block text-sm">Find Discord member<input className={control} required minLength={2} maxLength={80} value={query} disabled={searching || pending} onChange={(e) => setQuery(e.target.value)} placeholder="Start of username or server nickname, or user ID" /></label>
          <button className={button} disabled={pending || searching || query.trim().length < 2}>{searching ? "Searching..." : "Search Discord members"}</button>
        </form>
        {searched && !members.some((person) => !entries.some((entry) => entry.userId === person.id)) && <p role="status" className="text-sm">No matching members to add. Try another name; members already on the roster are excluded.</p>}
        <label className="block text-sm">Search results<select className={control} disabled={pending || searching} value={memberId} onChange={(e) => setMemberId(e.target.value)}><option value="">Choose a member</option>{members.filter((person) => !entries.some((entry) => entry.userId === person.id)).map((person) => <option key={person.id} value={person.id}>{person.name}{person.username ? ` (@${person.username})` : ""}</option>)}</select></label>
        <button type="button" className={button} disabled={pending || searching || !memberId} onClick={() => {
          const person = members.find((row) => row.id === memberId);
          if (person) setEntries((rows) => rows.some((row) => row.userId === person.id) ? rows : [...rows, { userId: person.id, name: person.name, status: "PRESENT", note: "" }]);
          setMemberId(""); setMessage("Walk-in added as present. Save attendance below to keep this change.");
        }}>Add as present</button>
      </section>}
      {data.officer && data.finalizedAt && <p className="text-sm">Present {data.totals.present} · Absent {data.totals.absent} · Excused {data.totals.excused}. Corrections retain the previous version.</p>}
    </div>
    {(edit || data.canReview) && <label className="dash-panel block text-sm">Reason for this save, correction or review (required)<textarea className={control} rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label>}
    {edit && <div className="flex flex-wrap gap-3"><button type="button" className={button} disabled={pending || !reason.trim() || (!!data.finalizedAt && unmarked)} onClick={() => void save("saveAttendance")}>{pending ? "Saving..." : data.finalizedAt ? "Save attendance correction" : "Save attendance draft"}</button>{data.canFinalize && !data.finalizedAt && <button type="button" className={button} disabled={pending || !reason.trim() || !entries.length || unmarked} onClick={() => void save("finalizeAttendance")}>Finalize attendance</button>}{unmarked && <p className="self-center text-sm">Mark all participants before finalizing.</p>}</div>}
    <div className="dash-panel space-y-4"><h3 className="text-lg font-semibold">After-action report · {data.reportState === "REVIEWED" ? "Reviewed" : "Awaiting review"}</h3>
      {edit && data.canFinalize ? <><label className="block text-sm">Summary visible to members after review<textarea className={control} rows={6} maxLength={10000} value={summary} onChange={(e) => setSummary(e.target.value)} /></label><label className="block text-sm">Private officer notes<textarea className={control} rows={4} maxLength={10000} value={notes} onChange={(e) => setNotes(e.target.value)} /></label><p className="text-sm text-foreground-muted">Saving a report withdraws the published version until another officer reviews it. Private notes are never included in the member summary.</p><button type="button" className={button} disabled={pending || !reason.trim() || !summary.trim()} onClick={() => void save("saveReport")}>Save report for review</button></> : <><p className="whitespace-pre-wrap text-sm">{data.canFinalize ? data.summary || "No reviewed report has been published." : "Complete the operation before writing its after-action report."}</p>{data.officer && <details><summary>Private officer notes</summary><p className="mt-3 whitespace-pre-wrap text-sm">{data.privateNotes || "No private notes."}</p></details>}</>}
      {data.canReview && data.canFinalize && <button type="button" className={button} disabled={pending || !reason.trim() || summary !== data.summary || notes !== (data.privateNotes || "")} onClick={() => void save("reviewReport")}>Approve saved report for members</button>}
      {edit && !data.canReview && data.reportState !== "REVIEWED" && <p className="text-sm text-foreground-muted">Another current officer must review the saved report.</p>}
    </div>
    {data.officer && <details className="dash-panel"><summary className="cursor-pointer">Correction &amp; review history</summary><ol className="mt-4 space-y-3">{data.history?.map((row) => <li key={row.revision} className="rounded-lg border border-border-default p-3 text-sm"><strong>Version {row.revision} · {row.action}</strong><p>{new Date(row.createdAt).toLocaleString()} · {row.reason}</p><details><summary>View saved snapshot (officers only)</summary><p className="mt-2 whitespace-pre-wrap">Summary: {row.snapshot.summary || "None"}</p><p className="whitespace-pre-wrap">Private notes: {row.snapshot.privateNotes || "None"}</p><ul>{row.snapshot.entries?.map((entry) => <li key={entry.userId}>{entry.name || "Member"}: {entry.status}{entry.note ? ` · ${entry.note}` : ""}</li>)}</ul></details></li>)}</ol></details>}
  </section>;
}
