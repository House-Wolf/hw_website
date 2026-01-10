"use client";

import { useState, useEffect } from "react";
import { Video, Save, Loader2, ExternalLink } from "lucide-react";

interface FeaturedVideo {
  youtubeId: string;
  title: string;
  thumbnail: string;
}

/**
 * @component FeaturedVideoSection
 * @description Admin component for managing the featured video on the homepage
 * @author House Wolf Dev Team
 */
export default function FeaturedVideoSection() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [currentVideo, setCurrentVideo] = useState<FeaturedVideo | null>(null);
  const [youtubeId, setYoutubeId] = useState("");
  const [title, setTitle] = useState("");
  const [thumbnail, setThumbnail] = useState("");

  // Fetch current featured video
  useEffect(() => {
    async function fetchFeaturedVideo() {
      try {
        const response = await fetch("/api/featured-video");
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setCurrentVideo(data);
            setYoutubeId(data.youtubeId);
            setTitle(data.title);
            setThumbnail(data.thumbnail);
          }
        }
      } catch (err) {
        console.error("Failed to fetch featured video:", err);
        setError("Failed to load current featured video");
      } finally {
        setIsLoading(false);
      }
    }

    fetchFeaturedVideo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/featured-video", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          youtubeId: youtubeId.trim(),
          title: title.trim(),
          thumbnail: thumbnail.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update featured video");
      }

      setCurrentVideo(data);
      setSuccess("Featured video updated successfully");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const extractYouTubeId = (url: string): string => {
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
      /youtube\.com\/embed\/([^&\s]+)/,
      /youtube\.com\/v\/([^&\s]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // If no pattern matches, assume it's already an ID
    return url;
  };

  const handleYouTubeUrlChange = (value: string) => {
    const extractedId = extractYouTubeId(value);
    setYoutubeId(extractedId);

    // Auto-generate thumbnail if not manually set
    if (!thumbnail || thumbnail === currentVideo?.thumbnail) {
      setThumbnail(`https://img.youtube.com/vi/${extractedId}/maxresdefault.jpg`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-[var(--accent-main)]" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-[var(--foreground-muted)]">
            Homepage Content
          </p>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Featured Video
          </h2>
          <p className="text-sm text-[var(--foreground-muted)]">
            Manage the featured video displayed on the homepage hero section.
          </p>
        </div>
        <Video className="text-[var(--accent-main)]" size={20} />
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-500 text-sm">
          {success}
        </div>
      )}

      {/* Current Video Preview */}
      {currentVideo && (
        <div className="border border-[var(--border-soft)] rounded-lg p-4 bg-[var(--background-secondary)]/70">
          <p className="text-xs uppercase tracking-[0.08em] text-[var(--foreground-muted)] mb-3">
            Current Featured Video
          </p>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-48 h-32 relative rounded-lg overflow-hidden border border-[var(--border-soft)] bg-black">
              <img
                src={currentVideo.thumbnail}
                alt={currentVideo.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-[var(--foreground)]">
                {currentVideo.title}
              </h3>
              <p className="text-sm text-[var(--foreground-muted)] font-mono">
                ID: {currentVideo.youtubeId}
              </p>
              <a
                href={`https://www.youtube.com/watch?v=${currentVideo.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[var(--accent-main)] hover:text-[var(--accent-strong)] transition-colors"
              >
                View on YouTube
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Update Form */}
      <form onSubmit={handleSubmit} className="border border-[var(--border-soft)] rounded-lg p-4 bg-[var(--background-secondary)]/70 space-y-4">
        <p className="text-xs uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
          Update Featured Video
        </p>

        <div className="space-y-2">
          <label htmlFor="youtubeUrl" className="block text-sm font-semibold text-[var(--foreground)]">
            YouTube URL or Video ID
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            id="youtubeUrl"
            type="text"
            value={youtubeId}
            onChange={(e) => handleYouTubeUrlChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ or dQw4w9WgXcQ"
            className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)] focus:border-transparent"
            required
          />
          <p className="text-xs text-[var(--foreground-muted)]">
            Paste a YouTube URL or just the video ID
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-semibold text-[var(--foreground)]">
            Video Title
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="House Wolf - Latest Operations"
            className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)] focus:border-transparent"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="thumbnail" className="block text-sm font-semibold text-[var(--foreground)]">
            Thumbnail URL
            <span className="text-[var(--foreground-muted)] text-xs font-normal ml-2">
              (Optional - auto-generated from YouTube)
            </span>
          </label>
          <input
            id="thumbnail"
            type="text"
            value={thumbnail}
            onChange={(e) => setThumbnail(e.target.value)}
            placeholder="https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
            className="w-full px-3 py-2 rounded-md border border-[var(--border-soft)] bg-[var(--background-elevated)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)] focus:border-transparent"
          />
          <p className="text-xs text-[var(--foreground-muted)]">
            Leave empty to use default YouTube thumbnail
          </p>
        </div>

        {/* Preview */}
        {youtubeId && title && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
              Preview
            </p>
            <div className="flex flex-col md:flex-row gap-4 p-3 rounded-lg border border-[var(--border-soft)] bg-[var(--background-elevated)]/50">
              <div className="w-full md:w-48 h-32 relative rounded-lg overflow-hidden border border-[var(--border-soft)] bg-black">
                {thumbnail && (
                  <img
                    src={thumbnail}
                    alt={title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/images/video-thumb.jpg";
                    }}
                  />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-semibold text-[var(--foreground)]">
                  {title}
                </h3>
                <p className="text-sm text-[var(--foreground-muted)] font-mono">
                  ID: {youtubeId}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving || !youtubeId || !title}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold border border-[var(--accent-main)] bg-[var(--accent-main)] hover:bg-[var(--accent-strong)] transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Featured Video
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
