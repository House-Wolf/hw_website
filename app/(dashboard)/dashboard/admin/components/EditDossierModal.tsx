"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

type Division = {
  id: number;
  name: string;
};

type Subdivision = {
  id: number;
  name: string;
  divisionId: number;
};

type Dossier = {
  id: string;
  characterName: string;
  bio: string;
  divisionId: number;
  subdivisionId: number | null;
};

type EditDossierModalProps = {
  dossier: Dossier;
  divisions: Division[];
  subdivisions: Subdivision[];
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
};

export default function EditDossierModal({
  dossier,
  divisions,
  subdivisions,
  onClose,
  onSubmit,
}: EditDossierModalProps) {
  const [characterName, setCharacterName] = useState(dossier.characterName);
  const [bio, setBio] = useState(dossier.bio);
  const [divisionId, setDivisionId] = useState(dossier.divisionId.toString());
  const [subdivisionId, setSubdivisionId] = useState(
    dossier.subdivisionId?.toString() || ""
  );

  // Filter subdivisions by selected division
  const filteredSubdivisions = subdivisions.filter(
    (sub) => sub.divisionId.toString() === divisionId
  );

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit(formData);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[var(--background-elevated)] border border-[var(--border-soft)] rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[var(--background-elevated)] border-b border-[var(--border-soft)] px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              Edit Dossier
            </h2>
            <p className="text-sm text-[var(--foreground-muted)]">
              Make changes to the mercenary profile
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-[var(--background-secondary)] transition-colors"
            aria-label="Close modal"
          >
            <X size={20} className="text-[var(--foreground-muted)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <input type="hidden" name="dossierId" value={dossier.id} />

          <div>
            <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
              Character Name
            </label>
            <input
              name="characterName"
              required
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              className="w-full rounded-md bg-[var(--background-secondary)] border border-[var(--border-soft)] px-3 py-2 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)]"
              placeholder="Enter character name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                Division
              </label>
              <select
                name="divisionId"
                required
                value={divisionId}
                onChange={(e) => {
                  setDivisionId(e.target.value);
                  setSubdivisionId("");
                }}
                className="w-full rounded-md bg-[var(--background-secondary)] border border-[var(--border-soft)] px-3 py-2 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)]"
              >
                <option value="">Select division</option>
                {divisions.map((div) => (
                  <option key={div.id} value={div.id}>
                    {div.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                Subdivision (Optional)
              </label>
              <select
                name="subdivisionId"
                value={subdivisionId}
                onChange={(e) => setSubdivisionId(e.target.value)}
                className="w-full rounded-md bg-[var(--background-secondary)] border border-[var(--border-soft)] px-3 py-2 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)]"
              >
                <option value="">None</option>
                {filteredSubdivisions.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
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
              rows={8}
              className="w-full rounded-md bg-[var(--background-secondary)] border border-[var(--border-soft)] px-3 py-2 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)]"
              placeholder="Enter bio"
            />
            <div className="text-xs text-[var(--foreground-muted)] mt-1 text-right">
              {bio.length}/700
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-soft)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md font-semibold border border-[var(--border)] bg-[var(--background-secondary)] hover:bg-[var(--background-elevated)] transition-colors text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md font-semibold bg-[var(--accent-strong)] text-[var(--graphite-50)] border border-[var(--border)] hover:bg-[var(--maroon-500)] transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
