"use client";

import { useState } from "react";
import { Edit2, Trash2 } from "lucide-react";
import EditDossierModal, { Dossier as BaseDossier } from "./EditDossierModal";

type User = {
  discordUsername: string | null; // ⬅️ can be null from DB
};

type Division = {
  id: number;
  name: string;
};

type Subdivision = {
  id: number;
  name: string;
  divisionId: number;
};

// ⬇️ Extend the base dossier with view-only / joined fields
type Dossier = BaseDossier & {
  division?: { name: string } | null;
  subdivision?: { name: string } | null;
  user?: User;
  displayName?: string | null;
  divisionName?: string | null;
  subdivisionName?: string | null;
  discordUsername?: string | null;
};

type ApprovedDossiersSectionProps = {
  dossiers: Dossier[];
  divisions: Division[];
  subdivisions: Subdivision[];
  onEdit: (formData: FormData) => void;
  onDelete: (formData: FormData) => void;
  onUnapprove: (formData: FormData) => void;
};

export default function ApprovedDossiersSection({
  dossiers,
  divisions,
  subdivisions,
  onEdit,
  onDelete,
  onUnapprove,
}: ApprovedDossiersSectionProps) {
  const [editingDossier, setEditingDossier] = useState<Dossier | null>(null);
  const [deletingDossierId, setDeletingDossierId] = useState<string | null>(
    null
  );

  const handleDelete = (dossierId: string) => {
    if (deletingDossierId === dossierId) {
      const formData = new FormData();
      formData.append("dossierId", dossierId);
      onDelete(formData);
    } else {
      setDeletingDossierId(dossierId);
      setTimeout(() => setDeletingDossierId(null), 3000);
    }
  };

  return (
    <>
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {dossiers.length === 0 ? (
          <p className="text-sm text-[var(--foreground-muted)]">
            No approved dossiers yet.
          </p>
        ) : (
          dossiers.map((dossier) => (
            <div
              key={dossier.id}
              className="p-3 rounded-lg border border-[var(--border-soft)] bg-[var(--background-elevated)]/70"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">
                    {dossier.characterName}
                  </p>
                  <p className="text-xs text-[var(--foreground-muted)]">
                    @{dossier.user?.discordUsername ?? dossier.discordUsername ?? ""}
                  </p>
                </div>
                <span className="text-xs text-[var(--foreground-muted)]">
                  {dossier.division?.name}
                  {dossier.subdivision ? ` • ${dossier.subdivision.name}` : ""}
                </span>
              </div>
              <p className="text-sm text-[var(--foreground)] mt-2 max-h-24 overflow-hidden">
                {dossier.bio}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => setEditingDossier(dossier)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[var(--accent-main)] bg-[var(--background-elevated)] hover:bg-[var(--accent-main)]/15 hover:border-[var(--accent-main)] transition-colors text-[var(--foreground)] flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(dossier.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors flex items-center gap-1 cursor-pointer ${
                    deletingDossierId === dossier.id
                      ? "border-red-500 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      : "border-[var(--border)] bg-[var(--background-elevated)] hover:bg-[var(--accent-strong)]/15 hover:border-[var(--accent-strong)] text-[var(--foreground)]"
                  }`}
                >
                  <Trash2 size={14} />
                  {deletingDossierId === dossier.id ? "Confirm Delete?" : "Delete"}
                </button>
                <form action={onUnapprove} className="ml-auto">
                  <input type="hidden" name="dossierId" value={dossier.id} />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[var(--accent-soft)] bg-[var(--background-elevated)] hover:bg-[var(--accent-strong)]/10 hover:border-[var(--accent-strong)] transition-colors text-[var(--foreground)] cursor-pointer"
                  >
                    Unapprove
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>

     {editingDossier && (
        <EditDossierModal
          dossier={editingDossier}
          divisions={divisions}
          subdivisions={subdivisions}
          onClose={() => setEditingDossier(null)}
          onSubmit={onEdit}
        />
      )}
    </>
  );
}
