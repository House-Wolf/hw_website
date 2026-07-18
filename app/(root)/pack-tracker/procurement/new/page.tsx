'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, ChevronLeft, Loader2 } from "lucide-react";

const FORMS = [
  { value: "ANY",     label: "Any form" },
  { value: "REFINED", label: "Refined" },
  { value: "RAW",     label: "Raw ore" },
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

export default function NewProcurementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    materialName: "",
    quantityRequested: 1,
    minimumQuality: 1,
    preferredForm: "ANY",
    priority: "MEDIUM",
    deliveryLocation: "",
    rewardOffered: "",
    notes: "",
    maxClaims: 1,
  });

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.materialName.trim()) { setError("Material name is required"); return; }
    if (Number(form.quantityRequested) < 1) { setError("Quantity must be at least 1"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/packtracker/procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantityRequested: Number(form.quantityRequested),
          minimumQuality: Number(form.minimumQuality),
          maxClaims: Number(form.maxClaims),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create request");
        return;
      }
      const created = await res.json();
      router.push(`/pack-tracker/procurement/${created.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/pack-tracker/procurement" className="flex items-center gap-1 text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
        <ChevronLeft size={14} /> Procurement Queue
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center border"
          style={{ background: "rgba(10,40,60,0.2)", borderColor: "rgba(17,78,98,0.5)" }}>
          <ShoppingCart size={20} style={{ color: "#60A5FA" }} />
        </div>
        <h1 className="text-xl font-bold uppercase tracking-widest" style={{ color: "#60A5FA" }}>
          New Procurement Request
        </h1>
      </div>

      <form onSubmit={submit} className="space-y-5 rounded-xl border p-6"
        style={{ background: "var(--background-card)", borderColor: "var(--border-default)" }}>

        <Field label="Material Name *" hint="What material do you need sourced?">
          <input style={inputStyle} value={form.materialName} onChange={(e) => set("materialName", e.target.value)}
            placeholder="e.g. Agricium, Laranite, Titanium" maxLength={200} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantity (SCU) *">
            <input style={inputStyle} type="number" min={1} value={form.quantityRequested}
              onChange={(e) => set("quantityRequested", e.target.value)} />
          </Field>
          <Field label="Preferred Form">
            <select style={inputStyle} value={form.preferredForm} onChange={(e) => set("preferredForm", e.target.value)}>
              {FORMS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Priority">
            <select style={inputStyle} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Min Quality %">
            <input style={inputStyle} type="number" min={1} max={100} value={form.minimumQuality}
              onChange={(e) => set("minimumQuality", e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Delivery Location">
            <input style={inputStyle} value={form.deliveryLocation} onChange={(e) => set("deliveryLocation", e.target.value)}
              placeholder="e.g. Lorville, Baijini Point" />
          </Field>
          <Field label="Reward Offered">
            <input style={inputStyle} value={form.rewardOffered} onChange={(e) => set("rewardOffered", e.target.value)}
              placeholder="e.g. 75,000 aUEC" />
          </Field>
        </div>

        <Field label="Max Suppliers">
          <input style={inputStyle} type="number" min={1} max={20} value={form.maxClaims}
            onChange={(e) => set("maxClaims", e.target.value)} />
        </Field>

        <Field label="Notes">
          <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
            value={form.notes} onChange={(e) => set("notes", e.target.value)}
            placeholder="Any additional information for the supplier" />
        </Field>

        {error && <p className="text-sm" style={{ color: "#FF6B6B" }}>{error}</p>}

        <div className="flex gap-3 justify-end">
          <Link href="/pack-tracker/procurement"
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
