"use client";

import { X, ExternalLink, Clock, AlertCircle, Shield } from "lucide-react";
import { useEffect, useState } from "react";

interface DiscordInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteUrl: string;
  itemTitle: string;
  threadUrl?: string;
  discordUrl?: string;
}

export default function DiscordInviteModal({
  isOpen,
  onClose,
  inviteUrl,
  itemTitle,
  threadUrl
}: DiscordInviteModalProps) {
  const [copied, setCopied] = useState(false);
  const [inviteClicked, setInviteClicked] = useState(false);

  // ESC to close + disable background scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Open Discord invite
  const handleJoinDiscord = () => {
    setInviteClicked(true);
    window.open(inviteUrl, "_blank");

    setTimeout(() => onClose(), 2000);
  };

  // Copy to clipboard
  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);

    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-9998 transition-opacity duration-300"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      />

      {/* MODAL WRAPPER */}
      <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
        <div
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-accent-main/40 shadow-[0_0_40px_rgba(71,0,0,0.4)] bg-linear-to-br from-obsidian via-night-deep to-shadow animate-modal-enter"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="relative p-6 bg-linear-to-r from-crimson-dark/30 via-shadow/40 to-steel-dark/30 border-b border-accent-main/30">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg text-foreground-muted hover:text-foreground hover:bg-white/10 transition"
            >
              <X size={20} aria-hidden="true" />
            </button>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-crimson-dark/20 border border-crimson/40">
                <Shield className="w-8 h-8 text-crimson-light" aria-hidden="true" />
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-bold text-crimson-light tracking-wide">
                  Join the House Wolf Discord
                </h2>
                <p className="text-foreground-muted text-sm">
                  Required to communicate with the seller and complete marketplace transactions.
                </p>
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className="p-6 space-y-8">
            {/* ITEM BOX */}
            <div className="bg-night-deep border border-accent-main/20 rounded-xl p-4">
              <p className="text-sm text-foreground-muted mb-1">Your inquiry:</p>
              <p className="text-lg font-semibold text-foreground">{itemTitle}</p>
            </div>

            {/* WARNING */}
            <div className="bg-linear-to-r from-crimson-dark/20 via-shadow/20 to-steel-dark/20 border border-accent-main/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-crimson-light" aria-hidden="true" />
                <div>
                  <h3 className="text-crimson-light font-bold text-lg mb-2">
                    Important Time Limits
                  </h3>

                  <div className="space-y-3 text-foreground-muted text-sm">
                    <div>
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-steel-light mt-0.5" aria-hidden="true" />
                        <p className="font-semibold text-foreground">Invite Expires: 3 Days</p>
                      </div>
                      <p className="ml-6 text-xs opacity-70">
                        Join within 3 days or you must request a new invite.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-steel-light mt-0.5" aria-hidden="true" />
                        <p className="font-semibold text-foreground">Server Access: 7 Days</p>
                      </div>

                      <ul className="ml-6 list-disc list-outside text-xs opacity-70 space-y-1">
                        <li>Complete the transaction within 7 days</li>
                        <li>24-hour warning before removal</li>
                        <li>Auto-removal after 7 days</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEPS */}
            <div className="space-y-4">
              <h3 className="text-foreground font-semibold text-lg flex items-center gap-2">
                <span className="text-steel-light">→</span> Next Steps
              </h3>

              {[
                "Join the Discord Server",
                "Return to the Marketplace",
                "Access the Discussion Thread"
              ].map((step, index) => (
                <div
                  key={index}
                  className="bg-night-deep border border-accent-main/20 rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="flex items-center justify-center w-7 h-7 bg-steel rounded-full text-white text-sm font-bold">
                      {index + 1}
                    </span>
                    <h4 className="text-foreground font-semibold">{step}</h4>
                  </div>
                  <p className="text-foreground-muted text-sm ml-10">
                    {
                      [
                        "Click the button below to open the Discord invite.",
                        "Return to this page and click Contact Seller again.",
                        "You will then be able to participate in the discussion thread."
                      ][index]
                    }
                  </p>
                </div>
              ))}
            </div>

            {/* INVITE URL */}
            <div className="bg-night-deep border border-accent-main/20 rounded-xl p-4">
              <p className="text-foreground-muted text-xs mb-2">
                {copied ? "✅ Copied!" : "Invite Link (click to copy):"}
              </p>

              <button
                onClick={handleCopyInvite}
                className={`w-full text-left p-3 rounded-lg text-sm font-mono break-all transition-all ${
                  copied
                    ? "border border-green-500/50 text-green-400 bg-green-500/10"
                    : "border border-accent-main/20 text-steel-light hover:border-steel-light hover:bg-night-deep/70"
                }`}
              >
                {inviteUrl}
              </button>
            </div>
          </div>

          {/* FOOTER */}
          <div className="border-t border-accent-main/20 p-6 flex gap-3 bg-obsidian">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-shadow hover:bg-night-deep text-foreground rounded-lg font-semibold transition"
            >
              Maybe Later
            </button>

            <button
              onClick={handleJoinDiscord}
              className="flex-1 px-6 py-3 rounded-lg font-semibold transition text-foreground bg-linear-to-r from-crimson-dark to-crimson-light hover:shadow-[0_0_20px_rgba(71,0,0,0.6)] flex items-center justify-center gap-2"
            >
              <ExternalLink size={18} aria-hidden="true" />
              Join Discord Server
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .animate-modal-enter {
          animation: modalEnter 0.25s ease-out;
        }
        @keyframes modalEnter {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
