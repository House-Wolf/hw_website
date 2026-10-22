"use client";

import ListingCard from "./ListingsCard";

interface Listing {
  id: string;
  title: string;
  description?: string;
  price: number;
  quantity?: number;
  category?: string;
  sellerUsername?: string | null; // Flat structure from API
  images?: { imageUrl: string }[];
  imageUrl?: string;
}

interface ListingsGridProps {
  listings: Listing[];
  contactedListings: Record<
    string,
    { threadUrl?: string; threadName?: string; inviteUrl?: string; needsInvite?: boolean }
  >;
  handleContactSeller: (
    listingId: string,
    title: string
  ) => void;
  adminControlsFn?: (item: Listing) => React.ReactNode;
}

export default function ListingsGrid({
  listings,
  contactedListings,
  handleContactSeller,
  adminControlsFn,
}: ListingsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings.map((item) => {
        return (
          <ListingCard
            key={item.id}
            item={item}
            onContact={() =>
              handleContactSeller(
                item.id,
                item.title
              )
            }
            onViewThread={() => {
              const url = contactedListings[item.id]?.threadUrl;
              if (url) window.open(url, "_blank");
            }}
            adminControls={adminControlsFn ? <>{adminControlsFn(item)}</> : null}
          />
        );
      })}
    </div>
  );
}
