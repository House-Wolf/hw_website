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
import EditListingModal from "@/app/(root)/marketplace/components/EditListingModal";
import { getWithExpiry, setWithExpiry, clearExpired } from "@/lib/localStorage";

const FALLBACK_DISCORD_INVITE = "https://discord.gg/AGDTgRSG93";
const CONTACT_TTL_MS = 1000 * 60 * 60 * 24 * 3;

type SortOption = "price-asc" | "price-desc" | "newest";

type Listing = {
  id: string;
  title: string;
  description?: string;
  price: number;
  quantity?: number;
  category: string;
  discordId?: string | null;
  imageUrl?: string;
  images?: { imageUrl: string }[];
  sellerUsername?: string | null;
  createdAt: string;
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
  const [contactedListings, setContactedListings] =
    useState<Record<string, ContactedInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showAdminControls, setShowAdminControls] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [inviteModal, setInviteModal] = useState<{
    isOpen: boolean;
    itemTitle: string;
    threadUrl?: string | null;
  }>({ isOpen: false, itemTitle: "" });

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
    const stored = getWithExpiry("contactedListings") ?? null;
    // if (stored) setContactedListings(stored);

    clearExpired();

    async function run() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory !== "All") params.append("category", selectedCategory);
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
      const oauthUrl = `/api/marketplace/oauth?item=${encodeURIComponent(itemTitle)}`;

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

      setWithExpiry("pendingMarketplaceTransaction", transactionIntent, CONTACT_TTL_MS);

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

      // ALWAYS open modal
      setInviteModal({
        isOpen: true,
        itemTitle: title,
        threadUrl: data.threadUrl,
      });

      if (!res.ok) throw new Error(data.error);

      const updated = {
        ...contactedListings,
        [listingId]: { needsInvite: true, threadUrl: data.threadUrl },
      };

      setContactedListings(updated);
      setWithExpiry("contactedListings", updated, CONTACT_TTL_MS);
    } catch (err: any) {
      alert(err.message || "Contact failed");
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
      if (!res.ok) throw new Error("Failed to delete.");

      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch {
      alert("Delete failed.");
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
        isAuthenticated={status === "authenticated"}
        onJoinDiscord={() => handleSecureRedirect(inviteModal.itemTitle)}
        onClose={() =>
          setInviteModal({ isOpen: false, itemTitle: "", threadUrl: null })
        }
      />

      <section className="max-w-360 mx-auto p-8">
        <MarketplaceHero />

        <div className="mt-8 rounded-2xl p-6 shadow-xl">
          <CategoryBar
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />

          <SearchSortBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortOption={(v: string) => setSortOption(v as SortOption)}
            showAdminControls={showAdminControls}
            setShowAdminControls={setShowAdminControls}
            isAdmin={session?.user?.permissions?.includes("MARKETPLACE_ADMIN")}
          />

         <ListingsGrid
          listings={listingsByCategory}
          contactedListings={contactedListings}
          handleContactSeller={handleContactSeller}
          adminControlsFn={item => showAdminControls ? <AdminControls item={item} onEdit={handleEditListing} onDelete={handleDeleteListing} /> : null}
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
