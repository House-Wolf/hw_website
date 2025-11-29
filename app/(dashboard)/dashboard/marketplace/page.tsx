"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { AlertCircle, Store } from "lucide-react";
import Link from "next/link";

// Utility imports
import {
  determineCategoryFromName,
  getCategoryIdByName,
} from "@/lib/marketplace/categories";
import {
  calculateRarityScore,
  calculateSRP,
  FBV_BY_ITEM_TYPE,
  getRarityCoefficient,
  getSrpItemTypeFromCategory,
  MAX_RARITY_SCORE,
  SRP_MARKUP,
  type SrpItemType,
  type SrpCalculatorValues,
  CONDITION_OPTIONS,
  GUN_OPTIONS,
  ARMOR_OPTIONS,
  SIZE_OPTIONS,
  SHIP_WEAPON_OPTIONS,
  COMPONENT_OPTIONS,
} from "@/lib/marketplace/srp";
import { searchWiki, isValidImageUrl, type WikiItem } from "@/lib/marketplace/wiki";
import { PERMISSIONS } from "@/lib/permissions";

type Listing = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  category: string;
  categoryId: number;
  price: number;
  quantity: number;
  location?: string;
  status?: string;
  createdAt?: string;
};

type FormData = {
  title: string;
  description: string;
  imageUrl: string;
  categoryId: string;
  price: string;
  quantity: string;
  location: string;
};

type Category = {
  id: number;
  name: string;
  slug: string;
};

function MarketplaceDashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create");
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wikiLoading, setWikiLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [wikiData, setWikiData] = useState<WikiItem | null>(null);
  const [categoryAutoSet, setCategoryAutoSet] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionChecked, setSuspensionChecked] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const isMarketplaceAdmin = session?.user?.permissions?.includes(PERMISSIONS.MARKETPLACE_ADMIN);

  // SRP Calculator State
  const [showSrpHelper, setShowSrpHelper] = useState(false);
  const [srpItemType, setSrpItemType] = useState<SrpItemType>("Armor");
  const [srpRarityScore, setSrpRarityScore] = useState("");
  const [showSrpCalculator, setShowSrpCalculator] = useState(false);
  const [srpCalculatorValues, setSrpCalculatorValues] = useState<SrpCalculatorValues>({
    condition: CONDITION_OPTIONS[0].value,
    gun: GUN_OPTIONS[0].value,
    armor: ARMOR_OPTIONS[0].value,
    size: SIZE_OPTIONS[0].value,
    shipWeapon: SHIP_WEAPON_OPTIONS[0].value,
    component: COMPONENT_OPTIONS[0].value,
  });

  const initialFormData: FormData = {
    title: "",
    description: "",
    imageUrl: "",
    categoryId: "",
    price: "",
    quantity: "1",
    location: "",
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  // SRP Calculations
  const srpBaseValue = FBV_BY_ITEM_TYPE[srpItemType];
  const parsedRarityScore = parseFloat(srpRarityScore);
  const rarityScoreNumber = Number.isNaN(parsedRarityScore) ? null : parsedRarityScore;
  const normalizedRarityScore =
    rarityScoreNumber !== null
      ? Math.min(Math.max(rarityScoreNumber, 0), MAX_RARITY_SCORE)
      : null;
  const srpRarityScoreWasClamped =
    rarityScoreNumber !== null &&
    (rarityScoreNumber < 0 || rarityScoreNumber > MAX_RARITY_SCORE);
  const srpRarityCoefficient =
    normalizedRarityScore !== null ? getRarityCoefficient(normalizedRarityScore) : null;
  const suggestedRetailPrice =
    normalizedRarityScore !== null ? calculateSRP(srpItemType, normalizedRarityScore) : null;
  const calculatorRarityScore = calculateRarityScore(srpItemType, srpCalculatorValues);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/marketplace/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
          if (data.length > 0 && !formData.categoryId) {
            setFormData((prev) => ({ ...prev, categoryId: data[0].id.toString() }));
          }
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // Wiki search function
  const handleWikiSearch = async () => {
    if (!formData.title.trim()) {
      alert("Please enter a title first");
      return;
    }

    try {
      setWikiLoading(true);
      const result = await searchWiki(formData.title);

      if (!result) {
        alert("No wiki match found for this title");
        setWikiData(null);
        return;
      }

      setWikiData(result);

      // Auto-determine category from item name
      const suggestedCategory = determineCategoryFromName(result.name);
      const suggestedCategoryId = getCategoryIdByName(categories, suggestedCategory);

      console.log(`Auto-detected category: ${suggestedCategory}`);

      // Auto-fill description, image, and category if empty
      setFormData((prev) => ({
        ...prev,
        description: prev.description || result.description || "",
        imageUrl: prev.imageUrl || result.image || "",
        categoryId: suggestedCategoryId
          ? suggestedCategoryId.toString()
          : prev.categoryId,
      }));

      setCategoryAutoSet(!!suggestedCategoryId);
    } catch (err) {
      console.error("Wiki fetch failed:", err);
      setWikiData(null);
      alert("Failed to fetch wiki data. Please try again.");
    } finally {
      setWikiLoading(false);
    }
  };

  // Clear form function
  const handleClearForm = () => {
    setFormData(initialFormData);
    setWikiData(null);
    setCategoryAutoSet(false);
    setMessage(null);
  };

  // Fetch user's listings
  useEffect(() => {
    if (activeTab === "manage") {
      fetchMyListings();
    }
  }, [activeTab]);

  // Keep SRP item type aligned with selected category
  useEffect(() => {
    const selectedCategory = categories.find(
      (cat) => cat.id.toString() === formData.categoryId
    );
    if (selectedCategory) {
      const mappedType = getSrpItemTypeFromCategory(selectedCategory.name);
      if (mappedType && mappedType !== srpItemType) {
        setSrpItemType(mappedType);
      }
    }
  }, [formData.categoryId, categories, srpItemType]);

  // Check suspension status
  useEffect(() => {
    const checkSuspension = async () => {
      if (!session?.user) {
        setSuspensionChecked(true);
        return;
      }

      try {
        const res = await fetch(`/api/user/suspension-status`);
        if (res.ok) {
          const data = await res.json();
          setIsSuspended(data.isSuspended);
          setSuspensionChecked(true);

          if (data.isSuspended) {
            router.push("/dashboard");
          }
        } else {
          // API endpoint doesn't exist yet or error - assume not suspended
          setIsSuspended(false);
          setSuspensionChecked(true);
        }
      } catch (error) {
        console.error("Error checking suspension:", error);
        // On error, assume not suspended to allow access
        setIsSuspended(false);
        setSuspensionChecked(true);
      }
    };

    if (session) {
      checkSuspension();
    } else {
      setSuspensionChecked(true);
    }
  }, [session, router]);

  // Handle edit query parameter from marketplace (admin quick edit)
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && session?.user && isMarketplaceAdmin) {
      loadListingForEdit(editId);
    }
  }, [searchParams, session, isMarketplaceAdmin]);

  const loadListingForEdit = async (listingId: string) => {
    try {
      const res = await fetch(`/api/marketplace/listing/${listingId}`);
      if (res.ok) {
        const data = await res.json();
        const listing = data.listing;

        setEditingId(listingId);
        setFormData({
          title: listing.title,
          description: listing.description || "",
          imageUrl: listing.imageUrl || "",
          categoryId: listing.categoryId.toString(),
          price: listing.price.toString(),
          quantity: listing.quantity?.toString() || "1",
          location: listing.location || "",
        });
        setActiveTab("create");

        router.replace("/dashboard/marketplace");
      }
    } catch (error) {
      console.error("Error loading listing for edit:", error);
      showMessage("error", "Failed to load listing for editing");
    }
  };

  const fetchMyListings = async () => {
    try {
      const res = await fetch("/api/marketplace/my-listings");
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const text = await res.text();
      if (!text) throw new Error("Empty response from server");
      const data = JSON.parse(text);
      setMyListings(data.listings || []);
    } catch (err: any) {
      console.error("Error fetching listings:", err);
      showMessage("error", "Failed to load your listings");
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const updateCalculatorValue = (key: keyof SrpCalculatorValues, value: number) => {
    setSrpCalculatorValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const applySuggestedPrice = () => {
    if (!suggestedRetailPrice) return;
    setFormData((prev) => ({
      ...prev,
      price: suggestedRetailPrice.toString(),
    }));
    showMessage(
      "success",
      `Applied SRP of ${suggestedRetailPrice.toLocaleString()} aUEC`
    );
  };

  const applyCalculatedRarityScore = () => {
    if (calculatorRarityScore === null) return;
    const boundedScore = Math.min(Math.max(calculatorRarityScore, 0), MAX_RARITY_SCORE);
    setSrpRarityScore(boundedScore.toString());
    showMessage("success", `Applied RS ${boundedScore} from cheat sheet`);
  };

  // Submit / Update listing
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Show confirmation if category was auto-set
    if (categoryAutoSet && !editingId) {
      const selectedCategory = categories.find(
        (cat) => cat.id.toString() === formData.categoryId
      );
      const confirmed = window.confirm(
        `Category Check\n\nThe category has been automatically set to "${selectedCategory?.name || "Unknown"}" based on the item name.\n\nPlease verify this is correct before submitting.\n\nClick OK to continue or Cancel to review.`
      );
      if (!confirmed) {
        return;
      }
    }

    setLoading(true);

    try {
      const url = editingId
        ? `/api/marketplace/update/${editingId}`
        : "/api/marketplace/create";

      let res;

      if (editingId) {
        // UPDATE: Use PUT with JSON
        res = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            price: formData.price,
            quantity: formData.quantity,
            categoryId: formData.categoryId,
            imageUrl: formData.imageUrl,
            location: formData.location,
          }),
        });
      } else {
        // CREATE: Use POST with FormData
        const body = new FormData();
        body.append("title", formData.title);
        body.append("description", formData.description);
        body.append("price", formData.price);
        body.append("quantity", formData.quantity);
        body.append("categoryId", formData.categoryId);

        if (formData.imageUrl) {
          body.append("imageUrl", formData.imageUrl);
        }
        if (formData.location) {
          body.append("location", formData.location);
        }

        res = await fetch(url, {
          method: "POST",
          body,
        });
      }

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = "Failed to save listing";
        try {
          const data = JSON.parse(text);
          errorMsg = data.error || errorMsg;
        } catch {
          errorMsg = text || errorMsg;
        }
        throw new Error(errorMsg);
      }

      showMessage("success", editingId ? "Listing updated!" : "Listing created!");
      setFormData(initialFormData);
      setEditingId(null);
      setWikiData(null);
      setCategoryAutoSet(false);

      if (activeTab === "manage") fetchMyListings();
    } catch (err: any) {
      showMessage("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (listing: Listing) => {
    setFormData({
      title: listing.title,
      description: listing.description,
      imageUrl: listing.imageUrl || "",
      categoryId: listing.categoryId.toString(),
      price: listing.price.toString(),
      quantity: listing.quantity?.toString() || "1",
      location: listing.location || "",
    });
    setEditingId(listing.id);
    setActiveTab("create");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/marketplace/delete/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete listing");
      showMessage("success", "Listing deleted!");
      fetchMyListings();
    } catch (err: any) {
      showMessage("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setWikiData(null);
    setCategoryAutoSet(false);
  };

  // Conditional returns AFTER all hooks
  if (status === "loading" || !suspensionChecked) {
    return <p className="text-[var(--foreground-muted)]">Loading...</p>;
  }

  if (!session) {
    router.push("/dashboard");
    return null;
  }

  if (isSuspended) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertCircle className="text-red-500 mb-4" size={64} />
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
          Access Restricted
        </h1>
        <p className="text-[var(--foreground-muted)]">
          Your marketplace privileges have been suspended. Check your settings for details.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card border border-[var(--border-soft)] bg-[var(--background-secondary)]/70">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-[var(--accent-strong)]/15 border border-[var(--border)] flex items-center justify-center">
            <Store className="text-[var(--accent-strong)]" size={20} />
          </div>
          <div>
            <Link
              href="/marketplace"
              className="text-2xl font-bold text-[var(--foreground)] hover:text-[var(--accent-strong)] transition-colors leading-tight"
            >
              Marketplace Management
            </Link>
            <p className="text-sm text-[var(--foreground-muted)]">
              Create and manage your listings
            </p>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            message.type === "success"
              ? "bg-green-900/20 border-green-700 text-green-300"
              : "bg-red-900/20 border-red-700 text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[var(--border-soft)]">
        <button
          onClick={() => setActiveTab("create")}
          className={`px-6 py-3 font-semibold transition-all relative ${
            activeTab === "create"
              ? "text-[var(--accent-strong)]"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {editingId ? "Edit Listing" : "Create Listing"}
          {activeTab === "create" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--accent-strong)] to-transparent" />
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab("manage");
            cancelEdit();
          }}
          className={`px-6 py-3 font-semibold transition-all relative ${
            activeTab === "manage"
              ? "text-[var(--accent-strong)]"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          }`}
        >
          My Listings
          {activeTab === "manage" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--accent-strong)] to-transparent" />
          )}
        </button>
      </div>

      {/* Create/Edit Form */}
      {activeTab === "create" && (
        <div className="card border border-[var(--border-soft)] bg-[var(--background-secondary)]/70">
          {editingId && (
            <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg flex justify-between items-center">
              <span className="text-blue-300">Editing listing</span>
              <button
                onClick={cancelEdit}
                className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title with Wiki Search Button */}
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                Title *{" "}
                {wikiData && (
                  <span className="text-green-500 text-xs">Wiki matched</span>
                )}
              </label>
              <div className="flex gap-2 items-start">
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!wikiLoading && formData.title.trim()) {
                        handleWikiSearch();
                      }
                    }
                  }}
                  className="flex-1 bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                  placeholder="e.g., FS-9 LMG"
                />
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleWikiSearch}
                    disabled={wikiLoading || !formData.title.trim()}
                    className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
                  >
                    {wikiLoading ? "Searching..." : "Search Wiki"}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Clear Form
                  </button>
                </div>
              </div>
              {wikiLoading && (
                <p className="text-xs text-indigo-400 mt-1 animate-pulse">
                  Fetching wiki info from StarCitizen.tools...
                </p>
              )}
            </div>

            {/* Category, Price & Quantity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                  Price (aUEC) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                  placeholder="50000"
                />

                {/* SRP CALCULATOR - ADMIN ONLY */}
                {isMarketplaceAdmin && (
                  <div className="mt-4 border border-[var(--border)] bg-[var(--background-secondary)] rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          Suggested Retail Price (SRP)
                        </p>
                        <p className="text-xs text-[var(--foreground-muted)]">
                          FBV × RC × (1 + 0.35). Pulled from HouseWolf SRP V3.0 & internal FBV
                          floors.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSrpHelper((prev) => !prev)}
                        className="text-xs font-semibold text-[var(--accent-strong)] hover:text-[var(--accent-strong)]/80 transition-colors"
                      >
                        {showSrpHelper ? "Hide tool" : "Show tool"}
                      </button>
                    </div>

                    {showSrpHelper && (
                      <div className="mt-4 space-y-4 text-sm">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                            Item type / FBV floor
                          </label>
                          <select
                            value={srpItemType}
                            onChange={(e) =>
                              setSrpItemType(e.target.value as SrpItemType)
                            }
                            className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                          >
                            {(
                              Object.entries(FBV_BY_ITEM_TYPE) as [
                                SrpItemType,
                                number
                              ][]
                            ).map(([type, value]) => (
                              <option key={type} value={type}>
                                {type} • {value.toLocaleString()} aUEC FBV
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-[var(--foreground-muted)] mt-1">
                            FBV anchors your floor ({srpBaseValue.toLocaleString()}{" "}
                            aUEC for {srpItemType}).
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                            Rarity Score (RS 0‒{MAX_RARITY_SCORE})
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={MAX_RARITY_SCORE}
                            step="1"
                            value={srpRarityScore}
                            onChange={(e) => setSrpRarityScore(e.target.value)}
                            className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                            placeholder="Condition + category ranks"
                          />
                          <p className="text-xs text-[var(--foreground-muted)] mt-1">
                            Use the tables in Formula.md to sum Condition + Item ranks
                            (each point adds 9% RC).
                          </p>
                          {srpRarityScoreWasClamped && (
                            <p className="text-xs text-amber-400 mt-1">
                              RS is capped at {MAX_RARITY_SCORE}; values beyond that
                              are normalized to keep RC ≤ 2.35.
                            </p>
                          )}
                        </div>

                        <div className="pt-4 border-t border-[var(--border)]">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-[var(--foreground)]">
                                Need help calculating RS?
                              </p>
                              <p className="text-xs text-[var(--foreground-muted)]">
                                Use the cheat sheet to mix condition + category ranks.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowSrpCalculator((prev) => !prev)}
                              className="text-xs font-semibold text-[var(--accent-strong)] hover:text-[var(--accent-strong)]/80 transition-colors"
                            >
                              {showSrpCalculator
                                ? "Hide cheat sheet"
                                : "Show cheat sheet"}
                            </button>
                          </div>

                          {showSrpCalculator && (
                            <div className="mt-4 space-y-4">
                              <div className="text-xs text-[var(--foreground-muted)]">
                                <p>
                                  RS = Condition + category ranks (Guns: G1‒G10,
                                  Armor: A1‒A5, Components/Ship Weapons: Size +
                                  Comp/Weapon rank).
                                </p>
                                <p className="mt-1">
                                  Every point bumps RC by 9% before the 35% markup
                                  hits the SRP.
                                </p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                                    Condition (C1‒C4)
                                  </label>
                                  <select
                                    value={srpCalculatorValues.condition}
                                    onChange={(e) =>
                                      updateCalculatorValue(
                                        "condition",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                  >
                                    {CONDITION_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label} (+{opt.value})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {srpItemType === "Guns" && (
                                  <div>
                                    <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                                      Weapon Rank (G1‒G10)
                                    </label>
                                    <select
                                      value={srpCalculatorValues.gun}
                                      onChange={(e) =>
                                        updateCalculatorValue(
                                          "gun",
                                          Number(e.target.value)
                                        )
                                      }
                                      className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                    >
                                      {GUN_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label} (+{opt.value})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {srpItemType === "Armor" && (
                                  <div>
                                    <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                                      Armor Rank (A1‒A5)
                                    </label>
                                    <select
                                      value={srpCalculatorValues.armor}
                                      onChange={(e) =>
                                        updateCalculatorValue(
                                          "armor",
                                          Number(e.target.value)
                                        )
                                      }
                                      className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                    >
                                      {ARMOR_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label} (+{opt.value})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {(srpItemType === "Components" ||
                                  srpItemType === "Ship Weapons") && (
                                  <div>
                                    <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                                      Size (S1‒S6)
                                    </label>
                                    <select
                                      value={srpCalculatorValues.size}
                                      onChange={(e) =>
                                        updateCalculatorValue(
                                          "size",
                                          Number(e.target.value)
                                        )
                                      }
                                      className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                    >
                                      {SIZE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label} (+{opt.value})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {srpItemType === "Ship Weapons" && (
                                  <div>
                                    <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                                      Weapon Type (W1‒W6)
                                    </label>
                                    <select
                                      value={srpCalculatorValues.shipWeapon}
                                      onChange={(e) =>
                                        updateCalculatorValue(
                                          "shipWeapon",
                                          Number(e.target.value)
                                        )
                                      }
                                      className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                    >
                                      {SHIP_WEAPON_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label} (+{opt.value})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {srpItemType === "Components" && (
                                  <div>
                                    <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                                      Component Type (Comp1‒Comp4)
                                    </label>
                                    <select
                                      value={srpCalculatorValues.component}
                                      onChange={(e) =>
                                        updateCalculatorValue(
                                          "component",
                                          Number(e.target.value)
                                        )
                                      }
                                      className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                    >
                                      {COMPONENT_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label} (+{opt.value})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>

                              <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg p-4 text-sm space-y-2">
                                <p className="text-[var(--foreground-muted)]">
                                  RS Preview:{" "}
                                  <span className="text-[var(--foreground)] font-semibold">
                                    {calculatorRarityScore !== null
                                      ? calculatorRarityScore
                                      : "--"}
                                  </span>
                                </p>
                                <p className="text-xs text-[var(--foreground-muted)]">
                                  This will be clamped between 0 and{" "}
                                  {MAX_RARITY_SCORE} before applying the RC formula.
                                </p>
                                {calculatorRarityScore !== null && (
                                  <button
                                    type="button"
                                    onClick={applyCalculatedRarityScore}
                                    className="w-full py-2 bg-[var(--background-secondary)] hover:bg-[var(--background-secondary)]/80 text-[var(--foreground)] rounded-lg font-semibold transition-colors border border-[var(--border)]"
                                  >
                                    Use RS{" "}
                                    {Math.min(
                                      Math.max(calculatorRarityScore, 0),
                                      MAX_RARITY_SCORE
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg p-4 space-y-2">
                          <p className="text-xs text-[var(--foreground-muted)]">
                            RC = 1 + (RS × 0.09):{" "}
                            <span className="text-[var(--foreground)] font-semibold">
                              {srpRarityCoefficient
                                ? srpRarityCoefficient.toFixed(2)
                                : "--"}
                            </span>
                          </p>
                          <p className="text-lg font-semibold text-[var(--accent-strong)]">
                            Suggested price:{" "}
                            {suggestedRetailPrice
                              ? `${suggestedRetailPrice.toLocaleString()} aUEC`
                              : "--"}
                          </p>
                          <p className="text-xs text-[var(--foreground-muted)]">
                            Includes the standard 35% markup favored for HouseWolf
                            drops & limited gear.
                          </p>
                          {suggestedRetailPrice && (
                            <button
                              type="button"
                              onClick={applySuggestedPrice}
                              className="mt-2 w-full py-2 bg-[var(--accent-strong)]/80 hover:bg-[var(--accent-strong)] text-white rounded-lg font-semibold transition-colors"
                            >
                              Use {suggestedRetailPrice.toLocaleString()} aUEC
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                  placeholder="1"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                Location (Optional)
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                placeholder="e.g., Area 18, Port Olisar"
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                Image URL{" "}
                {wikiData?.image && (
                  <span className="text-green-500 text-xs">
                    Auto-filled from wiki
                  </span>
                )}
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) =>
                  setFormData({ ...formData, imageUrl: e.target.value })
                }
                className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                placeholder="https://example.com/image.jpg"
              />
              {formData.imageUrl && isValidImageUrl(formData.imageUrl) && (
                <div className="mt-4 relative w-48 h-48 rounded-lg overflow-hidden border border-[var(--border)]">
                  <Image
                    src={formData.imageUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                    unoptimized
                    onError={(e) => {
                      console.error("Image failed to load:", formData.imageUrl);
                    }}
                  />
                </div>
              )}
              {formData.imageUrl && !isValidImageUrl(formData.imageUrl) && (
                <p className="text-xs text-red-400 mt-1">
                  Invalid image URL. Please enter a valid HTTP/HTTPS URL.
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                Description *{" "}
                {wikiData && (
                  <span className="text-green-500 text-xs">
                    Auto-filled from wiki
                  </span>
                )}
              </label>
              <textarea
                required
                rows={5}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all resize-none"
                placeholder="Describe your item in detail..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[var(--accent-strong)] hover:bg-[var(--accent-strong)]/90 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Saving..."
                : editingId
                ? "Update Listing"
                : "Create Listing"}
            </button>
          </form>

          {/* Wiki Preview */}
          {wikiData && (
            <div className="mt-8 p-6 bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl">
              <h3 className="text-lg font-semibold text-[var(--accent-strong)] mb-4">
                Wiki Preview: {wikiData.name}
              </h3>
              {wikiData.image && isValidImageUrl(wikiData.image) && (
                <div className="relative w-48 h-48 mb-4 rounded-lg overflow-hidden border border-[var(--border)]">
                  <Image
                    src={wikiData.image}
                    alt="Wiki Image"
                    fill
                    className="object-cover"
                    unoptimized
                    onError={(e) => {
                      console.error("Wiki image failed to load:", wikiData.image);
                    }}
                  />
                </div>
              )}
              <p className="text-[var(--foreground-muted)] text-sm mb-3">
                {wikiData.description}
              </p>
              <a
                href={
                  wikiData.wikiUrl ||
                  `https://starcitizen.tools/${encodeURIComponent(wikiData.name)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-strong)] hover:text-[var(--accent-strong)]/80 text-sm"
              >
                View on StarCitizen.tools ↗
              </a>
            </div>
          )}
        </div>
      )}

      {/* Manage Listings */}
      {activeTab === "manage" && (
        <div className="card border border-[var(--border-soft)] bg-[var(--background-secondary)]/70">
          {myListings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--foreground-muted)] text-lg mb-4">
                You haven't created any listings yet
              </p>
              <button
                onClick={() => setActiveTab("create")}
                className="text-[var(--accent-strong)] hover:text-[var(--accent-strong)]/80 font-semibold"
              >
                Create your first listing →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {myListings.map((listing) => (
                <div
                  key={listing.id}
                  className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--accent-strong)]/50 transition-all"
                >
                  <div className="relative h-48 bg-[var(--background-secondary)]">
                    {listing.imageUrl && isValidImageUrl(listing.imageUrl) ? (
                      <Image
                        src={listing.imageUrl}
                        alt={listing.title}
                        fill
                        className="object-cover"
                        unoptimized
                        onError={(e) => {
                          console.error(
                            "Listing image failed to load:",
                            listing.imageUrl
                          );
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-[var(--foreground-muted)] text-sm">
                        No Image Available
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-bold text-[var(--foreground)]">
                        {listing.title}
                      </h3>
                      <span className="bg-[var(--accent-strong)]/20 text-[var(--accent-strong)] text-xs px-3 py-1 rounded-full">
                        {listing.category}
                      </span>
                    </div>

                    <p className="text-[var(--foreground-muted)] text-sm mb-4 line-clamp-2">
                      {listing.description}
                    </p>

                    <p className="text-[var(--accent-strong)] font-bold text-lg mb-4">
                      {listing.price.toLocaleString()} aUEC
                    </p>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEdit(listing)}
                        disabled={loading}
                        className="flex-1 py-2 bg-[var(--background-secondary)] hover:bg-[var(--background-secondary)]/80 text-[var(--foreground)] rounded-lg transition-colors disabled:opacity-50 border border-[var(--border)]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(listing.id)}
                        disabled={loading}
                        className="flex-1 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 hover:text-red-300 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MarketplaceDashboard() {
  return (
    <Suspense fallback={<p className="text-[var(--foreground-muted)]">Loading...</p>}>
      <MarketplaceDashboardContent />
    </Suspense>
  );
}
