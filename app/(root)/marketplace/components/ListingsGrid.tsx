"use client";

import ListingCard from "./ListingsCard";

interface Listing {
  id: string;
  title: string;
  description?: string;
  price: number;
  quantity?: number;
  category?: string;
  discordId?: string | null; // Flat structure from API
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
    discordId: string,
    title: string,
    price: number,
    imageUrl: string,
    sellerUsername: string
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
        const image =
          item.imageUrl || item.images?.[0]?.imageUrl || "/placeholder.png";
        const sellerDiscordId =
          item.discordId || "";
        const sellerName =
          item.sellerUsername || "Seller";

        return (
          <ListingCard
            key={item.id}
            item={item}
            onContact={() =>
              handleContactSeller(
                item.id,
                sellerDiscordId,
                item.title,
                item.price,
                image,
                sellerName
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
