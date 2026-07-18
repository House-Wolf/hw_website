'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HelpCircle, ChevronLeft, Loader2 } from "lucide-react";

const KINDS = [
  { value: "MINING_MATERIALS",  label: "Mining Materials" },
  { value: "TRADING_GOODS",     label: "Trading Goods" },
  { value: "SHIP_COMPONENTS",   label: "Ship Components" },
  { value: "MISSION_BACKUP",    label: "Mission Backup" },
  { value: "CARGO_ESCORT",      label: "Cargo Escort" },
  { value: "COMBAT_SUPPORT",    label: "Combat Support" },
  { value: "SHIP_CREW",         label: "Ship Crew" },
  { value: "TRANSPORTATION",    label: "Transportation" },
  { value: "LOCATION_SCOUT",    label: "Location Scout" },
  { value: "GUIDANCE",          label: "Guidance / Coaching" },
  { value: "EVENT_SUPPORT",     label: "Event Support" },
  { value: "OTHER",             label: "Other" },
];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{label}</label>
      {children}
      {hint && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  );
}

const inputStyle = {
  background: "var(--background-elevated)",
  border: "1px solid var(--border-default)",
  color: "var(--text-primary)",
  borderRadius: "0.5rem",
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
} as React.CSSProperties;

export default function NewAssistancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    kind: "OTHER",
    priority: "MEDIUM",
    description: "",
    playerHandle: "",
    timezone: "",
    availability: "",
    assetsShips: "",
    rewardOffered: "",
    maxClaims: 1,
    dueAt: "",
    hasMicrophone: false,
    groupPreference: "",
    urgency: "",
    meetingLocation: "",
    materialName: "",
    quantityNeeded: "",
  });

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) { setError("Title is required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/packtracker/assistance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          maxClaims: Number(form.maxClaims),
          quantityNeeded: form.quantityNeeded ? Number(form.quantityNeeded) : undefined,
          dueAt: form.dueAt || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create request");
        return;
      }
      const created = await res.json();
      router.push(`/pack-tracker/assistance/${created.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/pack-tracker/assistance" className="text-sm hover:underline flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <ChevronLeft size={14} /> Assistance Hub
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center border"
          style={{ background: "rgba(71,0,0,0.15)", borderColor: "var(--border-crimson)" }}>
          <HelpCircle size={20} style={{ color: "var(--accent-primary)" }} />
        </div>
        <h1 className="text-xl font-bold uppercase tracking-widest" style={{ color: "var(--accent-primary)" }}>
          New Assistance Request
        </h1>
      </div>

      <form onSubmit={submit} className="space-y-5 rounded-xl border p-6"
        style={{ background: "var(--background-card)", borderColor: "var(--border-default)" }}>

        <Field label="Title *">
          <input style={inputStyle} value={form.title} onChange={(e) => set("title", e.target.value)}
            placeholder="Brief description of what you need" maxLength={200} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Assistance Type *">
            <select style={inputStyle} value={form.kind} onChange={(e) => set("kind", e.target.value)}>
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select style={inputStyle} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Description" hint="Provide detailed context, goals, constraints">
          <textarea style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }}
            value={form.description} onChange={(e) => set("description", e.target.value)}
            placeholder="What exactly do you need help with?" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Your RSI Handle">
            <input style={inputStyle} value={form.playerHandle} onChange={(e) => set("playerHandle", e.target.value)}
              placeholder="RSI handle" />
          </Field>
          <Field label="Timezone">
            <input style={inputStyle} value={form.timezone} onChange={(e) => set("timezone", e.target.value)}
              placeholder="e.g. UTC-5 / EST" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Availability">
            <input style={inputStyle} value={form.availability} onChange={(e) => set("availability", e.target.value)}
              placeholder="When are you available?" />
          </Field>
          <Field label="Ships / Assets">
            <input style={inputStyle} value={form.assetsShips} onChange={(e) => set("assetsShips", e.target.value)}
              placeholder="Ships or resources you have" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Meeting Location">
            <input style={inputStyle} value={form.meetingLocation} onChange={(e) => set("meetingLocation", e.target.value)}
              placeholder="e.g. Area18, Lorville" />
          </Field>
          <Field label="Reward Offered">
            <input style={inputStyle} value={form.rewardOffered} onChange={(e) => set("rewardOffered", e.target.value)}
              placeholder="e.g. 50,000 aUEC" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Max Helpers" hint="How many people can accept this?">
            <input style={inputStyle} type="number" min={1} max={20} value={form.maxClaims}
              onChange={(e) => set("maxClaims", e.target.value)} />
          </Field>
          <Field label="Due Date (optional)">
            <input style={inputStyle} type="datetime-local" value={form.dueAt}
              onChange={(e) => set("dueAt", e.target.value)} />
          </Field>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="mic" checked={form.hasMicrophone}
            onChange={(e) => set("hasMicrophone", e.target.checked)} className="w-4 h-4" />
          <label htmlFor="mic" className="text-sm" style={{ color: "var(--text-secondary)" }}>
            I have a microphone
          </label>
        </div>

        {error && <p className="text-sm" style={{ color: "#FF6B6B" }}>{error}</p>}

        <div className="flex gap-3 justify-end">
          <Link href="/pack-tracker/assistance"
            className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all"
            style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}>
            Cancel
          </Link>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold uppercase tracking-wider disabled:opacity-50 transition-all hover:brightness-110"
            style={{ background: "var(--accent-primary)", color: "var(--text-primary)" }}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            Post Request
          </button>
        </div>
      </form>
    </div>
  );
}
