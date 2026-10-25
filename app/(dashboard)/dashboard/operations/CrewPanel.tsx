"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./EventWizard";
import ShipPicker from "./ShipPicker";

type CrewShip = { id: string; shipId: string; ownerId: string; name: string; model: string; capacity: number; ready: boolean; consentAt: string | null; ownerName: string };
type Seat = { id: string; label: string; role: string; operationShipId: string | null; requiredCode: string | null };
type Assignment = { id: string; seatId: string; userId: string; memberName: string; releasedAt: string | null; releaseReason?: string };
type Crew = { discordInterest?: { supported: boolean; checkedAt: string | null; nextRefreshAt: string | null; count: number }; userId: string; canManage: boolean; crewRevision: number; pendingVerification: number; state: string; roles: string[]; audit: { id: number; action: string; at: string; actor: string; reason: string | null }[]; ships: CrewShip[]; seats: Seat[]; assignments: Assignment[]; candidates: { userId: string; name: string; source?: string; preferences: string; qualifications: { code: string; expiresAt: string | null }[] }[]; availableShips: { id: string; name: string; model: string; ready: boolean; ownerName: string }[] };
const control = "mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background-card)] p-3 text-[var(--text-primary)]";
const button = "rounded-lg border border-[var(--border-strong)] px-4 py-3 disabled:opacity-50";
const seatButton = "min-h-10 shrink-0 rounded-lg border border-[var(--border-strong)] px-3 py-2 text-xs font-medium disabled:opacity-50";
export default function CrewPanel({ operationId, revisionKey, staffingInput, onChanged, onEditSchedule }: { operationId: string; revisionKey: string; staffingInput?: { end: string | null; recurrence: string }; onChanged?: () => void; onEditSchedule?: () => void }) {
  const [data, setData] = useState<Crew | null>(null), [error, setError] = useState(""), [pending, setPending] = useState(false);
  const [shipId, setShipId] = useState(""), [reason, setReason] = useState(""), [chosen, setChosen] = useState<Record<string, string>>({});
  const [seat, setSeat] = useState({ label: "", role: "PILOT", operationShipId: "", requiredCode: "" });
  const [importMessage, setImportMessage] = useState("");
  const [checkedAt, setCheckedAt] = useState(() => Date.now());
  const [staffingAction, setStaffingAction] = useState<{ action: string; input: Record<string, string>; title: string; description: string } | null>(null);
  const [rosterMessage, setRosterMessage] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (staffingAction) dialog.current?.showModal(); }, [staffingAction]);
  const path = `operations/${operationId}/crew`;
  const refresh = useCallback(async () => { const row = await api<Crew>(path); setData(row); setCheckedAt(Date.now()); }, [path]);
  useEffect(() => { let active = true; api<Crew>(path).then((row) => { if (active) setData(row); }).catch((e) => { if (active) setError(e.message); }); return () => { active = false; }; }, [path, revisionKey]);
  async function change(action: string, input: unknown) {
    if (!data || pending) return; setPending(true); setPendingAction(action); setError("");
    try { const result = await api<{ count?: number; cached?: boolean }>(path, "POST", { action, crewRevision: data.crewRevision, input }); if (action === "syncInterested") setRosterMessage(result.cached ? "Using the latest roster. Discord pulls are limited to once per minute." : `${result.count || 0} eligible Interested members pulled from Discord.`); if (action === "attachShip") setShipId(""); await refresh(); onChanged?.(); return true; }
    catch (e) { setError(e instanceof Error ? e.message : "Crew change failed."); return false; } finally { setPending(false); }
  }
  async function importFleet() {
    if (pending) return;
    setPending(true); setError(""); setImportMessage("");
    try {
      const result = await api<{ imported: number; existing: number; verified: number; unmatched: number; conflicts: number }>("fleet/registry", "POST", {});
      setImportMessage(`${result.imported} new ships imported; ${result.verified} existing ships gained ownership verification; ${result.existing} already linked; ${result.unmatched} public listings could not be matched to a unique eligible website member; ${result.conflicts} owner/model conflicts left unchanged.`);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Fleet import failed."); }
    finally { setPending(false); }
  }
  const open = data && ["DRAFT", "PUBLISHED", "ACTIVE"].includes(data.state);
  const staffingIssue = !staffingInput?.end ? "Set an operation end time before assigning crew." : staffingInput.recurrence !== "NONE" ? "Use a separate one-time occurrence to assign crew." : Date.parse(staffingInput.end) <= checkedAt ? "This operation has ended. Crew assignment is closed." : data?.state === "DRAFT" ? "Publish this operation before assigning crew." : null;
  function requestStaffing(action: string, input: Record<string, string>, title: string, description: string) { setReason(""); setError(""); setStaffingAction({ action, input, title, description }); }
  const attachable = data?.availableShips.filter((ship) => !data.ships.some((attached) => attached.shipId === ship.id)) ?? [];
  return <section className="dash-panel space-y-5" aria-labelledby="crew-heading"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="crew-heading" className="text-xl font-bold">Crew assignments</h2><p className="mt-1 text-sm text-foreground-muted">Choose a confirmed or Discord Interested member, then assign their seat.</p></div><div className="flex flex-wrap gap-3"><button className={button} disabled={pending} onClick={() => void refresh().catch((e) => setError(e.message))}>Refresh crew</button></div></div>
    {error && <p role="alert" className="text-red-300">{error}</p>}{!data ? <p role="status">{error ? "Crew unavailable. Use Refresh crew to retry." : "Loading crew..."}</p> : <>
      {pending && <p role="status" className="text-sm text-foreground-muted">{pendingAction === "syncInterested" ? "Pulling Discord Interested..." : "Saving crew changes..."}</p>}
      {data.canManage && open && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-default bg-background-elevated p-3"><div><p className="text-sm font-semibold">Discord Interested</p><p className="mt-1 text-xs text-foreground-muted">{data.discordInterest?.supported ? "Pull the linked event roster to assign members who have not signed into the website." : "Publish and link a Discord event to use its Interested roster."}</p>{data.discordInterest?.checkedAt && <p className="mt-1 text-xs text-foreground-muted">Last pulled: {new Date(data.discordInterest.checkedAt).toLocaleString()} &middot; {data.discordInterest.count} eligible members</p>}</div>{data.discordInterest?.supported && <button type="button" className={seatButton} disabled={pending} onClick={() => void change("syncInterested", {})}>{pending && pendingAction === "syncInterested" ? "Pulling..." : "Pull Discord Interested"}</button>}</div>}
      {rosterMessage && <p role="status" className="text-sm text-foreground-muted">{rosterMessage}</p>}
      {staffingIssue && open && <p className="text-sm text-amber-200">{staffingIssue}{onEditSchedule && <button type="button" className="ml-2 underline" onClick={onEditSchedule}>Edit schedule</button>}</p>}


      {data.canManage && open && <details className="rounded-lg border border-border-default p-3"><summary className="cursor-pointer text-sm font-semibold">Create a crew seat</summary><form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={(e) => { e.preventDefault(); void change("addSeat", seat); }}><fieldset disabled={pending} className="contents"><label>Seat label<input required maxLength={80} className={control} placeholder="Pilot / Gunner 1 / Ground medic" value={seat.label} onChange={(e) => setSeat({ ...seat, label: e.target.value })} /></label><label>Operational role<select className={control} value={seat.role} onChange={(e) => setSeat({ ...seat, role: e.target.value })}>{data.roles.map((role) => <option key={role}>{role}</option>)}</select></label><label>Ship or ground team<select className={control} value={seat.operationShipId} onChange={(e) => setSeat({ ...seat, operationShipId: e.target.value })}><option value="">Ground team</option>{data.ships.map((ship) => <option key={ship.id} value={ship.id}>{ship.name}</option>)}</select></label><label>Required verified qualification (optional)<input pattern="[A-Z][A-Z0-9_-]{1,39}" maxLength={40} className={control} value={seat.requiredCode} onChange={(e) => setSeat({ ...seat, requiredCode: e.target.value.toUpperCase() })} /></label><button className={button}>Create seat</button></fieldset></form></details>}

      <div className="grid items-start gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 18rem), 1fr))" }}>{data.seats.map((row) => {
        const assignment = data.assignments.find((a) => a.seatId === row.id && !a.releasedAt);
        return <article key={row.id} className="min-w-0 space-y-3 rounded-lg border border-[var(--border-default)] p-3">
          <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words text-sm font-semibold leading-snug">{row.label}</h3><p className="mt-1 break-words text-xs text-foreground-muted">{row.role} &middot; {data.ships.find((ship) => ship.id === row.operationShipId)?.name || "Ground team"}</p></div><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${assignment ? "bg-emerald-400/10 text-emerald-300" : "bg-steel/15 text-foreground-muted"}`}>{assignment ? "Filled" : "Unfilled"}</span></div>
          {row.requiredCode && <p className="text-xs text-foreground-muted">Requires {row.requiredCode} through operation end</p>}
          {assignment && <p className="break-words text-sm">{assignment.memberName}</p>}
          {data.canManage && open && (assignment ? <button className={seatButton} disabled={pending} onClick={() => requestStaffing("release", { assignmentId: assignment.id }, "Release assignment", `${assignment.memberName} will be released from ${row.label}.`)}>Release assignment</button> : <form onSubmit={(e) => { e.preventDefault(); if (chosen[row.id] && !staffingIssue) requestStaffing("assign", { seatId: row.id, userId: chosen[row.id] }, "Confirm crew assignment", `${data.candidates.find((member) => member.userId === chosen[row.id])?.name || "Member"} will fill ${row.label}.`); }}>
            <label htmlFor={`crew-member-${row.id}`} className="mb-1 block text-xs text-foreground-muted">Crew member</label>
            <div className="flex items-center gap-2"><select id={`crew-member-${row.id}`} className="min-h-10 min-w-0 flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--background-card)] px-2 py-2 text-xs text-[var(--text-primary)]" required value={chosen[row.id] || ""} onChange={(e) => setChosen({ ...chosen, [row.id]: e.target.value })}><option value="">Choose member</option>{data.candidates.some((candidate) => candidate.source !== "DISCORD_INTERESTED") && <optgroup label="Confirmed members">{data.candidates.filter((candidate) => candidate.source !== "DISCORD_INTERESTED").map((candidate) => <option key={candidate.userId} value={candidate.userId}>{candidate.name}</option>)}</optgroup>}{data.candidates.some((candidate) => candidate.source === "DISCORD_INTERESTED") && <optgroup label="Discord Interested">{data.candidates.filter((candidate) => candidate.source === "DISCORD_INTERESTED").map((candidate) => <option key={candidate.userId} value={candidate.userId}>{candidate.name}</option>)}</optgroup>}</select><button className={seatButton} disabled={pending || !chosen[row.id] || !!staffingIssue} title={staffingIssue || "Assign selected member"}>Assign</button></div>
          </form>)}
          {data.canManage && open && <div className="border-t border-[var(--border-default)] pt-1"><button className="min-h-9 text-xs text-foreground-muted underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50" title="Archive this seat and release its assigned crew" disabled={pending} onClick={() => requestStaffing("archiveSeat", { seatId: row.id }, "Archive crew seat", `${row.label} will be archived and any assigned crew released.`)}>Archive seat &amp; release crew</button></div>}
        </article>;
      })}</div>{!data.seats.length && <p>No seats created yet.</p>}
      <details className="space-y-4 rounded-lg border border-border-default p-4"><summary className="cursor-pointer text-sm font-semibold">Ships &amp; fleet <span className="font-normal text-foreground-muted">({data.ships.length} attached)</span></summary>
      <div className="grid gap-4 md:grid-cols-2">{data.ships.map((ship) => <article key={ship.id} className="rounded-lg border border-[var(--border-default)] p-4 space-y-2"><h3 className="font-bold">{ship.name} · {ship.model}</h3><p>Owner: {ship.ownerName} · Capacity: {ship.capacity}</p><p>{ship.ready ? "Ready and verified" : "Not ready"} · {ship.consentAt ? "Owner consent recorded" : "Awaiting owner consent"}</p>{open && ship.ownerId === data.userId && <button className={button} disabled={pending || (!ship.consentAt && !ship.ready)} onClick={() => void change(ship.consentAt ? "withdrawConsent" : "consent", { operationShipId: ship.id })}>{ship.consentAt ? "Withdraw consent and release crew" : "Consent to this operation"}</button>}</article>)}</div>{!data.ships.length && <p>No ships attached. Ground-team seats can be staffed independently.</p>}
      {data.canManage && open && <div className="space-y-4 rounded-xl border border-[var(--border-default)] bg-[var(--background-elevated)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-lg font-semibold">Add a fleet ship</h3><p className="mt-1 text-sm text-foreground-muted">Import FleetYards ships to verify their owners automatically, then attach a ship here.</p></div>
          <div className="flex flex-wrap gap-3"><button type="button" className={button} disabled={pending} onClick={() => void importFleet()}>{pending ? "Please wait..." : "Import fleet ships"}</button><Link href="/dashboard/fleet-readiness" className={button}>Fleet readiness</Link></div>
        </div>
        {importMessage && <p role="status" className="text-sm text-foreground-muted">{importMessage}</p>}
        <p role="status" className="text-sm">{attachable.length} verified {attachable.length === 1 ? "ship available" : "ships available"} to attach. Flight-ready model status updates automatically from FleetYards.</p>
        {data.pendingVerification > 0 && <details className="rounded-lg border border-[var(--border-default)] p-3 text-sm"><summary>{data.pendingVerification} other {data.pendingVerification === 1 ? "ship has" : "ships have"} unverified ownership</summary><p className="mt-2">These records do not block the verified ships below. Flight-ready model status confirms a ship is released in-game; ownership requires a matching FleetYards listing and confirmed member RSI handle. Records that cannot be matched remain available for manual ownership review in Fleet readiness.</p></details>}
        {attachable.length > 0 ? <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (attachable.some((ship) => ship.id === shipId)) void change("attachShip", { shipId }); }}>
          <ShipPicker ships={attachable} value={shipId} onChange={setShipId} disabled={pending} />
          <button className={`${button} mt-6 self-start`} disabled={pending || !attachable.some((ship) => ship.id === shipId)}>Attach ship</button>
        </form> : <p className="text-sm text-foreground-muted">{data.availableShips.length ? "All verified ships are already attached to this operation." : data.pendingVerification ? "No verified ships are available to attach yet. Import matching FleetYards listings or complete manual ownership review, then refresh crew." : "No operational ships have been registered. Import fleet ships above, or declare your own ship in Fleet readiness."}</p>}
        <p className="text-xs leading-relaxed text-foreground-muted">The public fleet is a registry. FleetYards verifies ownership by matching ships to confirmed member RSI handles. Attaching a ship does not reserve it: the owner must confirm readiness and consent to this operation before crew can be assigned.</p>
      </div>}
      </details>
      {data.canManage && <details><summary>Volunteer preferences and assignment history</summary><ul className="mt-3 space-y-2">{data.candidates.map((member) => <li key={member.userId}><strong>{member.name}</strong>: {member.preferences || "No preferences supplied"}<p className="text-sm">Qualifications: {member.qualifications.map((q) => `${q.code}${q.expiresAt ? ` (expires ${new Date(q.expiresAt).toLocaleDateString()})` : ""}`).join(", ") || "None recorded"}</p></li>)}</ul><ul className="mt-4 space-y-2">{data.assignments.filter((a) => a.releasedAt).map((a) => <li key={a.id}>{a.memberName}: released {new Date(a.releasedAt!).toLocaleString()} — {a.releaseReason}</li>)}</ul></details>}
      {data.canManage && <details><summary>Crew decision audit (latest 100)</summary><ul className="mt-3 space-y-3">{data.audit.map((entry) => <li key={entry.id} className="rounded border border-[var(--border-default)] p-3"><p>{entry.action} / {entry.actor}</p><p className="text-sm">{new Date(entry.at).toLocaleString()}</p>{entry.reason && <p>{entry.reason}</p>}</li>)}</ul></details>}
      {staffingAction && <dialog ref={dialog} aria-labelledby="staffing-action-title" className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-border-default bg-background-card p-6 text-foreground shadow-2xl backdrop:bg-black/65" onCancel={(event) => { if (pending) event.preventDefault(); else setStaffingAction(null); }}>
        <form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); if (!reason.trim() || pending) return; if (await change(staffingAction.action, { ...staffingAction.input, reason })) setStaffingAction(null); }}>
          <h3 id="staffing-action-title" className="text-lg font-semibold">{staffingAction.title}</h3><p className="text-sm text-foreground-muted">{staffingAction.description}</p>{staffingAction.input.userId?.startsWith("discord:") && <p className="text-xs text-foreground-muted">This confirms a place from Discord Interested. It does not record attendance. Use Release assignment if they do not show up.</p>}
          <label className="block text-sm">Reason for this change <span className="text-foreground-muted">(required)</span><textarea className={control} required autoFocus rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: Initial crew assignment for this mission" /></label>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <div className="flex justify-end gap-2"><button type="button" className={button} disabled={pending} onClick={() => setStaffingAction(null)}>Cancel</button><button type="submit" className={`${button} bg-steel/20`} disabled={pending || !reason.trim()}>{pending ? "Saving…" : "Confirm change"}</button></div>
        </form>
      </dialog>}
    </>}
  </section>;
}
