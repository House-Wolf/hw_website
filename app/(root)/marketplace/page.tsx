"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession, signIn } from "next-auth/react";

import ListingsGrid from "@/components/marketplace/ListingsGrid";
import MarketplaceHero from "@/components/marketplace/MarketPlaceHero";
import CategoryBar from "@/components/marketplace/CategoryBar";
import SearchSortBar from "@/components/marketplace/SearchSortBar";
import Pagination from "@/components/marketplace/Pagination";
import DiscordInviteModal from "@/components/marketplace/DiscordInviteModal";
import MarketplaceLoader from "@/components/marketplace/MarketplaceLoader";
import AdminControls from "@/components/marketplace/AdminControls";
import EditListingModal from "@/components/marketplace/EditListingModal";

import { getWithExpiry, setWithExpiry, clearExpired } from "@/lib/localStorage";

const FALLBACK_DISCORD_INVITE = "https://discord.gg/AGDTgRSG93";

export default function MarketplacePage() {
  const { data: session } = useSession();

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
  };

  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("price-desc");

  const [contactedListings, setContactedListings] =
    useState<Record<string, { inviteUrl?: string; needsInvite?: boolean; threadUrl?: string; threadName?: string; }>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [showAdminControls, setShowAdminControls] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalPages, ] = useState(0);
  const [totalItems, ] = useState(0);

  // Modal
  type ModalData = {
    isOpen: boolean;
    onClose: () => void;
    inviteUrl?: string | null;
    itemTitle?: string | null;
    threadUrl?: string | null;
  };

  const [modalData, setModalData] = useState<ModalData | null>(null);

  // Categories
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


  const handleContactSeller = useCallback(
    (listingId: string, discordId: string | null | undefined, title: string, price: number, imageUrl: string, sellerUsername: string) => {
      // run async work but return void (matches ListingsGrid prop signature)
      (async () => {
        if (!session?.user) {
          return signIn("discord");
        }

        if (!discordId) {
          alert("Seller Discord ID not available");
          return;
        }

        try {
          const res = await fetch("/api/contact-seller", {
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

          if (!res.ok) {
            return alert(`Error: ${data.error ?? "Failed to contact seller"}`);
          }

          // Invite needed
          if (data.method === "invite_required") {
            const updated = {
              ...contactedListings,
              [listingId]: {
                inviteUrl: FALLBACK_DISCORD_INVITE,
                needsInvite: true,
                threadUrl: data.threadUrl,
              },
            };

            setContactedListings(updated);
            setWithExpiry("contactedListings", updated, 7 * 24 * 60 * 60 * 1000);

            setModalData({
              isOpen: true,
              onClose: () => setModalData(null),
              inviteUrl: FALLBACK_DISCORD_INVITE,
              itemTitle: title,
              threadUrl: data.threadUrl,
            });

            return;
          }

          // Thread created
          if (data.method === "thread" && data.threadUrl) {
            const updated = {
              ...contactedListings,
              [listingId]: {
                threadUrl: data.threadUrl,
                threadName: data.threadName,
              },
            };

            setContactedListings(updated);
            setWithExpiry("contactedListings", updated, 7 * 24 * 60 * 60 * 1000);

            window.open(data.threadUrl, "_blank");
            return;
          }

          // Fallback DM or channel
          alert(data.message ?? "Seller contacted.");
        } catch (err) {
          console.error("Contact seller error:", err);
          alert("Failed to contact seller. Try again later.");
        }
      })();
    },
    [session, contactedListings]
  );

  useEffect(() => {
    const loadListings = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/marketplace');
        const data = await res.json();
        setListings(data);
      } catch (err) {
        console.error("Fetch listings error:", err);
      } finally {
        setTimeout(() => {
          setIsLoading(false);
        }, 2500);
      }
    };

    loadListings();
  }, []);

  useEffect(() => {
    clearExpired();

    const stored = getWithExpiry("contactedListings") as Record<string, { inviteUrl?: string; needsInvite?: boolean; threadUrl?: string; threadName?: string; }>;
    if (stored) setContactedListings(stored);
  }, []);

  // Handle edit listing
  const handleEditListing = useCallback((listing: Listing) => {
    setEditingListing(listing);
  }, []);

  // Handle save edited listing
  const handleSaveEdit = useCallback(async (updatedData: Partial<Listing>) => {
    if (!editingListing) return;

    try {
      // Map category name to categoryId (you may need to adjust this mapping)
      const categoryMap: Record<string, number> = {
        "Weapons": 1,
        "Armor": 2,
        "Clothing": 3,
        "Components": 4,
        "Items": 5,
        "Services": 6,
        "Rentals": 7,
        "Misc": 8,
      };

      const requestBody = {
        title: updatedData.title,
        description: updatedData.description || "",
        categoryId: updatedData.category ? categoryMap[updatedData.category] : undefined,
        price: updatedData.price,
        quantity: updatedData.quantity || 1,
        imageUrl: updatedData.imageUrl,
      };

      console.log('Sending update request:', requestBody);

      const response = await fetch(`/api/marketplace/update/${editingListing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || 'Failed to update listing' };
        }
        throw new Error(error.error || 'Failed to update listing');
      }

      const responseText = await response.text();
      console.log('Success response:', responseText);

      const result = responseText ? JSON.parse(responseText) : { success: true };

      // Update local state
      setListings(prev =>
        prev.map(listing =>
          listing.id === editingListing.id
            ? { ...listing, ...updatedData }
            : listing
        )
      );

      alert('Listing updated successfully');
      setEditingListing(null);
    } catch (error) {
      console.error('Update error:', error);
      alert(error instanceof Error ? error.message : 'Failed to save changes');
      throw error; // Re-throw so modal can handle it
    }
  }, [editingListing]);

  // Handle delete listing
  const handleDeleteListing = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/marketplace/delete/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete listing');
      }

      // Remove from local state
      setListings(prev => prev.filter(listing => listing.id !== id));
      alert('Listing deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete listing');
    }
  }, []);


  const listingsByCategory = useMemo(() => {
    return listings
      .filter((item) => {
        const matchCategory =
          selectedCategory === "All" || item.category === selectedCategory;
        const matchSearch = item.title
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        return matchCategory && matchSearch;
      })
      .sort((a, b) =>
        sortOption === "price-asc" ? a.price - b.price : b.price - a.price
      );
  }, [listings, selectedCategory, searchQuery, sortOption]);

  return (
    <div className="relative min-h-screen overflow-hidden
      bg-gradient-to-b from-[var(--hw-shadow)] via-[var(--hw-obsidian)] to-[var(--hw-pure-black)]">

      {/* AMBIENT BACKGROUND EFFECTS */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Animated Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px]
          bg-gradient-radial from-[var(--hw-steel-teal)]/15 via-[var(--hw-steel-teal)]/5 to-transparent
          blur-[100px] animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px]
          bg-gradient-radial from-[var(--hw-dark-crimson)]/12 via-[var(--hw-dark-crimson)]/4 to-transparent
          blur-[100px] animate-pulse" style={{ animationDuration: "6s", animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]
          bg-gradient-radial from-[var(--hw-steel-teal)]/8 via-transparent to-transparent
          blur-[120px] animate-pulse" style={{ animationDuration: "10s", animationDelay: "4s" }} />

        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(var(--hw-steel-teal) 1px, transparent 1px),
                            linear-gradient(90deg, var(--hw-steel-teal) 1px, transparent 1px)`,
            backgroundSize: '80px 80px'
          }} />

        {/* Scanning Lines Effect */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--hw-steel-teal)] to-transparent
            animate-scan" />
        </div>

        {/* Floating Particles - Using deterministic positions */}
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => {
            // Deterministic pseudo-random values based on index
            const seed1 = (i * 7919) % 100;
            const seed2 = (i * 6151) % 100;
            const seed3 = (i * 4373) % 3;
            return (
              <div
                key={i}
                className="absolute w-1 h-1 bg-[var(--hw-steel-teal)] rounded-full opacity-20 animate-float-particle"
                style={{
                  left: `${seed1}%`,
                  top: `${seed2}%`,
                  animationDelay: `${i * 0.8}s`,
                  animationDuration: `${4 + seed3}s`
                }}
              />
            );
          })}
        </div>
      </div>

      {isLoading && <MarketplaceLoader />}

      {modalData && (
        <DiscordInviteModal
          isOpen={modalData.isOpen}
          onClose={modalData.onClose}
          inviteUrl={modalData.inviteUrl ?? FALLBACK_DISCORD_INVITE}
          itemTitle={modalData.itemTitle ?? ""}
          threadUrl={modalData.threadUrl ?? undefined}
        />
      )}

      {editingListing && (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSave={handleSaveEdit}
        />
      )}

      <section className="relative z-10 max-w-360 mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MarketplaceHero />

        {/* Main Content Container - Enhanced */}
        <div className="relative mt-8 overflow-hidden rounded-2xl
          border-2 border-[var(--hw-steel-teal)]/30
          bg-gradient-to-br from-[var(--background-elevated)]/60 to-[var(--background-card)]/40
          backdrop-blur-xl
          shadow-[0_10px_60px_rgba(17,78,98,0.3),0_0_100px_rgba(71,0,0,0.15)]">

          {/* Enhanced Ambient Effects Inside Container */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 -left-32 w-96 h-96
              bg-gradient-radial from-[var(--hw-steel-teal)]/15 via-[var(--hw-steel-teal)]/5 to-transparent
              blur-[80px] animate-pulse" style={{ animationDuration: "6s" }} />
            <div className="absolute -bottom-40 -right-32 w-[500px] h-[500px]
              bg-gradient-radial from-[var(--hw-dark-crimson)]/12 via-transparent to-transparent
              blur-[100px] animate-pulse" style={{ animationDuration: "7s", animationDelay: "2s" }} />

            {/* Top Border Accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px]
              bg-gradient-to-r from-transparent via-[var(--hw-steel-teal)] to-transparent opacity-60" />

            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-[var(--hw-steel-teal)]/40" />
            <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-[var(--hw-steel-teal)]/40" />
            <div className="absolute bottom-0 left-0 w-20 h-20 border-b-2 border-l-2 border-[var(--hw-dark-crimson)]/40" />
            <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-[var(--hw-dark-crimson)]/40" />
          </div>

          <div className="relative space-y-6 p-6 sm:p-8">
            <CategoryBar
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
              className="bg-[var(--background)]/30 border border-[var(--hw-steel-teal)]/20 rounded-xl p-4 backdrop-blur-sm"
            />

            <SearchSortBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortOption={sortOption}
              setSortOption={setSortOption}
              showAdminControls={showAdminControls}
              setShowAdminControls={setShowAdminControls}
              isAdmin={!!session?.user?.permissions?.includes("MARKETPLACE_ADMIN")}
            />

            <ListingsGrid
              listings={listingsByCategory}
              contactedListings={contactedListings}
              handleContactSeller={handleContactSeller}
              FALLBACK_DISCORD_INVITE={FALLBACK_DISCORD_INVITE}
              adminControlsFn={(item: Listing) =>
                session?.user?.permissions?.includes("MARKETPLACE_ADMIN") && showAdminControls ? (
                  <AdminControls
                    item={item}
                    onEdit={handleEditListing}
                    onDelete={handleDeleteListing}
                  />
                ) : null
              }
            />
          </div>
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
