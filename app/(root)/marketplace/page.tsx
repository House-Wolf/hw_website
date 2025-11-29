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
    <>
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

      <section className="relative z-10 max-w-360 mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MarketplaceHero />

        <CategoryBar
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
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
          adminControlsFn={(item: { id: string }) =>
            session?.user?.permissions?.includes("MARKETPLACE_ADMIN") && showAdminControls ? (
              <AdminControls item={item} onEdit={(l: { id: string }) => console.log("edit", l)} onDelete={() => Promise.resolve(console.log("delete", item.id))} />
            ) : null
          }
        />

        <Pagination
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          totalItems={totalItems}
        />
      </section>
    </>
  );
}
