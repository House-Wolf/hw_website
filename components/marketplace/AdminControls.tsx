"use client";

import { Trash2, Pencil } from "lucide-react";
import { useState } from "react";

interface AdminControlsProps {
  item: any;
  onEdit: (item: any) => void;
  onDelete: (id: string) => Promise<void>;
}

export default function AdminControls({ item, onEdit, onDelete }: AdminControlsProps) {
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async () => {
    setConfirming(false);
    await onDelete(item.id);
  };

  return (
    <div className="mt-3 flex gap-2">
      {/* DELETE BUTTON */}
      <button
        onClick={() => setConfirming(true)}
        className="flex-1 py-2 bg-crimson-dark/70 border border-crimson-light/40 text-crimson-light text-xs font-semibold rounded-md hover:bg-crimson-dark/90 hover:border-crimson-light transition cursor-pointer"
      >
        <Trash2 size={14} className="inline-block mr-1" />
        Delete
      </button>

      {/* EDIT BUTTON */}
      <button
        onClick={() => onEdit(item)}
        className="flex-1 py-2 bg-steel-dark/60 border border-steel-light/30 text-steel-light text-xs font-semibold rounded-md hover:bg-steel-dark/80 hover:border-steel-light transition cursor-pointer"
      >
        <Pencil size={14} className="inline-block mr-1" />
        Edit
      </button>

      {/* CONFIRM DELETE POPUP */}
      {confirming && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-night-deep p-6 rounded-xl border border-crimson-light/40 max-w-sm text-center shadow-[0_0_20px_rgba(255,0,0,0.3)]">
            <h3 className="text-lg font-bold text-crimson-light">
              Confirm Delete
            </h3>
            <p className="text-foreground-muted text-sm mt-2 mb-5">
              Are you sure you want to delete <span className="text-foreground">{item.title}</span>?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 py-2 rounded-md bg-steel-dark/40 text-foreground hover:bg-steel-dark/60 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 rounded-md bg-crimson-dark/80 text-crimson-light border border-crimson-light/40 hover:bg-crimson-dark transition cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
