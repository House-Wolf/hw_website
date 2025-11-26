"use client";

import { useMemo, useState } from "react";

type DivisionOption = {
  name: string;
  allowedSubs: string[];
};

type ExistingProfile = {
  characterName: string;
  bio: string;
  divisionName?: string;
  subdivisionName?: string | null;
};

export default function MercenaryBioForm({
  allowedDivisions,
  onSubmit,
  existingProfile,
}: {
  allowedDivisions: DivisionOption[];
  onSubmit: (formData: FormData) => void;
  existingProfile: ExistingProfile | null;
}) {
  const [division, setDivision] = useState<string>(
    existingProfile?.divisionName || allowedDivisions[0]?.name || ""
  );
  const [subdivision, setSubdivision] = useState<string>(
    existingProfile?.subdivisionName || ""
  );
  const [bio, setBio] = useState(existingProfile?.bio || "");
  const [characterName, setCharacterName] = useState(
    existingProfile?.characterName || ""
  );

  const subdivisionOptions = useMemo(() => {
    const selected = allowedDivisions.find((d) => d.name === division);
    return selected?.allowedSubs ?? [];
  }, [allowedDivisions, division]);

  return (
    <form
      action={onSubmit}
      className="card space-y-6 border border-[var(--border-soft)] bg-[var(--background-secondary)]/80"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
            Character Name
          </label>
          <input
            name="characterName"
            required
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            className="w-full rounded-md bg-[var(--background-elevated)] border border-[var(--border-soft)] px-3 py-2 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)]"
            placeholder="Enter your in-game character name"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
              Division
            </label>
            <select
              name="division"
              required
              value={division}
              onChange={(e) => {
                setDivision(e.target.value);
                setSubdivision("");
              }}
              className="w-full rounded-md bg-[var(--background-elevated)] border border-[var(--border-soft)] px-3 py-2 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)]"
            >
              {allowedDivisions.map((div) => (
                <option key={div.name} value={div.name}>
                  {div.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
              Subdivision
            </label>
            <select
              name="subdivision"
              required
              value={subdivision}
              onChange={(e) => setSubdivision(e.target.value)}
              className="w-full rounded-md bg-[var(--background-elevated)] border border-[var(--border-soft)] px-3 py-2 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)]"
            >
              <option value="" disabled>
                Select subdivision
              </option>
              {subdivisionOptions.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
            Bio (700 characters max)
          </label>
          <textarea
            name="bio"
            required
            maxLength={700}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={6}
            className="w-full rounded-md bg-[var(--background-elevated)] border border-[var(--border-soft)] px-3 py-2 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)]"
            placeholder="Share your story, role, and accomplishments."
          />
          <div className="text-xs text-[var(--foreground-muted)] mt-1 text-right">
            {bio.length}/700
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
            Character Portrait
          </label>
          <input
            type="file"
            name="portrait"
            accept="image/*"
            className="w-full text-sm text-[var(--foreground-muted)]"
            disabled
            title="Portrait uploads will be enabled soon."
          />
          <p className="text-xs text-[var(--foreground-muted)] mt-1">
            Uploads are coming soon. For now, your Discord avatar will be used.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 rounded-md font-semibold bg-[var(--accent-strong)] text-[var(--graphite-50)] border border-[var(--border)] hover:bg-[var(--maroon-500)] transition-colors"
        >
          Submit for approval
        </button>
      </div>
    </form>
  );
}
