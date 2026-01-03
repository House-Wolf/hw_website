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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/profiles/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");

    const data = await res.json();

    if (!data?.url || !data.url.startsWith("/uploads/profiles/")) {
      throw new Error("Invalid upload response");
    }

    onChange(data.url);
  }, [onChange]);

  return (
    <div>
      {value ? (
        <div>
          <Image src={value} alt="Preview" width={300} height={300} />
          <button type="button" onClick={onClear}>Remove</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {error && <p>{error}</p>}
    </div>
  );
}
