"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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

const SocialLinksManagementPage = () => {
  const { data: session } = useSession();
  const [pendingLinks, setPendingLinks] = useState<SocialLink[]>([]);
  const [approvedLinks, setApprovedLinks] = useState<SocialLink[]>([]);
  const [rejectedLinks, setRejectedLinks] = useState<SocialLink[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLink, setSelectedLink] = useState<SocialLink | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    setIsLoading(true);
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        fetch("/api/social-links?status=PENDING"),
        fetch("/api/social-links?status=APPROVED"),
        fetch("/api/social-links?status=REJECTED"),
      ]);

      if (pendingRes.ok) setPendingLinks(await pendingRes.json());
      if (approvedRes.ok) setApprovedLinks(await approvedRes.json());
      if (rejectedRes.ok) setRejectedLinks(await rejectedRes.json());
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
      }
    } catch (error) {
      console.error("Error approving link:", error);
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
      }
    } catch (error) {
      console.error("Error deleting link:", error);
    }
  };

  const currentLinks =
    activeTab === "pending"
      ? pendingLinks
      : activeTab === "approved"
      ? approvedLinks
      : rejectedLinks;

  // Check if user has permission (Captain or above)
  const hasPermission = session?.user?.permissions?.includes("DOSSIER_ADMIN");

  if (!hasPermission) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Access Denied
          </h1>
          <p className="text-foreground-muted">
            You need Captain rank or higher to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold uppercase tracking-widest text-foreground mb-2">
          Social Links Management
        </h1>
        <p className="text-foreground-muted">
          Review and manage Twitch channel submissions from House Wolf members
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-border-default">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-6 py-3 font-semibold transition-colors relative cursor-pointer ${
            activeTab === "pending"
              ? "text-crimson"
              : "text-foreground-muted hover:text-foreground"
          }`}
        >
          Pending
          {pendingLinks.length > 0 && (
            <span className="ml-2 px-2 py-1 text-xs bg-crimson rounded-full">
              {pendingLinks.length}
            </span>
          )}
          {activeTab === "pending" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-crimson" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("approved")}
          className={`px-6 py-3 font-semibold transition-colors relative cursor-pointer ${
            activeTab === "approved"
              ? "text-steel-light"
              : "text-foreground-muted hover:text-foreground"
          }`}
        >
          Approved ({approvedLinks.length})
          {activeTab === "approved" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-steel-light" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("rejected")}
          className={`px-6 py-3 font-semibold transition-colors relative cursor-pointer ${
            activeTab === "rejected"
              ? "text-status-warning-text"
              : "text-foreground-muted hover:text-foreground"
          }`}
        >
          Rejected ({rejectedLinks.length})
          {activeTab === "rejected" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-status-warning" />
          )}
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-crimson"></div>
          <p className="text-foreground-muted mt-4">Loading...</p>
        </div>
      ) : currentLinks.length > 0 ? (
        <div className="grid gap-6">
          {currentLinks.map((link) => (
            <SocialLinkCard
              key={link.id}
              link={link}
              onApprove={() => handleApprove(link.id)}
              onReject={() => handleReject(link)}
              onDelete={() => handleDelete(link.id)}
              status={activeTab}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-xl text-foreground-muted">
            No {activeTab} social links
          </p>
        </div>
      )}

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
    </div>
  );
};

// Social Link Card Component
interface SocialLinkCardProps {
  link: SocialLink;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  status: string;
}

const SocialLinkCard: React.FC<SocialLinkCardProps> = ({
  link,
  onApprove,
  onReject,
  onDelete,
  status,
}) => {
  return (
    <div className="card">
      <div className="flex gap-6">
        {/* User Info */}
        <div className="flex items-start gap-4 flex-1">
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-border-default flex-shrink-0">
            {link.user.avatarUrl ? (
              <SafeImage
                src={link.user.avatarUrl}
                alt={link.user.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-background-elevated flex items-center justify-center text-2xl">
                🐺
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-foreground">
                {link.channelName}
              </h3>
              <span className="badge badge-secondary">
                {link.platform}
              </span>
            </div>

            <p className="text-foreground-muted text-sm mb-3">
              Submitted by: <span className="font-semibold">{link.user.name || link.user.discordUsername}</span>
            </p>

            <a
              href={link.channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-steel-light hover:text-steel text-sm flex items-center gap-1 mb-3"
            >
              {link.channelUrl}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            {link.description && (
              <p className="text-foreground-muted text-sm leading-relaxed bg-background-elevated p-3 rounded-lg border border-border-subtle">
                {link.description}
              </p>
            )}

            <p className="text-foreground-muted text-xs mt-3">
              Submitted: {new Date(link.createdAt).toLocaleDateString()} at{" "}
              {new Date(link.createdAt).toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {status === "pending" && (
            <>
              <button
                onClick={onApprove}
                className="btn btn-secondary px-4 py-2 text-sm whitespace-nowrap cursor-pointer"
              >
                ✓ Approve
              </button>
              <button
                onClick={onReject}
                className="btn btn-ghost px-4 py-2 text-sm whitespace-nowrap hover:bg-status-error/20 hover:text-status-error-text cursor-pointer"
              >
                ✗ Reject
              </button>
            </>
          )}
          {(status === "approved" || status === "rejected") && (
            <button
              onClick={onDelete}
              className="btn btn-ghost px-4 py-2 text-sm whitespace-nowrap hover:bg-status-error/20 hover:text-status-error-text cursor-pointer"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

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
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-background-card border border-border-default rounded-xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            Reject Social Link
          </h2>
          <button
            onClick={onClose}
            className="text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 p-4 bg-background-elevated border border-border-subtle rounded-lg">
          <p className="text-foreground-muted text-sm mb-1">
            Channel: <span className="font-semibold text-foreground">{link.channelName}</span>
          </p>
          <p className="text-foreground-muted text-sm">
            Submitted by: <span className="font-semibold text-foreground">{link.user.name || link.user.discordUsername}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="rejectionReason" className="label">
              Rejection Reason
            </label>
            <textarea
              id="rejectionReason"
              className="textarea"
              rows={4}
              placeholder="Explain why this submission is being rejected..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary flex-1 bg-status-error hover:bg-status-error/80 cursor-pointer"
            >
              {isSubmitting ? "Rejecting..." : "Reject Submission"}
            </button>
            <button type="button" onClick={onClose} className="btn btn-ghost cursor-pointer">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SocialLinksManagementPage;
