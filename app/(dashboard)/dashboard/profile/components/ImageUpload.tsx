"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onClear: () => void;
}

export default function ImageUpload({ value, onChange, onClear }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/marketplace/upload', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type');

      if (!response.ok) {
        let errorMessage = 'Failed to upload image';

        if (contentType?.includes('application/json')) {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } else {
          const text = await response.text();
          console.error('Upload error response:', text);
          errorMessage = `Server error (${response.status}): ${text.substring(0, 100)}`;
        }

        throw new Error(errorMessage);
      }

      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        console.error('Unexpected response:', text);
        throw new Error('Unexpected server response');
      }

      const data = await response.json();
      onChange(data.url);
      setShowUrlInput(false);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      handleFile(imageFile);
    } else {
      setError('Please drop an image file');
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleUrlSubmit = useCallback(() => {
    if (urlInputValue.trim()) {
      onChange(urlInputValue.trim());
      setUrlInputValue("");
      setShowUrlInput(false);
      setError(null);
    }
  }, [urlInputValue, onChange]);

  const handleClear = useCallback(() => {
    onClear();
    setError(null);
    setUrlInputValue("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onClear]);

  return (
    <div className="space-y-3">
      {value ? (
        <div className="relative">
          <div className="rounded-lg overflow-hidden border border-[var(--border-soft)] bg-[var(--background-elevated)]">
            <img
              src={value}
              alt="Preview"
              className="w-full h-48 object-cover"
            />
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/90 hover:bg-red-600 text-white transition-colors cursor-pointer"
            title="Remove image"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative rounded-lg border-2 border-dashed transition-all ${
            isDragging
              ? 'border-[var(--accent-main)] bg-[var(--accent-soft)]/10'
              : 'border-[var(--border-soft)] bg-[var(--background-elevated)]'
          }`}
        >
          <div className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className={`p-4 rounded-full ${
                isDragging
                  ? 'bg-[var(--accent-soft)]/20'
                  : 'bg-[var(--background-secondary)]'
              }`}>
                {isUploading ? (
                  <div className="animate-spin">
                    <Upload size={32} className="text-[var(--accent-main)]" />
                  </div>
                ) : (
                  <ImageIcon size={32} className="text-[var(--foreground-muted)]" />
                )}
              </div>
            </div>

            {isUploading ? (
              <p className="text-sm text-[var(--foreground-muted)]">
                Uploading image...
              </p>
            ) : (
              <>
                <p className="text-sm font-semibold text-[var(--foreground)] mb-1">
                  Drop an image here or click to upload
                </p>
                <p className="text-xs text-[var(--foreground-muted)] mb-4">
                  PNG, JPG, GIF, or WebP up to 15MB
                </p>

                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--accent-soft)] bg-[var(--accent-soft)]/15 hover:bg-[var(--accent-soft)]/25 transition-colors text-[var(--foreground)] inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload size={16} />
                    Choose File
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--border-soft)] bg-[var(--background-secondary)]/60 hover:bg-[var(--background-secondary)] transition-colors text-[var(--foreground)] cursor-pointer"
                  >
                    Use URL Instead
                  </button>
                </div>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {showUrlInput && !value && (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInputValue}
            onChange={(e) => setUrlInputValue(e.target.value)}
            placeholder="https://example.com/image.png"
            className="flex-1 px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleUrlSubmit();
              }
            }}
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--accent-soft)] bg-[var(--accent-soft)]/15 hover:bg-[var(--accent-soft)]/25 transition-colors text-[var(--foreground)] cursor-pointer"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setShowUrlInput(false);
              setUrlInputValue("");
            }}
            className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--border-soft)] bg-[var(--background-secondary)]/60 hover:bg-[var(--background-secondary)] transition-colors text-[var(--foreground)] cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
