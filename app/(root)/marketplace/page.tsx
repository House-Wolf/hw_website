"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import ListingsGrid from "@/app/(root)/marketplace/components/ListingsGrid";
import MarketplaceHero from "@/app/(root)/marketplace/components/MarketPlaceHero";
import CategoryBar from "@/app/(root)/marketplace/components/CategoryBar";
import SearchSortBar from "@/app/(root)/marketplace/components/SearchSortBar";
import Pagination from "@/app/(root)/marketplace/components/Pagination";
import DiscordInviteModal from "@/app/(root)/marketplace/components/DiscordInviteModal";
import MarketplaceLoader from "@/app/(root)/marketplace/components/MarketplaceLoader";
import AdminControls from "@/app/(root)/marketplace/components/AdminControls";
import { setWithExpiry, clearExpired } from "@/lib/localStorage";

const FALLBACK_DISCORD_INVITE =
  process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || "https://discord.gg/AGDTgRSG93";
const CONTACT_TTL_MS = 1000 * 60 * 60 * 24 * 3;

type SortOption = "price-asc" | "price-desc" | "newest";

type Listing = {
  id: string;
  title: string;
  price: number;
  category: string;
  createdAt: string;
  discordId?: string | null;
  imageUrl?: string;
  images?: { imageUrl: string }[];
  sellerUsername?: string | null;
};

type ContactedInfo = {
  needsInvite?: boolean;
  threadUrl?: string;
  threadName?: string;
};




export default function MarketplacePage() {
  const { data: session, status } = useSession();
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("price-asc");
  const [contactedListings, setContactedListings] = useState<
    Record<string, ContactedInfo>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [showAdminControls, setShowAdminControls] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [inviteModal, setInviteModal] = useState<{
    isOpen: boolean;
    itemTitle: string;
    threadUrl?: string | null;
  }>({ isOpen: false, itemTitle: "" });

  const [error, setError] = useState<string | null>(null);

  const categories = [
    "All",
    "Weapons",
    "Armor",
    "Clothing",
    "Components",
    "Items",
    "Services",
    "Rentals",
    "Misc",
  ];

  // -------------------------------------------------------------
  // FETCH LISTINGS
  // -------------------------------------------------------------
  useEffect(() => {
    clearExpired();

    async function run() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory !== "All")
          params.append("category", selectedCategory);
        if (searchQuery) params.append("search", searchQuery);

        params.append("sort", sortOption);
        params.append("page", String(currentPage));
        params.append("limit", String(itemsPerPage));

        const res = await fetch(`/api/marketplace/listings?${params}`);
        const data = await res.json();

        setListings(data.listings ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotalItems(data.totalItems ?? 0);
      } catch (err) {
        console.error("Failed to load listings:", err);
        setListings([]);
      } finally {
        setIsLoading(false);
      }
    }

    run();
  }, [selectedCategory, searchQuery, sortOption, currentPage, itemsPerPage]);

  // -------------------------------------------------------------
  // SECURE REDIRECT - OAuth2 Flow
  // -------------------------------------------------------------
  const handleSecureRedirect = async (title?: string) => {
    try {
      const itemTitle = title ?? inviteModal.itemTitle;

      // Redirect to OAuth2 flow which will add user to server with Buyer role
      // This bypasses Discord onboarding since the role is assigned immediately
      const oauthUrl = `/api/marketplace/oauth?item=${encodeURIComponent(
        itemTitle
      )}`;

      console.log("🔐 Initiating OAuth2 flow for:", itemTitle);
      window.location.href = oauthUrl; // Use location.href instead of window.open for OAuth2
    } catch (e) {
      console.error("OAuth2 redirect failed:", e);
      window.open(FALLBACK_DISCORD_INVITE, "_blank");
    }
  };

  // -------------------------------------------------------------
  // CONTACT SELLER — Updated to handle unauthenticated users
  // -------------------------------------------------------------
  async function handleContactSeller(
    listingId: string,
    discordId: string | null | undefined,
    title: string,
    price: number,
    imageUrl: string,
    sellerUsername: string
  ) {
    // For unauthenticated users: show modal first, store context
    if (status === "unauthenticated" || !session?.user) {
      // Store the listing context for post-auth processing
      const transactionIntent = {
        listingId,
        sellerDiscordId: discordId,
        itemTitle: title,
        itemPrice: price,
        itemImageUrl: imageUrl,
        sellerUsername,
        timestamp: Date.now(),
      };

      setWithExpiry(
        "pendingMarketplaceTransaction",
        transactionIntent,
        CONTACT_TTL_MS
      );

      // Show modal immediately
      setInviteModal({
        isOpen: true,
        itemTitle: title,
        threadUrl: null,
      });
      return;
    }

    // For authenticated users: create thread first, then show modal
    try {
      const res = await fetch("/api/marketplace/contact-seller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerDiscordId: discordId,
          itemTitle: title,
          itemPrice: price,
          itemImageUrl: imageUrl,
          sellerUsername,
        }),
      });

      const data = await res.json();

      // Check response status BEFORE opening modal
      if (!res.ok) throw new Error(data.error || "Failed to contact seller");

      // Only open modal on success
      setInviteModal({
        isOpen: true,
        itemTitle: title,
        threadUrl: data.threadUrl,
      });

      const updated = {
        ...contactedListings,
        [listingId]: { needsInvite: true, threadUrl: data.threadUrl },
      };

      setContactedListings(updated);
      setWithExpiry("contactedListings", updated, CONTACT_TTL_MS);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to contact seller";
      setError(message);
      setTimeout(() => setError(null), 5000); // Clear after 5 seconds
    }
  }

  // -------------------------------------------------------------
  // ADMIN HANDLERS
  // -------------------------------------------------------------
  const handleEditListing = useCallback((listing: Listing) => {
    setEditingListing(listing);
  }, []);

  const handleDeleteListing = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/marketplace/delete/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete listing");

      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete listing";
      setError(message);
      setTimeout(() => setError(null), 5000); // Clear after 5 seconds
    }
  }, []);

  const listingsByCategory = listings;

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  return (
    <div className="relative min-h-screen">
      {isLoading && <MarketplaceLoader />}

      <DiscordInviteModal
        isOpen={inviteModal.isOpen}
        itemTitle={inviteModal.itemTitle}
        threadUrl={inviteModal.threadUrl ?? undefined}
        onJoinDiscord={() => handleSecureRedirect(inviteModal.itemTitle)}
        onClose={() =>
          setInviteModal({ isOpen: false, itemTitle: "", threadUrl: null })
        }
      />

      <section className="max-w-360 mx-auto p-8">
        <MarketplaceHero />

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-900/20 border border-red-500/50 text-red-200 flex items-start gap-3">
            <svg
              className="w-5 h-5 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-200 hover:text-white transition"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}

        <div className="mt-8 rounded-2xl p-6 shadow-xl">
          <CategoryBar
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />

          <SearchSortBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortOption={sortOption}
            setSortOption={(v) => setSortOption(v as SortOption)}
            showAdminControls={showAdminControls}
            setShowAdminControls={setShowAdminControls}
            isAdmin={session?.user?.permissions?.includes("MARKETPLACE_ADMIN")}
          />

          <ListingsGrid
            listings={listingsByCategory}
            contactedListings={contactedListings}
            handleContactSeller={handleContactSeller}
            adminControlsFn={(item) =>
              showAdminControls ? (
                <AdminControls
                  item={item}
                  onEdit={(item) =>
                    handleEditListing({
                      id: item.id,
                      title: item.title,
                      price: 0, // Provide default or placeholder values
                      category: "",
                      createdAt: "",
                    })
                  }
                  onDelete={handleDeleteListing}
                />
              ) : null
            }
          />
        </div>

        <Pagination
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          totalItems={totalItems}
        />
      </section>
    </div>
  );
}
