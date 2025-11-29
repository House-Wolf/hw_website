"use client";

import React, { useEffect, useState } from "react";
import { SafeImage } from "@/components/utils/SafeImage";

// Types
interface SocialLink {
  id: string;
  platform: string;
  channelName: string;
  channelUrl: string;
  description?: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    discordUsername: string;
    avatarUrl?: string;
  };
}

export default function SocialLinksSection() {
  const [pendingLinks, setPendingLinks] = useState<SocialLink[]>([]);
  const [approvedLinks, setApprovedLinks] = useState<SocialLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLink, setSelectedLink] = useState<SocialLink | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    setIsLoading(true);
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        fetch("/api/social-links?status=PENDING"),
        fetch("/api/social-links?status=APPROVED"),
      ]);

      if (pendingRes.ok) setPendingLinks(await pendingRes.json());
      if (approvedRes.ok) setApprovedLinks(await approvedRes.json());
    } catch (error) {
      console.error("Error fetching social links:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (linkId: string) => {
    try {
      const response = await fetch(`/api/social-links/${linkId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "approve" }),
      });

      if (response.ok) {
        await fetchLinks();
      } else {
        const errorData = await response.json();
        console.error("Failed to approve:", errorData);
        alert(`Failed to approve: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error approving link:", error);
      alert(`Error approving link: ${error}`);
    }
  };

  const handleReject = (link: SocialLink) => {
    setSelectedLink(link);
    setShowRejectModal(true);
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return;

    try {
      const response = await fetch(`/api/social-links/${linkId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchLinks();
      } else {
        const errorData = await response.json();
        console.error("Failed to delete:", errorData);
        alert(`Failed to delete: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error deleting link:", error);
      alert(`Error deleting link: ${error}`);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent-main)]"></div>
        <p className="text-[var(--foreground-muted)] mt-3 text-sm">Loading social links...</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Links */}
        <div className="border border-[var(--border-soft)] rounded-lg p-4 bg-[var(--background-secondary)]/70 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                Pending Links
              </p>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                Awaiting Approval
              </h3>
            </div>
            <span className="text-sm font-semibold px-3 py-1 rounded-full bg-[var(--accent-strong)]/15 border border-[var(--accent-strong)] text-[var(--foreground)]">
              {pendingLinks.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {pendingLinks.length === 0 ? (
              <p className="text-sm text-[var(--foreground-muted)]">
                No pending social links.
              </p>
            ) : (
              pendingLinks.map((link) => (
                <div
                  key={link.id}
                  className="p-3 rounded-lg border border-[var(--border-soft)] bg-[var(--background-elevated)]/70 space-y-3"
                >
                  {/* User Info */}
                  <div className="flex items-start gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-[var(--border)] flex-shrink-0">
                      {link.user.avatarUrl ? (
                        <SafeImage
                          src={link.user.avatarUrl}
                          alt={link.user.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[var(--background-elevated)] flex items-center justify-center text-lg">
                          🐺
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--foreground)] text-sm">
                        {link.channelName}
                      </p>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        @{link.user.discordUsername}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                        {link.platform}
                      </span>
                    </div>
                  </div>

                  {/* Channel URL */}
                  <a
                    href={link.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-secondary)] hover:text-[var(--accent-secondary)]/80 text-xs flex items-center gap-1 break-all"
                  >
                    {link.channelUrl}
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>

                  {/* Description */}
                  {link.description && (
                    <p className="text-xs text-[var(--foreground-muted)] leading-relaxed bg-[var(--background-elevated)] p-2 rounded border border-[var(--border-subtle)]">
                      {link.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    <button
                      onClick={() => handleApprove(link.id)}
                      className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold border border-[var(--accent-soft)] bg-[var(--background-elevated)] hover:bg-[var(--accent-soft)]/15 hover:border-[var(--accent-soft)] transition-colors text-[var(--foreground)] cursor-pointer"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleReject(link)}
                      className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold border border-[var(--border)] bg-[var(--background-elevated)] hover:bg-[var(--accent-strong)]/15 hover:border-[var(--accent-strong)] transition-colors text-[var(--foreground)] cursor-pointer"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Approved Links */}
        <div className="border border-[var(--border-soft)] rounded-lg p-4 bg-[var(--background-secondary)]/70 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                Approved Links
              </p>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                Published
              </h3>
            </div>
            <span className="text-sm font-semibold px-3 py-1 rounded-full bg-[var(--accent-soft)]/15 border border-[var(--accent-soft)] text-[var(--foreground)]">
              {approvedLinks.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {approvedLinks.length === 0 ? (
              <p className="text-sm text-[var(--foreground-muted)]">
                No approved social links yet.
              </p>
            ) : (
              approvedLinks.map((link) => (
                <div
                  key={link.id}
                  className="p-3 rounded-lg border border-[var(--border-soft)] bg-[var(--background-elevated)]/70 space-y-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-purple-500/30 flex-shrink-0">
                      {link.user.avatarUrl ? (
                        <SafeImage
                          src={link.user.avatarUrl}
                          alt={link.user.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[var(--background-elevated)] flex items-center justify-center text-lg">
                          🐺
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--foreground)] text-sm">
                        {link.channelName}
                      </p>
                      <p className="text-xs text-[var(--foreground-muted)]">
                        @{link.user.discordUsername}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="px-2 py-1 rounded-md text-xs font-semibold border border-[var(--border)] bg-[var(--background-elevated)] hover:bg-[var(--accent-strong)]/15 hover:border-[var(--accent-strong)] transition-colors text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedLink && (
        <RejectModal
          link={selectedLink}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedLink(null);
          }}
          onSuccess={() => {
            setShowRejectModal(false);
            setSelectedLink(null);
            fetchLinks();
          }}
        />
      )}
    </>
  );
}

// Reject Modal Component
interface RejectModalProps {
  link: SocialLink;
  onClose: () => void;
  onSuccess: () => void;
}

const RejectModal: React.FC<RejectModalProps> = ({ link, onClose, onSuccess }) => {
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/social-links/${link.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "reject",
          rejectionReason,
        }),
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error rejecting link:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--background-card)] border border-[var(--border-default)] rounded-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            Reject Social Link
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 p-3 bg-[var(--background-elevated)] border border-[var(--border-subtle)] rounded-lg">
          <p className="text-[var(--foreground-muted)] text-sm mb-1">
            Channel: <span className="font-semibold text-[var(--foreground)]">{link.channelName}</span>
          </p>
          <p className="text-[var(--foreground-muted)] text-sm">
            Submitted by: <span className="font-semibold text-[var(--foreground)]">{link.user.name || link.user.discordUsername}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="rejectionReason" className="block mb-2 text-sm font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
              Rejection Reason
            </label>
            <textarea
              id="rejectionReason"
              className="w-full px-3 py-2 bg-[var(--background-elevated)] border border-[var(--border-default)] rounded-md text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--accent-main)] transition-colors"
              rows={4}
              placeholder="Explain why this submission is being rejected..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-md text-sm font-semibold border border-[var(--accent-strong)] bg-[var(--accent-strong)]/15 hover:bg-[var(--accent-strong)]/25 transition-colors text-[var(--foreground)] cursor-pointer"
            >
              {isSubmitting ? "Rejecting..." : "Reject Submission"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--border)] bg-[var(--background-elevated)] hover:bg-[var(--background-soft)] transition-colors text-[var(--foreground-muted)] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
