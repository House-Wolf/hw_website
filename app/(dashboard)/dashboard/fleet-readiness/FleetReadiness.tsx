"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "../operations/EventWizard";

type Ship = { id: string; name: string; model: string; ownerId: string; ownerName: string; externalRef: string | null; availability: string; readiness: string; productionState: string; verifiedAt: string | null; verificationSource: "FLEETYARDS" | "OFFICER" | "UNKNOWN" | null; evidence?: string; capacity: number; revision: number };
type Qualification = { id: string; code: string; memberName: string; evidence: string; expiresAt: string | null; revokedAt: string | null };
type Fleet = { selectedOwnerId: string; owners: { id: string; name: string }[]; productionSync?: { status: string; updated: number }; userId: string; officer: boolean; checkedAt: string; ships: Ship[]; qualifications: Qualification[] };
const inputClass = "mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background-card)] p-3 text-[var(--text-primary)]";
const buttonClass = "rounded-lg border border-[var(--border-strong)] px-4 py-3 disabled:opacity-50";

function ShipCard({ ship, owner, officer, refresh }: { ship: Ship; owner: boolean; officer: boolean; refresh: () => Promise<void> }) {
  const [editing, setEditing] = useState(false), [verifying, setVerifying] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState("");
  const [fields, setFields] = useState({ name: ship.name, model: ship.model, externalRef: ship.externalRef || "", availability: ship.availability, readiness: ship.readiness });
  const [verification, setVerification] = useState({ productionState: ship.productionState, capacity: ship.capacity, evidence: "" });
  const [editRevision, setEditRevision] = useState(ship.revision);
  async function save(action: string) {
    if (pending) return; setPending(true); setError("");
    try { await api(`fleet/${ship.id}`, "PATCH", { action, revision: editRevision, input: action === "verify" ? verification : fields }); setEditing(false); setVerifying(false); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Save failed."); } finally { setPending(false); }
  }
  return <article className="dash-panel space-y-4"><div><h2 className="text-xl font-bold">{ship.name}</h2><p>{ship.model} · Owner: {ship.ownerName}</p></div>
    <p>{ship.verifiedAt ? ship.verificationSource === "FLEETYARDS" ? "FleetYards ownership verified" : "Ownership verified" : "Ownership awaiting verification"} · Model: {ship.productionState.replaceAll("_", " ")}</p>
    <p>Owner availability: {ship.availability} · Owner readiness: {ship.readiness} · Crew capacity: {ship.capacity}</p>
    {ship.externalRef && <p className="break-all text-sm">Reference: {ship.externalRef}</p>}{ship.evidence && <p className="text-sm">Verification evidence: {ship.evidence}</p>}
    <div className="flex flex-wrap gap-3">{owner && <button className={buttonClass} onClick={() => { if (!editing) { setEditRevision(ship.revision); setFields({ name: ship.name, model: ship.model, externalRef: ship.externalRef || "", availability: ship.availability, readiness: ship.readiness }); } setEditing((v) => !v); }}>Edit declaration / readiness</button>}{officer && !owner && <details className="text-sm"><summary className="cursor-pointer">{ship.verifiedAt ? "Optional officer corrections" : "Manual ownership review"}</summary><p className="my-3">{ship.verifiedAt ? "Ownership is already verified. No additional officer review is needed to attach this ship. Use these controls only to correct crew capacity or verification evidence." : "This record has no verified owner. Import a matching FleetYards listing to verify ownership automatically, or record evidence here."}</p><button className={buttonClass} onClick={() => { if (!verifying) { setEditRevision(ship.revision); setVerification({ productionState: ship.productionState, capacity: ship.capacity, evidence: "" }); } setVerifying((v) => !v); }}>{ship.verifiedAt ? "Edit crew capacity / verification" : "Verify ownership"}</button></details>}</div>
    {editing && <form onSubmit={(e) => { e.preventDefault(); void save("update"); }} className="space-y-3"><fieldset disabled={pending} className="space-y-3">{(["name", "model", "externalRef"] as const).map((key) => <label className="block" key={key}>{key === "externalRef" ? "FleetYards vehicle/ownership reference (optional)" : key === "name" ? "Ship name" : "Model"}<input required={key !== "externalRef"} maxLength={key === "externalRef" ? 200 : 100} value={fields[key]} className={inputClass} onChange={(e) => setFields({ ...fields, [key]: e.target.value })} /></label>)}
      <label className="block">Owner availability<select className={inputClass} value={fields.availability} onChange={(e) => setFields({ ...fields, availability: e.target.value })}><option>AVAILABLE</option><option>UNAVAILABLE</option></select></label><label className="block">Readiness attestation<select className={inputClass} value={fields.readiness} onChange={(e) => setFields({ ...fields, readiness: e.target.value })}><option>READY</option><option>MAINTENANCE</option><option>UNKNOWN</option></select></label><p className="text-sm">Changing the model/reference clears ownership verification. Import the matching FleetYards listing again or request manual review. Withdraw operation consent before making a reserved ship unavailable.</p><button className={buttonClass}>{pending ? "Saving..." : "Save ship"}</button></fieldset></form>}
    {verifying && <form onSubmit={(e) => { e.preventDefault(); void save("verify"); }} className="space-y-3"><fieldset disabled={pending} className="space-y-3"><label className="block">Verified model production state<select className={inputClass} value={verification.productionState} onChange={(e) => setVerification({ ...verification, productionState: e.target.value })}><option>FLIGHT_READY</option><option>CONCEPT</option><option>UNKNOWN</option></select></label><label className="block">Verified crew capacity<input className={inputClass} type="number" min={1} max={100} required value={verification.capacity} onChange={(e) => setVerification({ ...verification, capacity: Number(e.target.value) })} /></label><label className="block">Ownership and model evidence<input required maxLength={1000} className={inputClass} value={verification.evidence} onChange={(e) => setVerification({ ...verification, evidence: e.target.value })} /></label><p className="text-sm">Matching FleetYards listings verify ownership automatically. Linked model production status refreshes automatically from FleetYards. Use this form to confirm crew capacity or review a manually declared ship. This grants no Discord role.</p><button className={buttonClass}>{pending ? "Saving..." : ship.verifiedAt ? "Save officer correction" : "Record ownership verification"}</button></fieldset></form>}
    {error && <p role="alert" className="text-red-300">{error}</p>}
  </article>;
}

export default function FleetReadiness() {
  const [data, setData] = useState<Fleet | null>(null), [error, setError] = useState(""), [pending, setPending] = useState(false);
  const [newShip, setNewShip] = useState({ name: "", model: "", externalRef: "" });
  const [declarationKey, setDeclarationKey] = useState(() => crypto.randomUUID());
  const [search, setSearch] = useState(""), [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [qualification, setQualification] = useState({ userId: "", code: "", evidence: "", expiresAt: "" });
  const [reason, setReason] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const owners = data?.owners ?? [];
  const selectedOwner = owners.find((owner) => owner.id === selectedOwnerId);
  const selectedShips = data?.ships.filter((ship) => ship.ownerId === selectedOwnerId) ?? [];
  const fleetPath = selectedOwnerId ? `fleet?ownerId=${encodeURIComponent(selectedOwnerId)}` : "fleet";
  const refresh = useCallback(async () => { const result = await api<Fleet>(fleetPath); setData(result); }, [fleetPath]);
  useEffect(() => { let active = true; api<Fleet>(fleetPath).then((result) => { if (active) setData(result); }).catch((e) => { if (active) setError(e.message); }); return () => { active = false; }; }, [fleetPath]);
  useEffect(() => { const timer = setInterval(() => { void refresh().catch((e) => setError(e.message)); }, 30 * 60 * 1000); return () => clearInterval(timer); }, [refresh]);
  async function write(path: string, body: unknown, after?: () => void) {
    if (pending) return; setPending(true); setError("");
    try { await api(path, "POST", body); after?.(); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Save failed."); } finally { setPending(false); }
  }
  async function importRegistry() {
    if (pending) return; setPending(true); setError(""); setImportMessage("");
    try {
      const result = await api<{ imported: number; existing: number; verified: number; conflicts: number; unmatched: number }>("fleet/registry", "POST", {});
      setImportMessage(`${result.imported} ships imported with verified ownership; ${result.verified} existing ships ownership verified; ${result.existing} already linked; ${result.unmatched} without a unique member match; ${result.conflicts} owner/model conflicts left unchanged.`);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "FleetYards import failed."); }
    finally { setPending(false); }
  }
  return <div className="space-y-6"><div className="dash-page-heading"><div><p className="dash-eyebrow">HOUSE WOLF FLEET</p><h1>Fleet readiness</h1><p>Declare your own ships, verify ownership and consent to individual operations.</p></div><Link className="dash-button dash-button-secondary" href="/fleet">Browse FleetYards registry</Link></div>
    {error && <p role="alert" className="dash-notice">{error}</p>}{!data ? <p role="status">{error ? "Fleet unavailable. Reload to retry." : "Loading verified fleet..."}</p> : <>
      {data.productionSync?.status === "unavailable" && <p role="status" className="dash-notice">FleetYards model status could not be refreshed. Showing previously recorded statuses; automatic release updates will retry on the next refresh.</p>}
      <section className="dash-panel space-y-4"><h2 className="text-xl font-bold">Import ships from FleetYards</h2>
        <p>{data.officer ? "Link registry ships to their individual owners using each member’s confirmed RSI handle." : "Import registry ships matching your confirmed RSI handle."} Hidden owners, loaners and ambiguous matches are skipped. Existing ship records are kept.</p>
        <button disabled={pending} className={buttonClass} onClick={() => void importRegistry()}>{pending ? "Please wait..." : data.officer ? "Import member ships" : "Import my ships"}</button>
        <p className="text-sm">FleetYards ownership is accepted when its RSI handle matches a confirmed member. Imported ships can be attached to operations immediately. Linked ships automatically receive their model release status from FleetYards, using data cached for 30 minutes. Concept ships become flight-ready when FleetYards reports their release. Crew capacity, owner readiness and consent are checked separately before staffing.</p>
        {importMessage && <p role="status">{importMessage}</p>}
      </section>
      <form className="dash-panel space-y-4" onSubmit={(e) => { e.preventDefault(); void write("fleet", { ...newShip, requestKey: declarationKey }, () => { setNewShip({ name: "", model: "", externalRef: "" }); setDeclarationKey(crypto.randomUUID()); }); }}><h2 className="text-xl font-bold">Declare a ship you own</h2><fieldset disabled={pending} className="grid gap-4 md:grid-cols-3">{(["name", "model", "externalRef"] as const).map((key) => <label className="block" key={key}>{key === "name" ? "Ship name" : key === "model" ? "Model" : "FleetYards vehicle / ownership reference (optional)"}<input required={key !== "externalRef"} maxLength={key === "externalRef" ? 200 : 100} className={inputClass} value={newShip[key]} onChange={(e) => setNewShip({ ...newShip, [key]: e.target.value })} /></label>)}<button className={buttonClass}>{pending ? "Saving..." : "Declare ship"}</button></fieldset><p className="text-sm">Manually declared ships need ownership verification. Importing a matching FleetYards listing verifies ownership automatically; availability and readiness remain owner-declared.</p></form>
      <section className="space-y-5" aria-labelledby="owner-ships-heading">
        <div className="dash-panel space-y-3"><h2 id="owner-ships-heading" className="text-xl font-bold">Ships by owner</h2>
          <label className="block max-w-xl">Ship owner<select className={inputClass} value={selectedOwner ? selectedOwnerId : ""} disabled={pending || !owners.length} onChange={(e) => setSelectedOwnerId(e.target.value)}><option value="">Select a member</option>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}{owner.id === data.userId ? " (you)" : ""}</option>)}</select></label>
          <p role="status" className="text-sm">{selectedOwner ? data.selectedOwnerId !== selectedOwnerId ? "Loading member ships..." : selectedShips.length ? `${selectedOwner.name}: ${selectedShips.length} ${selectedShips.length === 1 ? "ship" : "ships"}` : `No registered ships to display for ${selectedOwner.name}. Import their matching FleetYards listings or have them declare a ship.` : "Select a member to view their ships."}</p>
        </div>
        {selectedOwner && <div className="grid gap-5 xl:grid-cols-2">{selectedShips.map((ship) => <ShipCard key={ship.id} ship={ship} owner={ship.ownerId === data.userId} officer={data.officer} refresh={refresh} />)}</div>}
      </section>
      {data.officer && <section className="dash-panel space-y-4"><h2 className="text-xl font-bold">Manual verified qualifications</h2><p>Another current officer verifies evidence. Qualifications do not change ranks or Discord roles.</p>
        <form className="flex flex-wrap gap-3" onSubmit={async (e) => { e.preventDefault(); setError(""); try { setMembers(await api(`qualifications?q=${encodeURIComponent(search)}`)); } catch (e) { setError(e instanceof Error ? e.message : "Search failed."); } }}><label>Find member<input className={inputClass} value={search} maxLength={80} onChange={(e) => setSearch(e.target.value)} /></label><button className={buttonClass}>Search members</button></form>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void write("qualifications", { action: "issue", input: { ...qualification, expiresAt: qualification.expiresAt ? `${qualification.expiresAt}T23:59:59Z` : "" } }); }}><fieldset disabled={pending} className="contents"><label>Member<select required className={inputClass} value={qualification.userId} onChange={(e) => setQualification({ ...qualification, userId: e.target.value })}><option value="">Search and select member</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label>Qualification code<input required pattern="[A-Z][A-Z0-9_-]{1,39}" maxLength={40} placeholder="MEDIC" className={inputClass} value={qualification.code} onChange={(e) => setQualification({ ...qualification, code: e.target.value.toUpperCase() })} /></label><label>Evidence<input required maxLength={1000} className={inputClass} value={qualification.evidence} onChange={(e) => setQualification({ ...qualification, evidence: e.target.value })} /></label><label>Expires at end of date (UTC, optional)<input type="date" className={inputClass} value={qualification.expiresAt} onChange={(e) => setQualification({ ...qualification, expiresAt: e.target.value })} /></label><button className={buttonClass}>{pending ? "Saving..." : "Issue verified qualification"}</button></fieldset></form>
      </section>}
      <section className="dash-panel space-y-4"><h2 className="text-xl font-bold">{data.officer ? "Qualification history" : "Your qualification history"}</h2>{data.officer && <label className="block">Reason required when revoking<input className={inputClass} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label>}<ul className="space-y-3">{data.qualifications.map((row) => <li key={row.id} className="rounded-lg border border-[var(--border-default)] p-3"><strong>{row.memberName}: {row.code}</strong><p>{row.revokedAt ? "Revoked" : row.expiresAt && Date.parse(row.expiresAt) <= Date.parse(data.checkedAt) ? "Expired" : "Verified"} · {row.expiresAt ? `Expires ${new Date(row.expiresAt).toLocaleString()}` : "No expiry"}</p><p className="break-words text-sm">Evidence: {row.evidence}</p>{data.officer && !row.revokedAt && <button disabled={pending || !reason.trim()} className={buttonClass} onClick={() => void write("qualifications", { action: "revoke", input: { id: row.id, reason } })}>Revoke with audit reason</button>}</li>)}</ul>{!data.qualifications.length && <p>No qualification records yet.</p>}</section>
    </>}
  </div>;
}
