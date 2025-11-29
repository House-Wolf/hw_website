"use client";
import { JSX } from "react";
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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {listings.map((item) => (
        <ListingCard
          key={item.id}
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
      ))}
    </div>
  );
}
