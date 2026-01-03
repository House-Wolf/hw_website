"use client";

import { useState } from "react";
import { getGameplayLoopOptions } from "@/lib/lore/client/gameplayOptions";

export default function LoreSmithAssistant({
  characterName,
  discordRole,
  division,
  subdivision,
  onApply,
}: {
  
  
  
  
  
  
  
  characterName: string;
  discordRole: string;
  division: string;
  subdivision?: string;
  onApply: (bio: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [primaryRole, setPrimaryRole] = useState("");
  const [tone, setTone] = useState("Balanced");
  const [personalHook, setPersonalHook] = useState("");
  const [experience, setExperience] = useState("");

  const gameplayOptions = getGameplayLoopOptions();

  const generateBio = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/lore/bio-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterName,
          discordRole,
          division,
          subdivision,
          primaryRole,
          tone,
          experience,
          personalHook,
        }),
      });

      if(!characterName.trim() || !division.trim() || !subdivision?.trim()) {
        alert("Character name, division, and subdivision are required, before generating a bio.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Failed: ${res.status}`);
      }

      const data = await res.json();
      setResult(data.bio);
    } catch (err) {
      console.error("LoreSmith error:", err);
      alert(`Failed to generate bio: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     RESULT VIEW
     ======================= */
  if (result) {
    return (
      <div className="space-y-4">
        <label className="block text-sm font-semibold text-[var(--foreground)]">
          Generated Bio Preview
        </label>

        <textarea
          className="
            w-full
            h-56
            rounded-md
            bg-[var(--background-elevated)]
            border
            border-[var(--border-soft)]
            px-3
            py-2
            text-sm
            text-[var(--foreground)]
            focus:outline-none
            focus:ring-2
            focus:ring-[var(--accent-main)]
          "
          value={result}
          readOnly
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onApply(result.slice(0, 700))}
            className="
              inline-flex
              items-center
              px-4
              py-2
              rounded-md
              text-sm
              font-semibold
              bg-[var(--accent-strong)]
              text-[var(--graphite-50)]
              border
              border-[var(--border)]
              hover:bg-[var(--maroon-500)]
              transition-colors
            "
          >
            Use This Bio
          </button>

          <button
            type="button"
            onClick={() => setResult(null)}
            className="
              inline-flex
              items-center
              px-4
              py-2
              rounded-md
              text-sm
              font-semibold
              border
              border-[var(--border-soft)]
              bg-[var(--background-elevated)]
              text-[var(--foreground-muted)]
              hover:bg-[var(--background-soft)]
              transition-colors
            "
          >
            Regenerate
          </button>
        </div>
      </div>
    );
  }

  /* =======================
     INPUT VIEW (INLINE FORM)
     ======================= */
  return (
    <div className="space-y-4">
      {/* Primary Role */}
      <div>
        <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
          Operational Focus
        </label>
        <select
          value={primaryRole}
          onChange={(e) => setPrimaryRole(e.target.value)}
          className="
            w-full
            rounded-md
            bg-[var(--background-elevated)]
            border
            border-[var(--border-soft)]
            px-3
            py-2
            text-sm
            text-[var(--foreground)]
            focus:outline-none
            focus:ring-2
            focus:ring-[var(--accent-main)]
          "
        >
          <option value="">Select Primary Role</option>
          {gameplayOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tone */}
      <div>
        <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
          Narrative Tone
        </label>
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="
            w-full
            rounded-md
            bg-[var(--background-elevated)]
            border
            border-[var(--border-soft)]
            px-3
            py-2
            text-sm
            text-[var(--foreground)]
            focus:outline-none
            focus:ring-2
            focus:ring-[var(--accent-main)]
          "
        >
          <option value="Balanced">Balanced</option>
          <option value="Operational">Operational</option>
          <option value="Narrative">Narrative</option>
        </select>
      </div>

      {/* Personal Hook */}
      <div>
        <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
          Optional Personal Detail
        </label>
        <input
          type="text"
          value={personalHook}
          onChange={(e) => setPersonalHook(e.target.value)}
          placeholder="Background, specialty, or defining trait"
          className="
            w-full
            rounded-md
            bg-[var(--background-elevated)]
            border
            border-[var(--border-soft)]
            px-3
            py-2
            text-sm
            text-[var(--foreground)]
            focus:outline-none
            focus:ring-2
            focus:ring-[var(--accent-main)]
          "
        />
      </div>

      {/* Action */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={loading || !primaryRole || !division || !subdivision || !characterName}
          onClick={generateBio}
          className="
            inline-flex
            items-center
            px-4
            py-2
            rounded-md
            text-sm
            font-semibold
            bg-[var(--accent-strong)]
            text-[var(--graphite-50)]
            border
            border-[var(--border)]
            hover:bg-[var(--maroon-500)]
            transition-colors
            disabled:opacity-50
          "
        >
          {loading ? "Forging dossier…" : "Generate Bio Draft"}
        </button>
      </div>
    </div>
  );
}
