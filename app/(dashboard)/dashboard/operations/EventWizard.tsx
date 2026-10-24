"use client";
import { useEffect, useState } from "react";
import { localInstant } from "@/lib/command/eventInput.js";

export type EventInput = { title: string; description: string; entityType: string; channelId: string; location: string; timezone: string; startLocal: string; endLocal: string; startChoice: string; endChoice: string; recurrence: string; visibility: string; imageData: string | null; imageBehavior: string };
export type Operation = { id: string; input: EventInput & { start: string; end: string | null }; state: string; revision: number; guildId: string; nativeEventId: string | null; announcementChannelId?: string | null; syncState: string; canManage?: boolean; remoteSnapshot?: { name: string; description: string; start: string; end: string | null; location: string | null; channel_id: string | null; status: number }; deliveries?: { id: string; revision: number; kind: string; status: string; errorCode: string | null }[]; signups?: { status: string; preferences: string }[] };
export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/command/${path}`, { method, cache: "no-store", headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed. Please retry.");
  return result.data;
}
const empty: EventInput = { title: "", description: "", entityType: "EXTERNAL", channelId: "", location: "", timezone: "UTC", startLocal: "", endLocal: "", startChoice: "reject", endChoice: "reject", recurrence: "NONE", visibility: "GUILD", imageData: null, imageBehavior: "PRESERVE" };
const control = "mt-1 w-full rounded-lg border border-[var(--border-default)] bg-[var(--background-card)] p-3 text-[var(--text-primary)] disabled:opacity-50";
export default function EventWizard({ operation, onSaved }: { operation?: Operation; onSaved: (operation: Operation) => void }) {
  const [input, setInput] = useState<EventInput>(() => operation ? { ...empty, ...Object.fromEntries(Object.keys(empty).map((key) => [key, operation.input[key as keyof EventInput]])) } : empty);
  const [step, setStep] = useState(0), [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState(""), [pending, setPending] = useState(false), [key] = useState(() => crypto.randomUUID());
  const [draft, setDraft] = useState(operation);
  useEffect(() => { let active = true; api<{ id: string; name: string }[]>("voice-channels").then((rows) => { if (active) setChannels(rows); }).catch((e) => { if (active) setError(e.message); }); return () => { active = false; }; }, []);
  const update = (field: keyof EventInput, value: string | null) => setInput((old) => ({ ...old, [field]: value }));
  async function save(publish: boolean) {
    setPending(true); setError("");
    try {
      let saved = draft ? await api<Operation>(`operations/${draft.id}`, "PATCH", { action: "save", revision: draft.revision, input }) : await api<Operation>("operations", "POST", { requestKey: key, input });
      setDraft(saved);
      if (publish && saved.state === "DRAFT") saved = await api<Operation>(`operations/${saved.id}`, "PATCH", { action: "publish", revision: saved.revision });
      setDraft(saved); onSaved(saved);
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed. Your input is preserved."); }
    finally { setPending(false); }
  }
  function next() {
    setError("");
    try {
      if (step === 0 && (input.entityType === "VOICE" ? !input.channelId : !input.location.trim())) throw new Error("Select a voice channel or enter the meeting location.");
      if (step === 1) {
        const start = localInstant(input.startLocal, input.timezone, input.startChoice);
        const end = input.endLocal ? localInstant(input.endLocal, input.timezone, input.endChoice) : null;
        if (!input.title.trim() || input.title.length > 100) throw new Error("Enter a title of at most 100 characters.");
        if ((input.entityType === "EXTERNAL" && !end) || (end && end <= start)) throw new Error("Enter an end time after the start.");
        if (input.recurrence !== "NONE" && input.timezone !== "UTC") throw new Error("Native recurring schedules require UTC in this form.");
      }
      setStep((value) => Math.min(3, value + 1));
    } catch (e) { setError(e instanceof Error ? e.message : "Review your event."); }
  }
  async function cover(file?: File) {
    if (!file) return;
    if (file.size > 500000 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Choose PNG, JPEG or WebP under 500 KB."); return; }
    const reader = new FileReader(); reader.onload = () => setInput((old) => ({ ...old, imageData: String(reader.result), imageBehavior: "REPLACE" })); reader.readAsDataURL(file);
  }
  return <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--background-card)] p-5 sm:p-8">
    <ol aria-label="Event creation steps" className="mb-6 flex flex-wrap gap-3 text-sm">{["Location", "Event Info", "Review", "Publish"].map((name, index) => <li key={name} aria-current={step === index ? "step" : undefined} className={step === index ? "font-bold text-[var(--accent-primary)]" : "text-[var(--text-secondary)]"}>{index + 1}. {name}</li>)}</ol>
    <form onSubmit={(event) => { event.preventDefault(); if (step < 3) next(); else void save(true); }} className="space-y-5">
      <fieldset disabled={pending} className="space-y-5">
        {step === 0 && <><legend className="text-xl font-bold">Where will the operation take place?</legend>
          <label className="block">Location type<select className={control} value={input.entityType} onChange={(e) => update("entityType", e.target.value)}><option value="VOICE">Voice Channel</option><option value="EXTERNAL">Somewhere Else</option></select></label>
          {input.entityType === "VOICE" ? <label className="block">Server voice channel<select className={control} required value={input.channelId} onChange={(e) => update("channelId", e.target.value)}><option value="">Select a channel</option>{channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}</select><span className="text-sm text-[var(--text-secondary)]">Channels are loaded from House Wolf. Permission checks run again before publication.</span></label> : <label className="block">In-game or external location<input className={control} required maxLength={100} value={input.location} onChange={(e) => update("location", e.target.value)} /></label>}
          <label className="block">Visibility<select className={control} value={input.visibility} onChange={(e) => update("visibility", e.target.value)}><option value="GUILD">All guild members</option><option value="OFFICERS">Officers only — draft, native publishing blocked</option></select></label></>}
        {step === 1 && <><legend className="text-xl font-bold">Event information</legend>
          <label className="block">Event title<input required maxLength={100} className={control} value={input.title} onChange={(e) => update("title", e.target.value)} /></label>
          <label className="block">Description<textarea rows={5} maxLength={700} className={control} value={input.description} onChange={(e) => update("description", e.target.value)} /><span className="text-sm text-[var(--text-secondary)]">Up to 700 characters; space is reserved for the dashboard signup link.</span></label>
          <label className="block">IANA timezone<input required className={control} placeholder="America/New_York" value={input.timezone} onChange={(e) => update("timezone", e.target.value)} /></label>
          {(["start", "end"] as const).map((name) => <div key={name} className="grid gap-3 sm:grid-cols-2"><label className="block">{name === "start" ? "Start" : "End"} date and time<input className={control} type="datetime-local" required={name === "start" || input.entityType === "EXTERNAL"} value={input[`${name}Local`]} onChange={(e) => update(`${name}Local`, e.target.value)} /></label><label className="block">If this time occurs twice<select className={control} value={input[`${name}Choice`]} onChange={(e) => update(`${name}Choice`, e.target.value)}><option value="reject">Ask me to resolve ambiguity</option><option value="earlier">Earlier offset</option><option value="later">Later offset</option></select></label></div>)}
          <label className="block">Native recurrence<select className={control} value={input.recurrence} onChange={(e) => update("recurrence", e.target.value)}><option value="NONE">Does not repeat</option><option value="WEEKLY">Weekly (UTC)</option><option value="FORTNIGHTLY">Every other week (UTC)</option></select><span className="text-sm text-[var(--text-secondary)]">Discord does not accept a recurrence count or end date. These UTC schedules may shift local time at DST. Custom schedules are unsupported. Recurring series currently share one operation signup; per-occurrence attendance is not yet available.</span></label>
          <label className="block">Optional cover image<input className={control} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void cover(e.target.files?.[0])} /><span className="text-sm text-[var(--text-secondary)]">Under 500 KB. Images are decoded and re-encoded on the server.</span></label>{<button type="button" onClick={() => setInput((old) => ({ ...old, imageData: null, imageBehavior: "REMOVE" }))} className="underline">Remove cover</button>}<button type="button" className="ml-4 underline" onClick={() => setInput((old) => ({ ...old, imageData: null, imageBehavior: "PRESERVE" }))}>Keep existing Discord cover</button></>}
        {step >= 2 && <><legend className="text-xl font-bold">{step === 2 ? "Review operation" : "Ready to publish"}</legend><h3 className="text-2xl font-bold">{input.title}</h3><p className="whitespace-pre-wrap">{input.description}</p><p>{input.entityType === "VOICE" ? channels.find((row) => row.id === input.channelId)?.name || input.channelId : input.location}</p><p>Start: {input.startLocal} ({input.timezone}){input.startChoice !== "reject" ? `, ${input.startChoice} offset` : ""}</p><p>End: {input.endLocal || "Not specified"} ({input.timezone})</p><p>Recurrence: {input.recurrence}. Visibility: {input.visibility}.</p><p className="text-[var(--text-secondary)]">Publication is queued for the bot worker. Discord Interested stays separate from confirmed House Wolf signup. Restricted native publication is blocked.</p></>}
      </fieldset>
      {error && <p role="alert" className="text-red-300">{error}</p>}
      <div className="flex flex-wrap gap-3"><button type="button" disabled={pending || step === 0} onClick={() => setStep((n) => n - 1)} className="rounded-lg border border-[var(--border-default)] px-4 py-3 disabled:opacity-40">Back</button><button disabled={pending} className="rounded-lg border border-[var(--border-teal)] bg-[var(--accent-primary)] text-[var(--text-inverse)] px-5 py-3 font-bold disabled:opacity-50">{pending ? "Saving…" : step < 3 ? "Continue" : draft?.state === "PUBLISHED" ? "Save published event changes" : "Publish to Discord Events"}</button>{step >= 2 && (!draft || draft.state === "DRAFT") && <button type="button" disabled={pending} onClick={() => void save(false)} className="rounded-lg border border-[var(--border-default)] px-4 py-3">Save draft</button>}</div>
    </form>
  </section>;
}
