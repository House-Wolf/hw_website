"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import ImageUpload from "./ImageUpload";

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

interface SocialLink {
  id: string;
  platform: string;
  channelName: string;
  channelUrl: string;
  description?: string;
  status: string;
  createdAt: string;
  rejectionReason?: string;
}

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
  const [portraitUrl, setPortraitUrl] = useState("");

  // Social Links State
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    channelName: "",
    channelUrl: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const subdivisionOptions = useMemo(() => {
    const selected = allowedDivisions.find((d) => d.name === division);
    return selected?.allowedSubs ?? [];
  }, [allowedDivisions, division]);

  const fetchMyLinks = async () => {
    setIsLoadingLinks(true);
    try {
      const response = await fetch("/api/social-links?status=all");
      if (response.ok) {
        const data = await response.json();
        setLinks(data);
      }
    } catch (error) {
      console.error("Error fetching links:", error);
    } finally {
      setIsLoadingLinks(false);
    }
  };

  const handleOpenSocialModal = () => {
    setShowSocialModal(true);
    fetchMyLinks();
  };

  const handleSubmitLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/social-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform: "TWITCH",
          ...formData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit");
      }

      setShowAddModal(false);
      setFormData({ channelName: "", channelUrl: "", description: "" });
      await fetchMyLinks();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return;

    try {
      const response = await fetch(`/api/social-links/${linkId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchMyLinks();
      }
    } catch (error) {
      console.error("Error deleting link:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-[var(--accent-soft)]/15 border-[var(--accent-soft)] text-[var(--foreground)]";
      case "PENDING":
        return "bg-yellow-500/15 border-yellow-500 text-yellow-300";
      case "REJECTED":
        return "bg-[var(--accent-strong)]/15 border-[var(--accent-strong)] text-[var(--foreground)]";
      default:
        return "bg-[var(--background-secondary)]/60 border-[var(--border-soft)] text-[var(--foreground-muted)]";
    }
  };

  return (
    <>
      <form
        action={onSubmit}
        className="card space-y-6 border border-[var(--border-soft)] bg-[var(--background-secondary)]/80 !transform-none !shadow-md"
        style={{ transform: "none" }}
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

            {/* Preview in card format matching division page display */}
            {portraitUrl ? (
              <div className="max-w-xs mx-auto">
                <div className="relative w-full aspect-square mb-4 rounded-lg overflow-hidden border border-[var(--border-soft)] hover:border-[var(--hw-steel-teal)]/50 transition-colors">
                  {/* Portrait Image */}
                  <img
                    src={portraitUrl}
                    alt="Character Portrait Preview"
                    className="w-full h-full object-cover"
                  />

                  {/* Gradient Overlay - Always visible */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                  {/* Overlay Text - Always visible */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-sm text-[var(--hw-steel-teal)] font-semibold uppercase tracking-wider mb-1">
                      {subdivision || "Select Subdivision"}
                    </p>
                    <h3 className="text-xl font-bold text-white uppercase tracking-wide drop-shadow-lg">
                      {characterName || "Character Name"}
                    </h3>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => setPortraitUrl("")}
                    className="absolute top-2 right-2 p-2 rounded-full bg-red-500/90 hover:bg-red-600 text-white transition-colors z-20 cursor-pointer"
                    title="Remove portrait"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-center text-[var(--foreground-muted)] mb-3">
                  This is how your portrait will appear on the division page
                </p>
              </div>
            ) : (
              <ImageUpload
                value={portraitUrl}
                onChange={setPortraitUrl}
                onClear={() => setPortraitUrl("")}
              />
            )}

            <input type="hidden" name="portraitUrl" value={portraitUrl} />
            <p className="text-xs text-[var(--foreground-muted)] mt-1">
              Upload a character portrait or provide a URL. If not provided, your Discord avatar will be used.
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center gap-4">
          {/* Social Links Button */}
          <button
            type="button"
            onClick={handleOpenSocialModal}
            className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--accent-soft)] bg-[var(--background-elevated)] hover:bg-[var(--accent-soft)]/15 hover:border-[var(--accent-soft)] transition-colors text-[var(--foreground)] cursor-pointer"
          >
            Manage Twitch Channels
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            className="px-4 py-2 rounded-md font-semibold bg-[var(--accent-strong)] text-[var(--graphite-50)] border border-[var(--border)] hover:bg-[var(--maroon-500)] transition-colors cursor-pointer"
          >
            Submit for approval
          </button>
        </div>
      </form>

      {/* Social Links Modal */}
      {showSocialModal && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowSocialModal(false)}
          />
          <div className="relative w-full max-w-2xl bg-[var(--background-card)] border border-[var(--border-default)] rounded-xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">
                  Twitch Channel Management
                </h2>
                <p className="text-sm text-[var(--foreground-muted)]">
                  Submit your Twitch channel to be featured on the Wolf Network page.
                </p>
              </div>
              <button
                onClick={() => setShowSocialModal(false)}
                className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="w-full mb-4 px-4 py-2 rounded-md text-sm font-semibold border border-[var(--accent-soft)] bg-[var(--background-elevated)] hover:bg-[var(--accent-soft)]/15 hover:border-[var(--accent-soft)] transition-colors text-[var(--foreground)] cursor-pointer"
            >
              + Add Channel
            </button>

            {isLoadingLinks ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent-main)]"></div>
              </div>
            ) : links.length > 0 ? (
              <div className="space-y-3">
                {links.map((link) => (
  <div
    key={link.id}
    className="p-4 rounded-lg border border-[var(--border-soft)] bg-[var(--background-secondary)]/70"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="font-semibold text-[var(--foreground)]">
            {link.channelName}
          </h3>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
              link.status
            )}`}
          >
            {link.status}
          </span>
        </div>
        <a
          href={link.channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent-secondary)] hover:text-[var(--accent-secondary)]/80 text-sm flex items-center gap-1 mb-2"
        >
          {link.channelUrl}
          <ExternalLink size={14} />
        </a>
        
        {link.description && (
          <p className="text-sm text-[var(--foreground-muted)] mb-2">
            {link.description}
          </p>
        )}
                        {link.status === "REJECTED" && link.rejectionReason && (
                          <div className="mt-2 p-3 bg-[var(--accent-strong)]/10 border border-[var(--accent-strong)]/30 rounded text-sm text-[var(--foreground-muted)]">
                            <strong className="text-[var(--foreground)]">
                              Rejection reason:
                            </strong>{" "}
                            {link.rejectionReason}
                          </div>
                        )}
                        <p className="text-xs text-[var(--foreground-muted)] mt-2">
                          Submitted: {new Date(link.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold border border-[var(--border)] bg-[var(--background-elevated)] hover:bg-[var(--accent-strong)]/15 hover:border-[var(--accent-strong)] transition-colors text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-[var(--border-soft)] rounded-lg bg-[var(--background-secondary)]/70">
                <p className="text-[var(--foreground-muted)] mb-2">
                  No Twitch channels submitted yet
                </p>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Click "Add Channel" to submit your first channel for approval
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Channel Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[calc(var(--z-modal)+1)] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative w-full max-w-lg bg-[var(--background-card)] border border-[var(--border-default)] rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                Submit Twitch Channel
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitLink}>
              <div className="space-y-4 mb-6">
                <div>
                  <label
                    htmlFor="channelName"
                    className="block mb-2 text-sm font-semibold text-[var(--foreground-muted)] uppercase tracking-wider"
                  >
                    Channel Name
                  </label>
                  <input
                    type="text"
                    id="channelName"
                    className="w-full px-3 py-2 bg-[var(--background-elevated)] border border-[var(--border-default)] rounded-md text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent-main)] transition-colors"
                    placeholder="YourChannelName"
                    value={formData.channelName}
                    onChange={(e) =>
                      setFormData({ ...formData, channelName: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="channelUrl"
                    className="block mb-2 text-sm font-semibold text-[var(--foreground-muted)] uppercase tracking-wider"
                  >
                    Channel URL
                  </label>
                  <input
                    type="url"
                    id="channelUrl"
                    className="w-full px-3 py-2 bg-[var(--background-elevated)] border border-[var(--border-default)] rounded-md text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent-main)] transition-colors"
                    placeholder="https://twitch.tv/yourchannelname"
                    value={formData.channelUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, channelUrl: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block mb-2 text-sm font-semibold text-[var(--foreground-muted)] uppercase tracking-wider"
                  >
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    className="w-full px-3 py-2 bg-[var(--background-elevated)] border border-[var(--border-default)] rounded-md text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent-main)] transition-colors resize-none"
                    rows={3}
                    placeholder="Tell viewers what content you create..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-[var(--accent-strong)]/20 border border-[var(--accent-strong)] rounded text-sm text-[var(--foreground)]">
                  {error}
                </div>
              )}

              <div className="bg-[var(--background-elevated)]/50 border border-[var(--border-subtle)] rounded-lg p-3 mb-6">
                <p className="text-xs text-[var(--foreground-muted)]">
                  <strong className="text-[var(--foreground)]">Note:</strong>{" "}
                  Your submission will be reviewed by a Captain or higher rank
                  before appearing on the Wolf Network page.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 rounded-md text-sm font-semibold border border-[var(--accent-soft)] bg-[var(--accent-soft)]/15 hover:bg-[var(--accent-soft)]/25 transition-colors text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--border)] bg-[var(--background-elevated)] hover:bg-[var(--background-soft)] transition-colors text-[var(--foreground-muted)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}