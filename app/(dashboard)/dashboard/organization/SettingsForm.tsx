"use client";
import { useEffect, useState } from "react";

type Settings = { schemaVersion: number; revision: number; channels: { events: string; reminders: string; aar: string; voice: string }; skillWeight: number; preferenceWeight: number };

export default function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/command/settings", { signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Settings could not be loaded.");
      setSettings(data.settings);
    }).catch((error) => { if (!controller.signal.aborted) { setMessage(error.message); setFailed(true); } });
    return () => controller.abort();
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings || pending) return;
    setPending(true); setMessage(""); setFailed(false);
    try {
      const response = await fetch("/api/command/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Settings could not be saved.");
      setSettings(data.settings); setMessage(`Settings saved. Discord delivery flag is ${data.deliveryEnabled ? "enabled; worker delivery is confirmed per operation" : "disabled"}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Settings could not be saved. Please retry."); setFailed(true); }
    finally { setPending(false); }
  }

  if (!settings) return <p role={failed ? "alert" : "status"}>{message || "Verifying current officer access and loading settings…"}</p>;
  return <form onSubmit={save} className="max-w-3xl space-y-6">
    <p className="rounded-xl border border-white/15 p-4 text-sm">Saving configuration does not publish. Native Discord Events need no text-channel ID. The events text destination below enables an optional additional announcement. Reminders, AAR and default voice settings are reserved for later dashboard phases.</p>
    <fieldset disabled={pending} className="space-y-5">
      <legend className="mb-4 text-xl font-semibold">Discord destinations</legend>
      {(Object.keys(settings.channels) as (keyof Settings["channels"])[]).map((key) => <label key={key} className="block space-y-2">
        <span className="capitalize">{key === "events" ? "Optional announcement text" : key === "aar" ? "After-action reports" : key === "voice" ? "Operation voice hosting" : key} channel ID</span>
        <input className="input w-full" inputMode="numeric" maxLength={20} pattern="[0-9]{17,20}|" value={settings.channels[key]} onChange={(event) => setSettings({ ...settings, channels: { ...settings.channels, [key]: event.target.value } })} />
        <span className="block text-xs text-foreground-muted">Leave blank until confirmed. Nonempty IDs are checked against the configured guild before saving.</span>
      </label>)}
      <label className="block space-y-2"><span>Smart Assign skill weight: {settings.skillWeight}%</span><input className="block w-full" type="range" min={0} max={100} value={settings.skillWeight} onChange={(event) => { const skillWeight = Number(event.target.value); setSettings({ ...settings, skillWeight, preferenceWeight: 100 - skillWeight }); }} /><span className="block text-sm text-foreground-muted">Preference weight: {settings.preferenceWeight}%. This configures future previews; saving does not assign members.</span></label>
      <button className="btn btn-primary" type="submit">{pending ? "Verifying and saving…" : "Save command settings"}</button>
    </fieldset>
    {message && <p role={failed ? "alert" : "status"} className="rounded-lg border border-white/15 p-4">{message}</p>}
  </form>;
}
