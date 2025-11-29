"use client";
import { JSX } from "react";
import { SafeImage } from "../utils/SafeImage";

interface ListingCardProps {
  item: {
    title: string;
    description?: string;
    price: number;
    quantity?: number;
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

/**
 * @component ListingCard - A card component to display marketplace listing details.
 * @description This component displays the details of a marketplace listing including the item image, title, description, price, and action buttons.
 * It also shows the seller's online status and provides admin controls if applicable.
 * @param param0 - The props for the ListingCard component.
 * @param param0.item - The item details including title, description, price, quantity, and imageUrl.
 * @param param0.sellerStatus - The online status of the seller.
 * @param param0.contacted - Information about whether the user has contacted the seller.
 * @param param0.onContact - Function to call when the "Contact Seller" button is clicked.
 * @param param0.onViewThread - Function to call when the "View Thread" button is clicked.
 * @param param0.onJoinDiscord - Function to call when the "Join Discord" button is clicked.
 * @param param0.adminControls - Optional admin control buttons to display.
 * @author House Wolf Dev Team
 * @returns 
 */

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
      className="relative bg-[#111]/70 backdrop-blur-sm border border-gray-700 rounded-2xl 
       overflow-hidden shadow-lg transition-all duration-300 
       hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] group"
    >

      {/* Card Frame Background */}
      <SafeImage
        src="/images/marketplace/card-frame.png"
        alt="Card frame"
        fill
        className="object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex flex-col p-4 h-full">

        {/* Item Image */}
        <div className="relative w-full h-40 rounded-md overflow-hidden bg-gray-900 mb-4">
          <SafeImage
            src={item.imageUrl || item.images?.[0]?.imageUrl || "/images/placeholder.svg"}
            alt={item.title}
            fill
            className="object-cover rounded-md transition-all duration-500
              group-hover:scale-[1.03] group-hover:shadow-[0_0_20px_rgba(17,78,98,0.5)]"
          />
        </div>

        {/* Title */}
        <h3 className="bg-indigo-700/80 rounded-md text-center py-2 mb-3 border border-indigo-500/40 
          text-sm md:text-base font-bold text-white uppercase tracking-wide shadow-inner">
          {item.title}
        </h3>

        {/* Description */}
        <p className="text-gray-300 text-xs sm:text-sm leading-relaxed line-clamp-3 mb-4">
          {item.description}
        </p>

        {/* Price */}
        <div className="text-right mb-4">
          <p className="text-indigo-300 font-bold text-lg">
            {item.price.toLocaleString()} aUEC
          </p>
          {item.quantity && item.quantity > 1 && (
            <p className="text-gray-400 text-xs">Qty: {item.quantity}</p>
          )}
        </div>

        {/* Buttons */}
        {contacted?.needsInvite ? (
          <button
            onClick={onJoinDiscord}
            className="w-full py-2 bg-amber-500 hover:bg-amber-600 rounded-md text-white"
          >
            🔗 Join Discord
          </button>
        ) : contacted?.threadUrl ? (
          <button
            onClick={onViewThread}
            className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-md text-white"
          >
            💬 View Thread
          </button>
        ) : (
          <button
            onClick={onContact}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white"
          >
            💬 Contact Seller
          </button>
        )}

        {/* Admin Buttons */}
        {adminControls && <div className="mt-3">{adminControls}</div>}
      </div>
    </div>
  );
}
