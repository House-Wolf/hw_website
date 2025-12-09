"use client";

import { X, ExternalLink, Clock, AlertCircle, Shield, KeyRound, Lock } from "lucide-react";
import { useEffect, useState } from "react";

interface DiscordInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  threadUrl?: string;
  onJoinDiscord: () => void | Promise<void>;
}


/**
 * @component DiscordInviteModal
 * @description Modal prompting user to join Discord server for marketplace access
 * @param props - The props for the modal
 * @param props.isOpen - Whether the modal is open
 * @param props.onClose - Function to call when closing the modal
 * @param props.itemTitle - The title of the marketplace item
 * @param props.threadUrl - (Optional) The URL of the discussion thread
 * @param props.onJoinDiscord - Callback to trigger the secure invite flow
 * @returns The DiscordInviteModal component
 * @author House Wolf Dev Team
 */
export default function DiscordInviteModal({
  isOpen,
  onClose,
  itemTitle,
  threadUrl,
  onJoinDiscord,
}: DiscordInviteModalProps) {
  const [inviteClicked, setInviteClicked] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();

    if (isOpen) {
      console.log("DiscordInviteModal opened for:", itemTitle);
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose, itemTitle]);

  if (!isOpen) {
    console.log("DiscordInviteModal closed - isOpen:", isOpen);
    return null;
  }

  return (
    <>
      {/* BACKDROP */}
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl transition-opacity duration-300"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Subtle radial glow behind modal */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]
            bg-gradient-radial from-[var(--hw-steel-teal)]/30 via-transparent to-transparent blur-3xl opacity-70" />
        </div>
      </div>

      {/* MODAL WRAPPER */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl
            border border-[var(--hw-steel-teal)]/40
            bg-gradient-to-br from-[var(--background-elevated)]/90 via-[var(--background-card)]/90 to-[var(--background)]/95
            shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_80px_rgba(17,78,98,0.5)]
            relative animate-modal-enter"
          onClick={(e) => e.stopPropagation()}
        >
          {/* TOP ACCENT BAR */}
          <div className="absolute inset-x-0 top-0 h-[2px]
            bg-gradient-to-r from-transparent via-[var(--hw-steel-teal)] to-transparent opacity-80" />

          {/* HEADER */}
          <div className="relative px-6 pt-6 pb-4 border-b border-[var(--hw-steel-teal)]/30">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg
                bg-black/40 hover:bg-black/70 border border-white/10
                text-foreground-muted hover:text-foreground transition"
            >
              <X size={18} aria-hidden="true" />
            </button>

            <div className="flex items-start gap-4">
              {/* Icon cluster */}
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--hw-steel-teal)]/60 to-[var(--hw-steel-teal)]/20
                  flex items-center justify-center border border-[var(--hw-steel-teal)]/60 shadow-[0_0_20px_rgba(17,78,98,0.7)]">
                  <Lock className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-black/80 border border-[var(--hw-steel-teal)]/70 flex items-center justify-center">
                  <KeyRound className="w-3 h-3 text-[var(--hw-steel-teal)]" aria-hidden="true" />
                </div>
              </div>

              {/* Title & badge */}
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full
                  bg-[var(--hw-steel-teal)]/10 border border-[var(--hw-steel-teal)]/40 mb-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--hw-steel-teal)] animate-pulse" />
                  <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[var(--hw-steel-teal)]">
                    RESTRICTED CHANNEL ACCESS
                  </span>
                </div>

                <h2 className="text-2xl md:text-3xl font-extrabold tracking-wide text-[var(--foreground)]">
                  Marketplace Channel Required
                </h2>
                <p className="mt-2 text-sm text-foreground-muted max-w-xl">
                  To contact this seller, you&apos;ll need **temporary, limited access** to the House Wolf marketplace channel.  
                  This does <span className="font-semibold text-foreground">not</span> grant full server access.
                </p>
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className="p-6 space-y-8">
            {/* ITEM SUMMARY */}
            <div className="relative overflow-hidden rounded-2xl border border-[var(--hw-steel-teal)]/30
              bg-gradient-to-br from-black/60 via-black/40 to-[var(--background-elevated)]/60
              shadow-[0_0_20px_rgba(0,0,0,0.7)]">
              {/* inner glow */}
              <div className="absolute inset-0 bg-gradient-radial from-[var(--hw-steel-teal)]/10 via-transparent to-transparent opacity-60" />
              <div className="relative p-4">
                <p className="text-xs text-foreground-muted mb-1 tracking-[0.2em] uppercase">
                  Your Inquiry
                </p>
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {itemTitle}
                </p>
              </div>
            </div>

            {/* ACCESS INFO CARD */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Left: Access constraints */}
              <div className="rounded-2xl border border-[var(--hw-steel-teal)]/25 bg-black/60 p-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
                  style={{
                    backgroundImage: `linear-gradient(var(--hw-steel-teal) 1px, transparent 1px),
                                      linear-gradient(90deg, var(--hw-steel-teal) 1px, transparent 1px)`,
                    backgroundSize: "40px 40px",
                  }}
                />
                <div className="relative flex items-start gap-3">
                  <Shield className="w-5 h-5 text-[var(--hw-steel-teal)] mt-0.5" aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">
                      Scoped Marketplace Access
                    </h3>
                    <p className="text-xs text-foreground-muted mb-2">
                      This invite is configured to only allow access to the{" "}
                      <span className="text-[var(--hw-steel-teal)] font-semibold">
                        marketplace-transactions
                      </span>{" "}
                      text channel.
                    </p>
                    <p className="text-[11px] text-foreground-muted/80">
                      You will <span className="font-semibold text-foreground">not</span> see general chats, command channels,
                      or other House Wolf systems.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Expiry & security */}
              <div className="rounded-2xl border border-[var(--hw-steel-teal)]/20 bg-[var(--background-elevated)]/80 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[var(--hw-steel-teal)] mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--foreground)]">
                      Time-Limited Access
                    </p>
                    <p className="text-[11px] text-foreground-muted">
                      Your access expires automatically after a short period or once the transaction is complete.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-crimson-light mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--foreground)]">
                      Anti-Sharing Protection
                    </p>
                    <p className="text-[11px] text-foreground-muted">
                      The invite is single-use and bound to the marketplace flow. Sharing the link won&apos;t provide
                      unrestricted access.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* NEXT STEPS TIMELINE */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                <span className="inline-block w-1 h-5 bg-[var(--hw-steel-teal)] rounded-full" />
                Next Steps
              </h3>

              <div className="space-y-3">
                {[
                  {
                    label: "Join the marketplace channel",
                    detail: "You will be redirected to Discord using a secure invite flow.",
                  },
                  {
                    label: "Return to the House Wolf marketplace",
                    detail: "Come back to this page after joining to continue the transaction.",
                  },
                  {
                    label: "Access your listing thread",
                    detail:
                      threadUrl
                        ? "If a thread already exists, you’ll be able to jump directly into the conversation."
                        : "Once the seller responds, a dedicated thread will be created for your transaction.",
                  },
                ].map((step, index) => (
                  <div
                    key={index}
                    className="flex gap-3 items-start rounded-2xl bg-black/60 border border-[var(--hw-steel-teal)]/15 px-4 py-3"
                  >
                    <div className="flex items-center justify-center mt-0.5">
                      <div className="w-7 h-7 rounded-full bg-[var(--hw-steel-teal)]/25 border border-[var(--hw-steel-teal)]/60 flex items-center justify-center text-[11px] font-bold text-[var(--hw-steel-teal)]">
                        {index + 1}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--foreground)]">
                        {step.label}
                      </p>
                      <p className="text-[11px] text-foreground-muted mt-1">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="border-t border-[var(--hw-steel-teal)]/30 px-6 py-4 flex flex-col sm:flex-row gap-3 bg-black/80 rounded-b-3xl">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl
                bg-[var(--background)]/80 hover:bg-[var(--background-elevated)]
                border border-[var(--hw-steel-teal)]/20 hover:border-[var(--hw-steel-teal)]/40
                text-foreground text-sm font-semibold tracking-wide
                transition cursor-pointer"
            >
              Maybe Later
            </button>

            <button
              onClick={async () => {
                setInviteClicked(true);
                try {
                  await onJoinDiscord();
                } finally {
                  setInviteClicked(false);
                  onClose();
                }
              }}
              onContextMenu={(e) => e.preventDefault()} // block right-click menu / copying
              className="flex-1 px-6 py-3 rounded-xl text-sm font-semibold tracking-wide
                bg-gradient-to-r from-[var(--hw-steel-teal)] to-[var(--hw-steel-teal)]/80
                hover:from-[var(--hw-steel-teal)]/90 hover:to-[var(--hw-steel-teal)]
                text-white border border-[var(--hw-steel-teal)]/60
                shadow-[0_0_25px_rgba(17,78,98,0.7)]
                hover:shadow-[0_0_35px_rgba(17,78,98,0.9)]
                flex items-center justify-center gap-2
                transition-all duration-300 cursor-pointer
                disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={inviteClicked}
            >
              <ExternalLink size={18} aria-hidden="true" />
              {inviteClicked ? "Opening Discord..." : "Join Marketplace Channel"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .animate-modal-enter {
          animation: modalEnter 0.25s ease-out;
        }
        @keyframes modalEnter {
          0% { opacity: 0; transform: translateY(12px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
