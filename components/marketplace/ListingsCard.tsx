"use client";
import { JSX, useState } from "react";
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

export default function ListingCard({
  item,
  contacted,
  onContact,
  onViewThread,
  onJoinDiscord,
  adminControls,
}: ListingCardProps): JSX.Element {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      className="group relative rounded-2xl overflow-hidden
        bg-gradient-to-br from-[var(--background-elevated)]/95 to-[var(--background-card)]/90
        backdrop-blur-md
        border border-[var(--hw-steel-teal)]/40
        shadow-[0_4px_24px_rgba(0,0,0,0.4),0_0_18px_rgba(17,78,98,0.25)]
        transition-all duration-500 ease-out
        hover:shadow-[0_8px_48px_rgba(0,0,0,0.6),0_0_40px_rgba(17,78,98,0.5),0_0_80px_rgba(71,0,0,0.3)]
        hover:scale-[1.02] hover:-translate-y-1
        hover:border-[var(--hw-steel-teal)]/80"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* SPOTLIGHT EFFECT - follows mouse */}
      {isHovered && (
        <div
          className="absolute pointer-events-none z-30 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 150px at ${mousePosition.x}px ${mousePosition.y}px, rgba(17,78,98,0.15), transparent)`,
            inset: 0,
          }}
        />
      )}

      {/* ANIMATED CORNER BRACKETS */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[var(--hw-steel-teal)]/0
        group-hover:border-[var(--hw-steel-teal)] group-hover:w-12 group-hover:h-12
        transition-all duration-500 z-20" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[var(--hw-steel-teal)]/0
        group-hover:border-[var(--hw-steel-teal)] group-hover:w-12 group-hover:h-12
        transition-all duration-500 z-20" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[var(--hw-dark-crimson)]/0
        group-hover:border-[var(--hw-dark-crimson)] group-hover:w-12 group-hover:h-12
        transition-all duration-500 z-20" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[var(--hw-dark-crimson)]/0
        group-hover:border-[var(--hw-dark-crimson)] group-hover:w-12 group-hover:h-12
        transition-all duration-500 z-20" />

      {/* Metallic Texture Layer */}
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none bg-[url('/images/marketplace/metal-texture.jpg')] bg-cover mix-blend-overlay z-5" />

      {/* Enhanced Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--hw-steel-teal)]/10 via-transparent to-[var(--hw-dark-crimson)]/10
        pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-500 z-5" />

      {/* Animated Scan Line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--hw-steel-teal)] to-transparent
        opacity-0 group-hover:opacity-100 group-hover:animate-scan-slow transition-opacity duration-500 z-20" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/50 pointer-events-none z-5" />

      {/* Card Content */}
      <div className="relative z-10 flex flex-col p-5 h-full">
        {/* Item Image */}
        <div className="relative w-full h-48 mb-4 rounded-xl overflow-hidden
          border-2 border-[var(--hw-steel-teal)]/30 group-hover:border-[var(--hw-steel-teal)]/60
          shadow-[0_4px_16px_rgba(0,0,0,0.3)] group-hover:shadow-[0_8px_24px_rgba(17,78,98,0.4)]
          transition-all duration-500">

          {/* Image Container */}
          <div className="relative w-full h-full bg-gradient-to-br from-[var(--background)]/80 to-[var(--background-elevated)]">
            <SafeImage
              src={
                item.imageUrl ||
                item.images?.[0]?.imageUrl ||
                "/images/placeholder.svg"
              }
              alt={item.title}
              fill
              className="object-cover transition-all duration-700 ease-out
                group-hover:scale-110 group-hover:brightness-110"
            />

            {/* Image Overlay Effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent
              opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>

          {/* Corner Frame Indicators */}
          <div className="absolute top-1 left-1 w-3 h-3 border-t border-l border-[var(--hw-steel-teal)]/60" />
          <div className="absolute bottom-1 right-1 w-3 h-3 border-b border-r border-[var(--hw-steel-teal)]/60" />
        </div>

        {/* Title - Enhanced */}
        <div className="relative mb-3">
          <h3 className="text-center py-3 px-2 uppercase tracking-widest font-bold
            text-white text-sm md:text-base
            bg-gradient-to-r from-[var(--hw-steel-teal)]/80 via-[var(--hw-steel-teal)]/95 to-[var(--hw-steel-teal)]/80
            border-y-2 border-[var(--hw-steel-teal)]/70
            shadow-[0_0_20px_rgba(17,78,98,0.3)]
            group-hover:shadow-[0_0_30px_rgba(17,78,98,0.5)]
            group-hover:brightness-110
            transition-all duration-500
            relative overflow-hidden">

            {/* Animated Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent
              translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

            <span className="relative z-10">{item.title}</span>
          </h3>

          {/* Title Accent Lines */}
          <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--hw-steel-teal)] to-transparent opacity-60" />
          <div className="absolute -bottom-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--hw-steel-teal)] to-transparent opacity-60" />
        </div>

        {/* Description */}
        <p className="text-[var(--text-secondary)] text-xs sm:text-sm leading-relaxed line-clamp-3 mb-4
          group-hover:text-[var(--text-primary)] transition-colors duration-300">
          {item.description || "No description available"}
        </p>

        {/* Seller */}
        {item.sellerUsername && (
          <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-md
            bg-[var(--background)]/40 border border-[var(--hw-steel-teal)]/20">
            <svg className="w-3 h-3 text-[var(--hw-steel-teal)]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              <span className="font-bold text-[var(--text-primary)]">{item.sellerUsername}</span>
            </p>
          </div>
        )}

        {/* Price + Info */}
        <div className="flex items-center justify-between mb-4 mt-auto">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Badge - Moved from image */}
            {item.category && (
              <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md
                bg-gradient-to-r from-[var(--hw-steel-teal)]/90 to-[var(--hw-steel-teal)]/70
                text-white backdrop-blur-sm
                border border-[var(--hw-steel-teal)]/50
                shadow-[0_4px_12px_rgba(17,78,98,0.4)]
                group-hover:shadow-[0_6px_16px_rgba(17,78,98,0.6)]
                transition-all duration-300">
                {item.category}
              </span>
            )}

            {item.quantity && item.quantity > 1 && (
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md
                bg-gradient-to-r from-[var(--hw-dark-crimson)]/30 to-[var(--hw-dark-crimson)]/20
                border border-[var(--hw-dark-crimson)]/50 text-red-300
                shadow-[0_0_8px_rgba(71,0,0,0.3)]">
                QTY {item.quantity}
              </span>
            )}
          </div>

          {/* Price Display - Enhanced */}
          <div className="flex flex-col items-end">
            <p className="text-[var(--hw-steel-teal)] font-black text-xl tracking-tight
              drop-shadow-[0_0_8px_rgba(17,78,98,0.6)]
              group-hover:text-[var(--hw-steel-teal)] group-hover:drop-shadow-[0_0_12px_rgba(17,78,98,0.8)]
              transition-all duration-300">
              {item.price.toLocaleString()}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] font-semibold tracking-wider uppercase">aUEC</p>
          </div>
        </div>

        {/* Buttons - Enhanced */}
        {contacted?.needsInvite ? (
          <button
            onClick={onJoinDiscord}
            className="relative w-full py-3 overflow-hidden
              bg-gradient-to-r from-[var(--hw-steel-teal)] to-[var(--hw-steel-teal)]/80
              hover:from-[var(--hw-steel-teal)]/90 hover:to-[var(--hw-steel-teal)]
              rounded-lg text-white font-bold text-sm uppercase tracking-wider
              border-2 border-[var(--hw-steel-teal)]/50
              shadow-[0_4px_16px_rgba(17,78,98,0.3)]
              hover:shadow-[0_6px_24px_rgba(17,78,98,0.5)]
              hover:scale-[1.02] active:scale-[0.98]
              transition-all duration-300 group/btn cursor-pointer">
            <span className="relative z-10 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
              Join Discord
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
              translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-700" />
          </button>
        ) : contacted?.threadUrl ? (
          <button
            onClick={onViewThread}
            className="relative w-full py-3 overflow-hidden
              bg-gradient-to-r from-[var(--hw-steel-teal)]/80 to-[var(--hw-steel-teal)]/60
              hover:from-[var(--hw-steel-teal)] hover:to-[var(--hw-steel-teal)]/80
              rounded-lg text-white font-bold text-sm uppercase tracking-wider
              border-2 border-[var(--hw-steel-teal)]/40
              shadow-[0_4px_16px_rgba(17,78,98,0.25)]
              hover:shadow-[0_6px_24px_rgba(17,78,98,0.4)]
              hover:scale-[1.02] active:scale-[0.98]
              transition-all duration-300 group/btn cursor-pointer">
            <span className="relative z-10 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              View Thread
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent
              translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-700" />
          </button>
        ) : (
          <button
            onClick={onContact}
            className="relative w-full py-3 overflow-hidden
              bg-gradient-to-r from-[var(--hw-dark-crimson)] to-[var(--hw-dark-crimson)]/70
              hover:from-[var(--hw-dark-crimson)]/90 hover:to-[var(--hw-dark-crimson)]
              rounded-lg text-white font-bold text-sm uppercase tracking-wider
              border-2 border-[var(--hw-dark-crimson)]/50
              shadow-[0_4px_16px_rgba(71,0,0,0.4)]
              hover:shadow-[0_6px_24px_rgba(71,0,0,0.6)]
              hover:scale-[1.02] active:scale-[0.98]
              transition-all duration-300 group/btn cursor-pointer">
            <span className="relative z-10 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Contact Seller
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent
              translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-700" />
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
