"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";

export default function ImageUpload({
  value,
  onChange,
  onClear,
}: {
  value?: string;
  onChange: (url: string) => void;
  onClear: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      try {
        setError(null);
        setUploading(true);

        const formData = new FormData();
        formData.append("file", file);

        // ✅ CORRECT API ROUTE
        const res = await fetch("/api/upload/image", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error("Upload failed");
        }

        const data = await res.json();

        // ✅ Accept full Cloudflare R2 URLs
        if (!data?.url || !data.url.startsWith("http")) {
          throw new Error("Invalid upload response");
        }

        onChange(data.url);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Image upload failed"
        );
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  return (
    <div className="space-y-2">
      {value ? (
        <div className="space-y-2">
          <Image
            src={value}
            alt="Profile portrait"
            width={300}
            height={300}
            className="rounded-md object-cover"
          />
          <button
            type="button"
            onClick={onClear}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Remove image
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 rounded-md border border-white/10 hover:bg-white/5 text-sm"
        >
          {uploading ? "Uploading…" : "Upload portrait"}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
