"use client";
import { JSX } from "react";
import { SafeImage } from "../utils/SafeImage";

interface ListingCardProps {
  item: {
    title: string;
    description?: string;
    price: number;
    quantity?: number;
    category?: string;
    sellerUsername?: string | null;
    images?: { imageUrl: string }[];
    imageUrl?: string;
  };
  contacted?: {
    needsInvite?: boolean;
    threadUrl?: string;
  };
  onContact: () => void;
  onViewThread: () => void;
  onJoinDiscord: () => void;
  adminControls?: JSX.Element | null;
}

/** ANIMATED GLOW **/
const glowClass =
  "hover:animate-cardGlow hover:shadow-[0_0_26px_var(--accent-main)]";

export default function ListingCard({
  item,
  contacted,
  onContact,
  onViewThread,
  onJoinDiscord,
  adminControls,
}: ListingCardProps): JSX.Element {
  return (
    <div
      className="
    relative rounded-2xl overflow-hidden 
    bg-[var(--background-secondary)]/90 backdrop-blur-sm
    border border-[#00aaff]/60 
    shadow-[0_0_12px_#0099ff50] 
    transition-all duration-300 
    hover:shadow-[0_0_35px_#00ccff] 
    hover:scale-[1.015]
  "
    >
      {/* Metallic Texture Layer */}
      <div className="absolute inset-0 opacity-[0.22] pointer-events-none bg-[url('/images/marketplace/metal-texture.jpg')] bg-cover mix-blend-overlay" />

      {/* Subtle Accent Gradient */}
      <div className="absolute inset-0 bg-linear-to-b from-[var(--accent-main)]/15 via-transparent to-[var(--accent-strong)]/20 pointer-events-none" />

      {/* Dark vignette */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Card Content */}
      <div className="relative z-10 flex flex-col p-4 h-full">
        {/* Item Image */}
        <div className="relative w-full h-40 mb-4 rounded-lg border border-[var(--border)] bg-[var(--background)] overflow-hidden">
          <SafeImage
            src={
              item.imageUrl ||
              item.images?.[0]?.imageUrl ||
              "/images/placeholder.svg"
            }
            alt={item.title}
            fill
            className="object-cover transition-all duration-300 group-hover:scale-[1.04]"
          />
          {item.category && (
            <span className="absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-semibold bg-[var(--accent-main)]/85 text-white border border-[var(--border)] shadow-md">
              {item.category}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className="
          text-center py-2 mb-3 uppercase tracking-wide font-semibold
          text-white text-sm md:text-base
          bg-linear-to-r from-[var(--accent-strong)]/90 via-[var(--accent-main)]/95 to-[var(--accent-strong)]/90
          border border-[var(--accent-strong)]/70 rounded-md
          shadow-[0_0_12px_var(--accent-main)]
        "
        >
          {item.title}
        </h3>

        {/* Description */}
        <p className="text-[var(--foreground-muted)] text-xs sm:text-sm leading-relaxed line-clamp-3 mb-3">
          {item.description}
        </p>

        {/* Seller */}
        {item.sellerUsername && (
          <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--foreground-muted)] mb-2">
            Seller:{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {item.sellerUsername}
            </span>
          </p>
        )}

        {/* Price + Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-[11px] font-semibold rounded-full bg-[var(--background)] border border-[var(--border)] text-[var(--foreground-muted)]">
              {item.category || "Listing"}
            </span>

            {item.quantity && item.quantity > 1 && (
              <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-[var(--accent-main)]/15 border border-[var(--accent-main)]/40 text-[var(--foreground)]">
                Qty {item.quantity}
              </span>
            )}
          </div>

          <p className="text-[var(--accent-strong)] font-bold text-lg">
            {item.price.toLocaleString()} aUEC
          </p>
        </div>

        {/* Buttons */}
        {contacted?.needsInvite ? (
          <button
            onClick={onJoinDiscord}
            className="w-full py-2 bg-linear-to-r from-[var(--accent-main)] to-[var(--accent-strong)] hover:brightness-110 rounded-md text-white border border-[var(--border)] shadow-sm transition"
          >
            🔗 Join Discord
          </button>
        ) : contacted?.threadUrl ? (
          <button
            onClick={onViewThread}
            className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-md text-white border border-[var(--border)] shadow-sm transition"
          >
            💬 View Thread
          </button>
        ) : (
          <button
            onClick={onContact}
            className="
    w-full py-2 
    bg-[var(--accent-main)] 
    hover:bg-[var(--accent-strong)]
    transition-colors
    rounded-md text-white 
    border border-[var(--border)] 
    shadow-sm
  "
          > 
            💬 Contact Seller
          </button>
        )}

        {/* Admin Controls */}
        {adminControls && <div className="mt-3">{adminControls}</div>}
      </div>
    </div>
  );
}

/* Animated glow keyframes (add to your globals.css)
-------------------------------------------------- */
/*
@keyframes cardGlow {
  0%   { box-shadow: 0 0 6px var(--accent-main); }
  50%  { box-shadow: 0 0 20px var(--accent-strong); }
  100% { box-shadow: 0 0 6px var(--accent-main); }
}
*/
