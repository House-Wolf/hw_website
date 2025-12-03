"use client";
import { JSX, useState, useEffect } from "react";
import ListingCard from "./ListingsCard";

interface Listing {
  id: string;
  title: string;
  price: number;
  description?: string;
  quantity?: number;
  category?: string;
  discordId?: string | null;
  sellerUsername?: string | null;
  images?: { imageUrl: string }[];
  imageUrl?: string;
}

interface ListingsGridProps {
  listings: Listing[];
  contactedListings: { [key: string]: { threadUrl?: string; inviteUrl?: string } };
  handleContactSeller: (
    listingId: string,
    discordId: string | undefined | null,
    title: string,
    price: number,
    imageUrl: string,
    sellerUsername: string
  ) => void;
  FALLBACK_DISCORD_INVITE: string;
  adminControlsFn?: (item: { id: string }) => JSX.Element | null;
}

export default function ListingsGrid({
  listings,
  contactedListings,
  handleContactSeller,
  FALLBACK_DISCORD_INVITE,
  adminControlsFn,
}: ListingsGridProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger stagger animation on mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Reset animation when listings change
  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, [listings.length]);

  return (
    <>
      {/* Empty State with Epic Design */}
      {listings.length === 0 ? (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center space-y-6 p-12 rounded-2xl
            bg-gradient-to-br from-[var(--background-elevated)]/80 to-[var(--background-card)]/60
            border border-[var(--hw-steel-teal)]/30 backdrop-blur-sm
            shadow-[0_0_60px_rgba(17,78,98,0.3)]">

            {/* Animated Icon */}
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 bg-gradient-radial from-[var(--hw-steel-teal)]/20 to-transparent
                animate-pulse rounded-full" style={{ animationDuration: "2s" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-16 h-16 text-[var(--hw-steel-teal)]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 tracking-wider">
                NO LISTINGS FOUND
              </h3>
              <p className="text-[var(--text-secondary)] text-sm">
                Try adjusting your filters or check back later for new items
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-10 perspective-1000">
          {listings.map((item, index) => (
            <div
              key={item.id}
              className={`transform transition-all duration-700 ease-out
                ${isVisible
                  ? 'translate-y-0 opacity-100 scale-100'
                  : 'translate-y-8 opacity-0 scale-95'
                }`}
              style={{
                transitionDelay: `${index * 50}ms`,
              }}
            >
              <ListingCard
                item={item}
                contacted={contactedListings[item.id]}
                onContact={() =>
                  handleContactSeller(
                    item.id,
                    item.discordId,
                    item.title,
                    item.price,
                    item.imageUrl || item.images?.[0]?.imageUrl || "",
                    item.sellerUsername || "Seller"
                  )
                }
                onViewThread={() =>
                  window.open(contactedListings[item.id].threadUrl, "_blank")
                }
                onJoinDiscord={() =>
                  window.open(
                    contactedListings[item.id].inviteUrl || FALLBACK_DISCORD_INVITE,
                    "_blank"
                  )
                }
                adminControls={adminControlsFn?.(item)}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
