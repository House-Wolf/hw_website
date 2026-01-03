"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import ImageUpload from "./ImageUpload";
// import LoreSmithAssistant from "./LoreSmithAssistant";

type DivisionOption = {
  name: string;
  allowedSubs: string[];
  discordRole?: string;
};

type ExistingProfile = {
  characterName: string;
  bio: string;
  divisionName?: string;
  subdivisionName?: string | null;
  portraitUrl?: string | null;
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
  const [portraitUrl, setPortraitUrl] = useState(
    existingProfile?.portraitUrl || ""
  );

  // Social Links state
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [linkFormData, setLinkFormData] = useState({
    channelName: "",
    channelUrl: "",
    description: "",
  });
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);
  const [linkError, setLinkError] = useState("");

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
    setLinkError("");
    setIsSubmittingLink(true);

    try {
      const response = await fetch("/api/social-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform: "TWITCH",
          ...linkFormData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit");
      }

      setShowAddModal(false);
      setLinkFormData({ channelName: "", channelUrl: "", description: "" });
      await fetchMyLinks();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setLinkError(err.message);
      } else {
        setLinkError("An unknown error occurred.");
      }
    } finally {
      setIsSubmittingLink(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
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
      {/* MAIN FORM */}
      <form
        action={onSubmit}
        className="card border border-[var(--border-soft)] bg-[var(--background-secondary)]/85 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)] gap-6 lg:gap-8">
          {/* LEFT COLUMN – Core details */}
          <div className="space-y-6">
         
            {/* AI GENERATED BIO ASSISTANT DISABLED FOR NOW */}
           
            {/* <LoreSmithAssistant
              characterName={characterName}
              discordRole={
                allowedDivisions.find((d) => d.name === division)
                  ?.discordRole || ""
              }
              division={division}
              subdivision={subdivision}
              onApply={(generatedBio) => setBio(generatedBio)}
            /> */}

            
            {/* Character + division */}
            <section className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-1">
                  Character Name
                </label>
                <input
                  name="characterName"
                  required
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  className="w-full rounded-md bg-[var(--background-elevated)] border border-[var(--border-soft)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)]"
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
                    className="w-full rounded-md bg-[var(--background-elevated)] border border-[var(--border-soft)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)]"
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
                    className="w-full rounded-md bg-[var(--background-elevated)] border border-[var(--border-soft)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)]"
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
            </section>

            {/* Bio */}
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-sm font-semibold text-[var(--foreground)]">
                  Bio
                </label>
                <span className="text-[11px] text-[var(--foreground-muted)]">
                  {bio.length}/700 characters
                </span>
              </div>
              <textarea
                name="bio"
                required
                maxLength={700}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="
                  w-full rounded-md bg-[var(--background-elevated)]
                  border border-[var(--border-soft)]
                  px-3 py-2 text-sm text-[var(--foreground)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--accent-main)]
                  h-32 sm:h-40 md:h-48
                "
                placeholder="Share your story, role, and accomplishments."
              />

              <p className="text-xs text-[var(--foreground-muted)]">
                Focus on how you operate in-universe: specialties, role in House
                Wolf, and notable operations.
              </p>
            </section>

            {/* Actions (left-side) */}
            <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleOpenSocialModal}
                className="inline-flex justify-center items-center px-4 py-2 rounded-md text-sm font-semibold border border-[var(--accent-soft)] bg-[var(--background-elevated)] hover:bg-[var(--accent-soft)]/15 hover:border-[var(--accent-soft)] transition-colors text-[var(--foreground)] cursor-pointer"
              >
                Manage Twitch Channels
              </button>

              <button
                type="submit"
                className="inline-flex justify-center items-center px-4 py-2 rounded-md text-sm font-semibold bg-[var(--accent-strong)] text-[var(--graphite-50)] border border-[var(--border)] hover:bg-[var(--maroon-500)] transition-colors cursor-pointer"
              >
                Submit for approval
              </button>
            </section>
          </div>

          {/* RIGHT COLUMN – Portrait + live preview */}
          <div className="space-y-4 lg:space-y-5 lg:sticky lg:top-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--foreground)]">
                Character Portrait
              </label>
              <p className="text-xs text-[var(--foreground-muted)] mb-1">
                Upload a portrait or paste a URL. If you leave this blank, your
                Discord avatar will be used instead.
              </p>

              {/* When there is a portrait, show the full preview card. Otherwise show the upload box. */}
              {portraitUrl ? (
                <div className="max-w-sm mx-auto w-full">
                  <article className="w-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-1 mb-3">
                    <div className="rounded-xl bg-[#0b0e17] overflow-hidden flex flex-col">
                      {/* Image */}
                      <div className="relative h-64 w-full border-b border-white/5 bg-slate-900">
                        <Image
                          src={portraitUrl}
                          width={400}
                          height={400}
                          alt="Character Portrait Preview"
                          className="w-full h-full object-cover"
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e17] via-transparent to-transparent opacity-60 pointer-events-none" />

                        <div className="absolute bottom-3 left-3 right-3 z-10">
                          <p className="text-[10px] tracking-[0.3em] uppercase text-white/70 drop-shadow-lg line-clamp-1">
                            {subdivision || division || "Select Division"}
                          </p>
                          <h3 className="mt-1 text-xl font-semibold text-white drop-shadow-lg line-clamp-1">
                            {characterName || "Character Name"}
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() => setPortraitUrl("")}
                          className="absolute top-3 right-3 p-2 rounded-full bg-red-500/90 hover:bg-red-600 text-white transition-colors z-20 cursor-pointer shadow-lg"
                          title="Remove portrait"
                        >
                          <svg
                            className="w-4 h-4"
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

                      {/* Bio snippet */}
                      <div className="flex flex-col gap-2 p-3 text-white/80 text-sm">
                        <p className="whitespace-pre-line leading-snug text-white/90 line-clamp-5">
                          {bio || "Your bio preview will appear here..."}
                        </p>
                      </div>
                    </div>
                  </article>

                  <p className="text-[11px] text-center text-[var(--foreground-muted)]">
                    This is how your dossier card will appear on the public
                    Mercenaries page.
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
            </div>
          </div>
        </div>
      </form>

      {/* SOCIAL LINKS MODAL */}
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
                  Submit your Twitch channel to be featured on the Wolf Network
                  page.
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
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[var(--accent-main)]"></div>
              </div>
            ) : links.length > 0 ? (
              <div
                className="
                grid
                grid-cols-1
                sm:grid-cols-2
                lg:grid-cols-2
                gap-5
                max-h-[70vh]
                overflow-y-auto
                pr-2
              "
              >
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="
                      p-5
                      rounded-lg
                      border
                      border-[var(--border-soft)]
                      bg-[var(--background-secondary)]/70
                      flex
                      flex-col
                      min-h-[220px]
                      shadow-md
                    "
                  >
                    {/* TOP SECTION */}
                    <div className="flex flex-col gap-3 flex-1">
                      {/* Name + Status */}
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-[var(--foreground)] truncate text-base">
                          {link.channelName}
                        </h3>

                        <span
                          className={`
                px-2 py-1 
                rounded-full 
                text-xs 
                font-semibold 
                border 
                ${getStatusBadge(link.status)}
              `}
                        >
                          {link.status}
                        </span>
                      </div>

                      {/* URL */}
                      <a
                        href={link.channelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
              text-[var(--accent-secondary)]
              hover:text-[var(--accent-secondary)]/80
              text-sm
              flex items-center gap-1
              truncate
            "
                      >
                        {link.channelUrl}
                        <ExternalLink size={15} />
                      </a>

                      {/* Description */}
                      {link.description && (
                        <p className="text-sm text-[var(--foreground-muted)] leading-snug line-clamp-4">
                          {link.description}
                        </p>
                      )}

                      {/* Rejection Reason */}
                      {link.status === "REJECTED" && link.rejectionReason && (
                        <div className="mt-2 p-3 bg-[var(--accent-strong)]/10 border border-[var(--accent-strong)]/30 rounded text-sm text-[var(--foreground-muted)]">
                          <strong className="text-[var(--foreground)]">
                            Rejection reason:
                          </strong>{" "}
                          {link.rejectionReason}
                        </div>
                      )}

                      {/* DATE */}
                      <p className="text-xs text-[var(--foreground-muted)] mt-auto">
                        Submitted:{" "}
                        {new Date(link.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* DELETE BUTTON */}
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="
                        mt-4
                        px-4 py-2
                        rounded-md
                        text-xs
                        font-semibold
                        border
                        border-[var(--border)]
                        bg-[var(--background-elevated)]
                        hover:bg-[var(--accent-strong)]/15
                        hover:border-[var(--accent-strong)]
                        transition-colors
                        text-[var(--foreground-muted)]
                        hover:text-[var(--foreground)]
                        cursor-pointer
                      "
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-[var(--border-soft)] rounded-lg bg-[var(--background-secondary)]/70">
                <p className="text-[var(--foreground-muted)] mb-2">
                  No Twitch channels submitted yet.
                </p>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Click “Add Channel” to submit your first channel for approval.
                </p>
              </div>
            )}

            {/* ADD CHANNEL MODAL */}
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
                          value={linkFormData.channelName}
                          onChange={(e) =>
                            setLinkFormData((prev) => ({
                              ...prev,
                              channelName: e.target.value,
                            }))
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
                          value={linkFormData.channelUrl}
                          onChange={(e) =>
                            setLinkFormData((prev) => ({
                              ...prev,
                              channelUrl: e.target.value,
                            }))
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
                          value={linkFormData.description}
                          onChange={(e) =>
                            setLinkFormData((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    {linkError && (
                      <div className="mb-4 p-3 bg-[var(--accent-strong)]/20 border border-[var(--accent-strong)] rounded text-sm text-[var(--foreground)]">
                        {linkError}
                      </div>
                    )}

                    <div className="bg-[var(--background-elevated)]/50 border border-[var(--border-subtle)] rounded-lg p-3 mb-6">
                      <p className="text-xs text-[var(--foreground-muted)]">
                        <strong className="text-[var(--foreground)]">
                          Note:
                        </strong>{" "}
                        Your submission will be reviewed by a Captain or higher
                        rank before appearing on the Wolf Network page.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isSubmittingLink}
                        className="flex-1 px-4 py-2 rounded-md text-sm font-semibold border border-[var(--accent-soft)] bg-[var(--accent-soft)]/15 hover:bg-[var(--accent-soft)]/25 transition-colors text-[var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isSubmittingLink ? "Submitting..." : "Submit"}
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
          </div>
        </div>
      )}
    </>
  );
}