"use client";
import { JSX, useState } from "react";
import { SafeImage } from "@/components/utils/SafeImage";

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
  adminControls?: JSX.Element | null;
}

/**
 * @component ListingCard
 * @description A card component to display marketplace listings with enhanced interactivity and security features.
 * @param props - The props for the component.
 * @returns The rendered component.
 * @author House Wolf Dev Team
 */
export default function ListingCard({
  item,
  contacted,
  onContact,
  onViewThread,
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
      backdrop-blur-md border border-[var(--hw-steel-teal)]/40
      shadow-[0_4px_24px_rgba(0,0,0,0.4),0_0_18px_rgba(17,78,98,0.25)]
      transition-all duration-500 ease-out
      hover:shadow-[0_8px_48px_rgba(0,0,0,0.6),0_0_40px_rgba(17,78,98,0.5),0_0_80px_rgba(71,0,0,0.3)]
      hover:scale-[1.02] hover:-translate-y-1 hover:border-[var(--hw-steel-teal)]/80"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Spotlight effect */}
      {isHovered && (
        <div
          className="absolute pointer-events-none z-30 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 150px at ${mousePosition.x}px ${mousePosition.y}px, rgba(17,78,98,0.15), transparent)`,
            inset: 0,
          }}
        />
      )}

      {/* --- CARD CONTENT IS UNCHANGED (VISUALS KEPT EXACTLY THE SAME) --- */}
      <div className="relative z-10 flex flex-col p-5 h-full">
        {/* IMAGE */}
        <div className="relative w-full h-48 mb-4 rounded-xl overflow-hidden border-2 border-[var(--hw-steel-teal)]/30 group-hover:border-[var(--hw-steel-teal)]/60 transition-all duration-500 bg-[var(--background-card)]">
          <SafeImage
            src={
              item.imageUrl ||
              item.images?.[0]?.imageUrl ||
              "/images/global/HWiconnew.png"
            }
            alt={item.title || "Marketplace Item"}
            fill
            className="object-contain transition-all duration-700 ease-out group-hover:scale-105 group-hover:brightness-110"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            priority={false}
          />
        </div>

        {/* TITLE */}
        <h3 className="text-center py-3 px-2 uppercase tracking-widest font-bold text-white text-sm md:text-base bg-gradient-to-r from-[var(--hw-steel-teal)]/80 via-[var(--hw-steel-teal)]/95 to-[var(--hw-steel-teal)]/80 border-y-2 border-[var(--hw-steel-teal)]/70 transition-all duration-500 relative overflow-hidden">
          {item.title}
        </h3>

        {/* DESCRIPTION */}
        <p className="text-[var(--text-secondary)] text-xs sm:text-sm leading-relaxed line-clamp-3 mb-4">
          {item.description || "No description available"}
        </p>

        {/* PRICE + TAGS */}
        <div className="flex items-center justify-between mb-4 mt-auto">
          {/* Category Badge */}
          {item.category && (
            <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-gradient-to-r from-[var(--hw-steel-teal)]/90 to-[var(--hw-steel-teal)]/70 text-white">
              {item.category}
            </span>
          )}

          {/* Price */}
          <div className="flex flex-col items-end">
            <p className="text-[var(--hw-steel-teal)] font-black text-xl tracking-tight">
              {item.price.toLocaleString()}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] uppercase">
              aUEC
            </p>
          </div>
        </div>

        {/* --- BUTTON LOGIC FIXED --- */}
       {contacted?.needsInvite ? (
  <button
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onContact();
    }}
    onContextMenu={(e) => e.preventDefault()}
    className="
      relative w-full py-3 
      bg-gradient-to-r from-[var(--hw-steel-teal)] to-[var(--hw-steel-teal)]/80 
      rounded-lg text-white font-bold uppercase
      cursor-pointer
    "
  >
    Contact Seller
  </button>
) : contacted?.threadUrl ? (
  <button
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onViewThread();
    }}
    className="
      relative w-full py-3 
      bg-gradient-to-r from-[var(--hw-steel-teal)]/80 to-[var(--hw-steel-teal)]/60 
      rounded-lg text-white font-bold uppercase
      cursor-pointer
    "
  >
    View Thread
  </button>
) : (
  <button
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onContact();
    }}
    className="
      relative w-full py-3 
      bg-gradient-to-r from-[var(--hw-dark-crimson)] to-[var(--hw-dark-crimson)]/70 
      rounded-lg text-white font-bold uppercase
      cursor-pointer
    "
  >
    Contact Seller
  </button>
)}


        {adminControls && <div className="mt-3">{adminControls}</div>}
      </div>
    </div>
  );
}
