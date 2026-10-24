"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "./EventWizard";

type CrewShip = { id: string; shipId: string; ownerId: string; name: string; model: string; capacity: number; ready: boolean; consentAt: string | null; ownerName: string };
type Seat = { id: string; label: string; role: string; operationShipId: string | null; requiredCode: string | null };
type Assignment = { id: string; seatId: string; userId: string; memberName: string; releasedAt: string | null; releaseReason?: string };
type Crew = { userId: string; canManage: boolean; crewRevision: number; pendingVerification: number; state: string; roles: string[]; audit: { id: number; action: string; at: string; actor: string; reason: string | null }[]; ships: CrewShip[]; seats: Seat[]; assignments: Assignment[]; candidates: { userId: string; name: string; preferences: string; qualifications: { code: string; expiresAt: string | null }[] }[]; availableShips: { id: string; name: string; model: string; ready: boolean; ownerName: string }[] };
const control = "mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background-card)] p-3 text-[var(--text-primary)]";
const button = "rounded-lg border border-[var(--border-strong)] px-4 py-3 disabled:opacity-50";
export default function CrewPanel({ operationId, revisionKey }: { operationId: string; revisionKey: string }) {
  const [data, setData] = useState<Crew | null>(null), [error, setError] = useState(""), [pending, setPending] = useState(false);
  const [shipId, setShipId] = useState(""), [reason, setReason] = useState(""), [chosen, setChosen] = useState<Record<string, string>>({});
  const [seat, setSeat] = useState({ label: "", role: "PILOT", operationShipId: "", requiredCode: "" });
  const [importMessage, setImportMessage] = useState("");
  const path = `operations/${operationId}/crew`;
  const refresh = useCallback(async () => { const row = await api<Crew>(path); setData(row); }, [path]);
  useEffect(() => { let active = true; api<Crew>(path).then((row) => { if (active) setData(row); }).catch((e) => { if (active) setError(e.message); }); return () => { active = false; }; }, [path, revisionKey]);
  async function change(action: string, input: unknown) {
    if (!data || pending) return; setPending(true); setError("");
    try { await api(path, "POST", { action, crewRevision: data.crewRevision, input }); if (action === "attachShip") setShipId(""); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Crew change failed."); } finally { setPending(false); }
  }
  async function importFleet() {
    if (pending) return;
    setPending(true); setError(""); setImportMessage("");
    try {
      const result = await api<{ imported: number; existing: number; unmatched: number; conflicts: number }>("fleet/registry", "POST", {});
      setImportMessage(`${result.imported} imported, ${result.existing} already linked, ${result.unmatched} without a unique member match, ${result.conflicts} ownership conflicts. Newly imported ships need officer verification in Fleet readiness before they can be attached.`);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Fleet import failed."); }
    finally { setPending(false); }
  }
  const open = data && ["DRAFT", "PUBLISHED", "ACTIVE"].includes(data.state);
  const attachable = data?.availableShips.filter((ship) => !data.ships.some((attached) => attached.shipId === ship.id)) ?? [];
  return <section className="dash-panel space-y-5" aria-labelledby="crew-heading"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="crew-heading" className="text-2xl font-bold">Ships &amp; crew</h2><div className="flex flex-wrap gap-3"><button className={button} disabled={pending} onClick={() => void refresh().catch((e) => setError(e.message))}>Refresh crew</button></div></div>
    {error && <p role="alert" className="text-red-300">{error}</p>}{!data ? <p role="status">{error ? "Crew unavailable. Use Refresh crew to retry." : "Loading crew..."}</p> : <>
      <p className="text-sm">Manual staffing requires a one-time operation with an end time. Commitment, owner consent, readiness and credentials are checked when saving assignments.</p>
      <div className="grid gap-4 md:grid-cols-2">{data.ships.map((ship) => <article key={ship.id} className="rounded-lg border border-[var(--border-default)] p-4 space-y-2"><h3 className="font-bold">{ship.name} · {ship.model}</h3><p>Owner: {ship.ownerName} · Capacity: {ship.capacity}</p><p>{ship.ready ? "Ready and verified" : "Not ready"} · {ship.consentAt ? "Owner consent recorded" : "Awaiting owner consent"}</p>{open && ship.ownerId === data.userId && <button className={button} disabled={pending || (!ship.consentAt && !ship.ready)} onClick={() => void change(ship.consentAt ? "withdrawConsent" : "consent", { operationShipId: ship.id })}>{ship.consentAt ? "Withdraw consent and release crew" : "Consent to this operation"}</button>}</article>)}</div>{!data.ships.length && <p>No ships attached. Ground-team seats can be staffed independently.</p>}
      {data.canManage && open && <div className="space-y-4 rounded-xl border border-[var(--border-default)] bg-[var(--background-elevated)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-lg font-semibold">Add a fleet ship</h3><p className="mt-1 text-sm text-foreground-muted">Import FleetYards ships, verify ownership in Fleet readiness, then attach a ship here.</p></div>
          <div className="flex flex-wrap gap-3"><button type="button" className={button} disabled={pending} onClick={() => void importFleet()}>{pending ? "Please wait..." : "Import fleet ships"}</button><Link href="/dashboard/fleet-readiness" className={button}>Fleet readiness</Link></div>
        </div>
        {importMessage && <p role="status" className="text-sm text-foreground-muted">{importMessage}</p>}
        {data.pendingVerification > 0 && <p className="rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-200">{data.pendingVerification} {data.pendingVerification === 1 ? "ship needs" : "ships need"} ownership and model verification. Open Fleet readiness to have another officer verify them.</p>}
        {attachable.length > 0 ? <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void change("attachShip", { shipId }); }}>
          <label className="min-w-0 flex-1">Attach verified ship<select className={control} required disabled={pending} value={shipId} onChange={(e) => setShipId(e.target.value)}><option value="">Select ship</option>{attachable.map((ship) => <option key={ship.id} value={ship.id}>{ship.name} &middot; {ship.model} &middot; {ship.ownerName}{ship.ready ? "" : " - not ready"}</option>)}</select></label>
          <button className={button} disabled={pending || !attachable.some((ship) => ship.id === shipId)}>Attach ship</button>
        </form> : <p className="text-sm text-foreground-muted">{data.availableShips.length ? "All verified ships are already attached to this operation." : data.pendingVerification ? "No verified ships are available to attach yet. Complete verification in Fleet readiness, then refresh crew." : "No operational ships have been registered. Import fleet ships above, or declare your own ship in Fleet readiness."}</p>}
        <p className="text-xs leading-relaxed text-foreground-muted">The public fleet is a registry. Import matches ships to members by confirmed RSI handle. Attaching a ship does not reserve it: the owner must confirm readiness and consent to this operation before crew can be assigned.</p>
      </div>}

      {data.canManage && open && <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={(e) => { e.preventDefault(); void change("addSeat", seat); }}><fieldset disabled={pending} className="contents"><label>Seat label<input required maxLength={80} className={control} placeholder="Pilot / Gunner 1 / Ground medic" value={seat.label} onChange={(e) => setSeat({ ...seat, label: e.target.value })} /></label><label>Operational role<select className={control} value={seat.role} onChange={(e) => setSeat({ ...seat, role: e.target.value })}>{data.roles.map((role) => <option key={role}>{role}</option>)}</select></label><label>Ship or ground team<select className={control} value={seat.operationShipId} onChange={(e) => setSeat({ ...seat, operationShipId: e.target.value })}><option value="">Ground team</option>{data.ships.map((ship) => <option key={ship.id} value={ship.id}>{ship.name}</option>)}</select></label><label>Required verified qualification (optional)<input pattern="[A-Z][A-Z0-9_-]{1,39}" maxLength={40} className={control} value={seat.requiredCode} onChange={(e) => setSeat({ ...seat, requiredCode: e.target.value.toUpperCase() })} /></label><button className={button}>Create seat</button></fieldset></form>}
      {data.canManage && open && <label className="block">Audit reason for assignment, release, transfer or seat removal<input className={control} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.seats.map((row) => { const assignment = data.assignments.find((a) => a.seatId === row.id && !a.releasedAt); return <article key={row.id} className="rounded-lg border border-[var(--border-default)] p-4 space-y-3"><h3 className="text-lg font-bold">{row.label}</h3><p>{row.role} · {data.ships.find((ship) => ship.id === row.operationShipId)?.name || "Ground team"}</p>{row.requiredCode && <p>Requires {row.requiredCode}, valid through operation end</p>}<p>{assignment ? `Assigned: ${assignment.memberName}` : "Unfilled"}</p>{data.canManage && open && (assignment ? <button className={button} disabled={pending || !reason.trim()} onClick={() => void change("release", { assignmentId: assignment.id, reason })}>Release assignment</button> : <form onSubmit={(e) => { e.preventDefault(); void change("assign", { seatId: row.id, userId: chosen[row.id], reason }); }} className="space-y-3"><label className="block">Committed member<select className={control} required value={chosen[row.id] || ""} onChange={(e) => setChosen({ ...chosen, [row.id]: e.target.value })}><option value="">Choose member</option>{data.candidates.map((candidate) => <option key={candidate.userId} value={candidate.userId}>{candidate.name}</option>)}</select></label><button className={button} disabled={pending || !chosen[row.id] || !reason.trim()}>Assign member</button></form>)}{data.canManage && open && <button className={button} disabled={pending || !reason.trim()} onClick={() => void change("archiveSeat", { seatId: row.id, reason })}>Archive seat and release its crew</button>}</article>; })}</div>{!data.seats.length && <p>No seats created yet.</p>}
      {data.canManage && <details><summary>Volunteer preferences and assignment history</summary><ul className="mt-3 space-y-2">{data.candidates.map((member) => <li key={member.userId}><strong>{member.name}</strong>: {member.preferences || "No preferences supplied"}<p className="text-sm">Qualifications: {member.qualifications.map((q) => `${q.code}${q.expiresAt ? ` (expires ${new Date(q.expiresAt).toLocaleDateString()})` : ""}`).join(", ") || "None recorded"}</p></li>)}</ul><ul className="mt-4 space-y-2">{data.assignments.filter((a) => a.releasedAt).map((a) => <li key={a.id}>{a.memberName}: released {new Date(a.releasedAt!).toLocaleString()} — {a.releaseReason}</li>)}</ul></details>}
      {data.canManage && <details><summary>Crew decision audit (latest 100)</summary><ul className="mt-3 space-y-3">{data.audit.map((entry) => <li key={entry.id} className="rounded border border-[var(--border-default)] p-3"><p>{entry.action} / {entry.actor}</p><p className="text-sm">{new Date(entry.at).toLocaleString()}</p>{entry.reason && <p>{entry.reason}</p>}</li>)}</ul></details>}
    </>}
  </section>;
}
