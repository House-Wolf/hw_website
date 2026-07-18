'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Hammer, ChevronLeft, Loader2 } from "lucide-react";

const SUPPLY_MODES = [
  { value: "REQUESTER_WILL_SUPPLY", label: "I will supply the materials" },
  { value: "CRAFTER_MUST_SUPPLY",   label: "Crafter must supply materials" },
  { value: "NEGOTIABLE",            label: "Negotiable" },
];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

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

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>{label}</label>
      {children}
      {hint && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  );
}

export default function NewCraftingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [blueprints, setBlueprints] = useState<{ id: number; name: string; category?: string }[]>([]);

  const [form, setForm] = useState({
    blueprintId: "",
    itemName: "",
    quantityRequested: 1,
    minimumQuality: 1,
    materialSupplyMode: "NEGOTIABLE",
    priority: "MEDIUM",
    rewardOffered: "",
    deliveryLocation: "",
    requiredBy: "",
    notes: "",
    maxClaims: 1,
  });

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch("/api/packtracker/blueprints")
      .then((r) => r.json())
      .then((data) => setBlueprints(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Auto-fill itemName from blueprint selection
  function onBlueprintChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const bp = blueprints.find((b) => b.id === Number(e.target.value));
    set("blueprintId", e.target.value);
    if (bp && !form.itemName) set("itemName", bp.name);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.blueprintId) { setError("Select a blueprint"); return; }
    if (!form.itemName.trim()) { setError("Item name is required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/packtracker/crafting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          blueprintId: Number(form.blueprintId),
          quantityRequested: Number(form.quantityRequested),
          minimumQuality: Number(form.minimumQuality),
          maxClaims: Number(form.maxClaims),
          requiredBy: form.requiredBy || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create request");
        return;
      }
      const created = await res.json();
      router.push(`/pack-tracker/crafting/${created.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/pack-tracker/crafting" className="flex items-center gap-1 text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
        <ChevronLeft size={14} /> Crafting Queue
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center border"
          style={{ background: "rgba(71,0,0,0.15)", borderColor: "var(--border-crimson)" }}>
          <Hammer size={20} style={{ color: "var(--accent-primary)" }} />
        </div>
        <h1 className="text-xl font-bold uppercase tracking-widest" style={{ color: "var(--accent-primary)" }}>
          New Crafting Request
        </h1>
      </div>

      <form onSubmit={submit} className="space-y-5 rounded-xl border p-6"
        style={{ background: "var(--background-card)", borderColor: "var(--border-default)" }}>

        <Field label="Blueprint *">
          <select style={inputStyle} value={form.blueprintId} onChange={onBlueprintChange}>
            <option value="">— Select blueprint —</option>
            {blueprints.map((b) => (
              <option key={b.id} value={b.id}>{b.name}{b.category ? ` (${b.category})` : ""}</option>
            ))}
          </select>
        </Field>

        <Field label="Item Name *" hint="What item should be crafted?">
          <input style={inputStyle} value={form.itemName} onChange={(e) => set("itemName", e.target.value)}
            placeholder="Item name" maxLength={200} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantity">
            <input style={inputStyle} type="number" min={1} value={form.quantityRequested}
              onChange={(e) => set("quantityRequested", e.target.value)} />
          </Field>
          <Field label="Minimum Quality %" hint="1–100">
            <input style={inputStyle} type="number" min={1} max={100} value={form.minimumQuality}
              onChange={(e) => set("minimumQuality", e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Priority">
            <select style={inputStyle} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Material Supply">
            <select style={inputStyle} value={form.materialSupplyMode} onChange={(e) => set("materialSupplyMode", e.target.value)}>
              {SUPPLY_MODES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Delivery Location">
            <input style={inputStyle} value={form.deliveryLocation} onChange={(e) => set("deliveryLocation", e.target.value)}
              placeholder="e.g. Lorville, Area18" />
          </Field>
          <Field label="Reward Offered">
            <input style={inputStyle} value={form.rewardOffered} onChange={(e) => set("rewardOffered", e.target.value)}
              placeholder="e.g. 50,000 aUEC" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Required By">
            <input style={inputStyle} type="datetime-local" value={form.requiredBy}
              onChange={(e) => set("requiredBy", e.target.value)} />
          </Field>
          <Field label="Max Crafters">
            <input style={inputStyle} type="number" min={1} max={10} value={form.maxClaims}
              onChange={(e) => set("maxClaims", e.target.value)} />
          </Field>
        </div>

        <Field label="Notes">
          <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
            value={form.notes} onChange={(e) => set("notes", e.target.value)}
            placeholder="Any additional notes for the crafter" />
        </Field>

        {error && <p className="text-sm" style={{ color: "#FF6B6B" }}>{error}</p>}

        <div className="flex gap-3 justify-end">
          <Link href="/pack-tracker/crafting"
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
