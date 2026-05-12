"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
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
    calculateBaseValueFromRanks,
    calculateFullSRP,
    calculateRarityScore,
    calculateSRP,
    CRAFTED_QUALITY_OPTIONS,
    getRarityCoefficient,
    getSupportedSizeOptions,
    getSrpItemTypeFromCategory,
    isCraftedCondition,
    MAX_RARITY_SCORE,
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

/**
 * @typedef {object} Listing
 * @property {string} id Unique identifier for the listing.
 * @property {string} title Listing title.
 * @property {string} description Listing description.
 * @property {string} [imageUrl] Optional image URL.
 * @property {string} category Category name.
 * @property {number} categoryId Category ID.
 * @property {number} price Listing price.
 * @property {number} quantity Listing quantity.
 * @property {string} [location] Optional location data.
 * @property {string} [status] Optional status (e.g., 'active', 'sold').
 * @property {string} [createdAt] Listing creation timestamp.
 */
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

/**
 * @typedef {object} FormData
 * @description The state structure for the listing creation/edit form.
 * @property {string} title
 * @property {string} description
 * @property {string} imageUrl
 * @property {string} categoryId
 * @property {string} price
 * @property {string} quantity
 * @property {string} location
 */
type FormData = {
    title: string;
    description: string;
    imageUrl: string;
    categoryId: string;
    price: string;
    quantity: string;
    location: string;
};

/**
 * @typedef {object} Category
 * @property {number} id
 * @property {string} name
 * @property {string} slug
 */
type Category = {
    id: number;
    name: string;
    slug: string;
};

const initialFormData: FormData = {
    title: "",
    description: "",
    imageUrl: "",
    categoryId: "",
    price: "",
    quantity: "1",
    location: "",
};

const DARK_SELECT_STYLE = {
    backgroundColor: "#0b1820",
    color: "#f5efe2",
    colorScheme: "dark" as const,
};

const DARK_OPTION_STYLE = {
    backgroundColor: "#0b1820",
    color: "#f5efe2",
};

/**
 * @component MarketplaceDashboardContent
 * @description Main component for marketplace creation and management dashboard.
 * @returns {JSX.Element} The rendered dashboard content.
 * @author House Wolf Dev Team
 */
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
    const [formData, setFormData] = useState<FormData>(initialFormData);

    const isMarketplaceAdmin = session?.user?.permissions?.includes(PERMISSIONS.MARKETPLACE_ADMIN);

    // SRP Calculator State
    const [showSrpHelper, setShowSrpHelper] = useState(false);
    const [srpItemType, setSrpItemType] = useState<SrpItemType>("Armor");
    const [srpRarityScore, setSrpRarityScore] = useState("");
    const [showSrpCalculator, setShowSrpCalculator] = useState(false);
    const [showSrpExplanation, setShowSrpExplanation] = useState(false);
    const [srpCalculatorValues, setSrpCalculatorValues] = useState<SrpCalculatorValues>({
        condition: CONDITION_OPTIONS[0].value,
        gun: GUN_OPTIONS[0].value,
        armor: ARMOR_OPTIONS[0].value,
        size: SIZE_OPTIONS[0].value,
        shipWeapon: SHIP_WEAPON_OPTIONS[0].value,
        component: COMPONENT_OPTIONS[0].value,
    });

    // NEW: Memoized SRP Calculations for performance
    const {
        srpBaseValue,
        normalizedRarityScore,
        srpRarityScoreWasClamped,
        suggestedRetailPrice,
        calculatorRarityScore,
        calculatorSuggestedRetailPrice,
    } = useMemo(() => {
        const srpBaseValue = calculateBaseValueFromRanks(srpItemType, srpCalculatorValues);
        const calculatorRarityScore = calculateRarityScore(srpItemType, srpCalculatorValues);
        const parsedRarityScore = parseFloat(srpRarityScore);
        const hasManualOverride = srpRarityScore.trim().length > 0;
        const rarityScoreNumber = hasManualOverride
            ? Number.isNaN(parsedRarityScore)
                ? null
                : parsedRarityScore
            : calculatorRarityScore;
        const normalizedRarityScore =
            rarityScoreNumber !== null
                ? Math.min(Math.max(rarityScoreNumber, 0), MAX_RARITY_SCORE)
                : null;
        const srpRarityScoreWasClamped =
            hasManualOverride &&
            rarityScoreNumber !== null &&
            (rarityScoreNumber < 0 || rarityScoreNumber > MAX_RARITY_SCORE);
        const crafted = isCraftedCondition(srpCalculatorValues.condition);
        const suggestedRetailPrice =
            normalizedRarityScore !== null && srpBaseValue !== null
                ? calculateSRP(
                      srpBaseValue,
                      normalizedRarityScore,
                      srpCalculatorValues.craftedQuality,
                      crafted
                  )
                : null;
        const calculatorSuggestedRetailPrice = calculateFullSRP(srpItemType, srpCalculatorValues);
        return {
            srpBaseValue,
            normalizedRarityScore,
            srpRarityScoreWasClamped,
            suggestedRetailPrice,
            calculatorRarityScore,
            calculatorSuggestedRetailPrice,
        };
    }, [srpItemType, srpRarityScore, srpCalculatorValues]);

    /**
     * @function showMessage
     * @description Displays a temporary success or error message.
     * @param {'success' | 'error'} type The type of message to display.
     * @param {string} text The message content.
     * @returns {void}
     * @author House Wolf Dev Team
     */
    const showMessage = useCallback((type: "success" | "error", text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    }, []); // NEW: Memoize showMessage using useCallback

    /**
     * @function fetchCategories
     * @description Fetches the list of marketplace categories.
     * @returns {void}
     * @author House Wolf Dev Team
     */
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch("/api/marketplace/categories");
                if (!res.ok) { // NEW: Simplified error checking
                    throw new Error(`Failed to fetch categories: ${res.status}`);
                }
                const data = await res.json();
                setCategories(data);
                if (data.length > 0 && !formData.categoryId) {
                    setFormData((prev) => ({ ...prev, categoryId: data[0].id.toString() }));
                }
            } catch (error) {
                console.error("Error fetching categories:", error);
                showMessage("error", "Failed to load categories."); // NEW: Use showMessage
            }
        };

        fetchCategories();
    }, [formData.categoryId, showMessage]);

    /**
     * @function handleWikiSearch
     * @description Searches the wiki for the item title and auto-fills form data.
     * @returns {void}
     * @author House Wolf Dev Team
     */
    const handleWikiSearch = async () => {
        if (!formData.title.trim() || wikiLoading) { // NEW: Added wikiLoading check for race condition prevention
            return;
        }

        try {
            setWikiLoading(true);
            const result = await searchWiki(formData.title);

            if (!result) {
                showMessage("error", "No wiki match found for this title");
                setWikiData(null);
                return;
            }

            setWikiData(result);

            const suggestedCategory = determineCategoryFromName(result.name);
            const suggestedCategoryId = getCategoryIdByName(categories, suggestedCategory);

            // Auto-fill description, image, and category if empty
            setFormData((prev) => ({
                ...prev,
                description: prev.description || result.description || "",
                imageUrl: result.image || prev.imageUrl || "", // Favor wiki image if found
                categoryId: suggestedCategoryId
                    ? suggestedCategoryId.toString()
                    : prev.categoryId,
            }));

            // Auto-set SRP base value if wiki price exists
            if (result.price && isMarketplaceAdmin) {
                setSrpCalculatorValues((prev) => ({
                    ...prev,
                    manualBaseValue: result.price ?? undefined,
                }));
                setShowSrpHelper(true);
                showMessage("success", `Wiki data found and price auto-filled: ${result.price.toLocaleString()} aUEC`);
            } else if (isMarketplaceAdmin) {
                showMessage("info", "Wiki data found, but no in-game price data is available for this item.");
            }

            setCategoryAutoSet(!!suggestedCategoryId);
        } catch (err) {
            console.error("Wiki fetch failed:", err);
            setWikiData(null);
            showMessage("error", "Failed to fetch wiki data. Please try again.");
        } finally {
            setWikiLoading(false);
        }
    };

    /**
     * @function handleClearForm
     * @description Clears all form data and resets helper states.
     * @returns {void}
     * @author House Wolf Dev Team
     */
    const handleClearForm = useCallback(() => {
        setFormData(initialFormData);
        setWikiData(null);
        setCategoryAutoSet(false);
        setMessage(null);
        setEditingId(null); // NEW: Added reset for editing state
    }, []);

    /**
     * @function fetchMyListings
     * @description Fetches all listings created by the current user.
     * @returns {void}
     * @author House Wolf Dev Team
     */
    const fetchMyListings = useCallback(async () => {
        try {
            const res = await fetch("/api/marketplace/my-listings");
            if (!res.ok) {
                // NEW: Handle non-ok status directly with JSON parsing if available
                const errorData = await res.json().catch(() => ({ error: 'Unknown server error' }));
                throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            setMyListings(data.listings || []);
        } catch (err: unknown) {
            console.error("Error fetching listings:", err);
            showMessage("error", "Failed to load your listings.");
        }
    }, [showMessage]);

    /**
     * @function loadListingForEdit
     * @description Fetches a specific listing's details and populates the form for editing.
     * @param {string} listingId The ID of the listing to load.
     * @returns {void}
     * @author House Wolf Dev Team
     */
    const loadListingForEdit = useCallback(async (listingId: string) => {
        try {
            const res = await fetch(`/api/marketplace/listing/${listingId}`);
            if (res.ok) {
                const data = await res.json();
                const listing: Listing = data.listing; // Ensure type consistency

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

                // NEW: Only replace URL after successful load to clear the 'edit' parameter
                // This prevents the URL change from interfering with state updates, although
                // the original component structure made this complicated.
                router.replace("/dashboard/marketplace"); 
            } else {
                // Handle 404/error during fetch
                throw new Error("Listing not found or failed to fetch details.");
            }
        } catch (error) {
            console.error("Error loading listing for edit:", error);
            showMessage("error", "Failed to load listing for editing");
        }
    }, [router, showMessage]);

    // Side Effects ----------------------------------------------------------------------------------

    // NEW: Effect for 'manage' tab listings fetch
    useEffect(() => {
        if (activeTab === "manage") {
            fetchMyListings();
        }
    }, [activeTab, fetchMyListings]);

    // NEW: Effect to align SRP item type with selected category
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

    // NEW: Safe suspension check
    useEffect(() => {
        // NEW: Do not proceed if user status is loading or no session exists
        if (status !== "authenticated" || suspensionChecked) {
            return;
        }

        const checkSuspension = async () => {
            try {
                const res = await fetch(`/api/user/suspension-status`);
                let data = { isSuspended: false };

                if (res.ok) {
                    data = await res.json();
                } else if (res.status !== 404) {
                    // Only log error if it's not just a missing API endpoint (404)
                    console.error(`Suspension API error: ${res.status}`);
                }
                
                setIsSuspended(data.isSuspended);

                // NEW: Use a check that allows the admin edit to proceed first
                if (data.isSuspended && !isMarketplaceAdmin) {
                    router.push("/dashboard");
                }
            } catch (error) {
                console.error("Error checking suspension:", error);
                // On error, default to not suspended to allow access (fail-safe)
            } finally {
                 setSuspensionChecked(true);
            }
        };

        checkSuspension();
    }, [session, router, status, suspensionChecked, isMarketplaceAdmin]);


    // NEW: Handle edit query parameter from marketplace (admin quick edit)
    useEffect(() => {
        const editId = searchParams.get("edit");
        if (editId && session?.user && isMarketplaceAdmin && !editingId) { // NEW: Prevent re-load if already editing
            loadListingForEdit(editId);
        }
    }, [searchParams, session, isMarketplaceAdmin, loadListingForEdit, editingId]);

    // SRP Calculator Actions ------------------------------------------------------------------------

    /**
     * @function updateCalculatorValue
     * @description Updates a specific value in the SRP cheat sheet calculator state.
     * @param {keyof SrpCalculatorValues} key The field to update.
     * @param {number} value The new numeric value.
     * @returns {void}
     * @author House Wolf Dev Team
     */
    const updateCalculatorValue = (key: keyof SrpCalculatorValues, value: number) => {
        setSrpCalculatorValues((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    /**
     * @function applySuggestedPrice
     * @description Applies the calculated Suggested Retail Price to the form.
     * @returns {void}
     * @author House Wolf Dev Team
     */
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

    /**
     * @function applyCalculatedPrice
     * @description Applies the fully calculated SRP from the rank-based calculator.
     * @returns {void}
     * @author House Wolf Dev Team
     */
    const applyCalculatedPrice = () => {
        if (!calculatorSuggestedRetailPrice) return;
        setFormData((prev) => ({
            ...prev,
            price: calculatorSuggestedRetailPrice.toString(),
        }));
        showMessage(
            "success",
            `Applied calculated SRP of ${calculatorSuggestedRetailPrice.toLocaleString()} aUEC`
        );
    };

    // Form Submission -------------------------------------------------------------------------------

    /**
     * @function handleSubmit
     * @description Handles the submission or update of a listing to the API.
     * @param {React.FormEvent} e Form event object.
     * @returns {Promise<void>}
     * @author House Wolf Dev Team
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return; // NEW: Prevent duplicate submissions

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

        const payload = {
            title: formData.title,
            description: formData.description,
            price: parseFloat(formData.price), // NEW: Ensure price is sent as a number if API expects it
            quantity: parseInt(formData.quantity), // NEW: Ensure quantity is sent as an integer
            categoryId: parseInt(formData.categoryId), // NEW: Ensure categoryId is sent as an integer
            imageUrl: formData.imageUrl,
            location: formData.location,
        };

        try {
            const url = editingId
                ? `/api/marketplace/update/${editingId}`
                : "/api/marketplace/create";
            
            const method = editingId ? "PUT" : "POST";

            // NEW: Use JSON for both POST (Create) and PUT (Update) for consistency and better typing
            const res = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

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

            // Re-fetch listings if currently on the 'manage' tab
            if (activeTab === "manage") {
                fetchMyListings();
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An error occurred";
            showMessage("error", message);
        } finally {
            setLoading(false);
        }
    };
    
    // Listing Management Actions --------------------------------------------------------------------

    /**
     * @function handleEdit
     * @description Sets the form state to edit a selected listing.
     * @param {Listing} listing The listing data to load into the form.
     * @returns {void}
     * @author House Wolf Dev Team
     */
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

    /**
     * @function handleDelete
     * @description Deletes a listing after user confirmation.
     * @param {string} id The ID of the listing to delete.
     * @returns {Promise<void>}
     * @author House Wolf Dev Team
     */
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this listing?")) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/marketplace/delete/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete listing");
            showMessage("success", "Listing deleted!");
            fetchMyListings();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to delete listing";
            showMessage("error", message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * @function cancelEdit
     * @description Resets the component state to stop editing and clear the form.
     * @returns {void}
     * @author House Wolf Dev Team
     */
    const cancelEdit = useCallback(() => {
        setEditingId(null);
        setFormData(initialFormData);
        setWikiData(null);
        setCategoryAutoSet(false);
    }, []);

    // Conditional Returns ---------------------------------------------------------------------------
    
    if (status === "loading" || !suspensionChecked) {
        return <p className="text-[var(--foreground-muted)]">Loading...</p>;
    }

    if (!session) {
        // NEW: This redirects non-logged-in users. This should ideally be handled by Next.js middleware.
        router.push("/dashboard");
        return null;
    }

    if (isSuspended) {
        // NEW: Check for admin permission should ideally happen before this block, 
        // but for a client component, this explicit check is safer than relying on a race condition.
        if (isMarketplaceAdmin) {
            showMessage("error", "Your account is suspended, but admin access remains.");
        } else {
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
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="card border border-[var(--border-soft)] bg-black">
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
                    className={`mb-6 p-4 rounded-lg border bg-black ${
                        message.type === "success"
                            ? "border-green-700 text-green-300"
                            : "border-red-700 text-red-300"
                    }`}
                >
                    {message.text}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-[var(--border-soft)]">
                <button
                    onClick={() => setActiveTab("create")}
                    disabled={loading || wikiLoading} // NEW: Disable during async operations
                    className={`px-6 py-3 font-semibold transition-all relative cursor-pointer ${
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
                    disabled={loading || wikiLoading} // NEW: Disable during async operations
                    className={`px-6 py-3 font-semibold transition-all relative cursor-pointer ${
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
                <div className="card border border-[var(--border-soft)] bg-black">
                    {editingId && (
                        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700 rounded-lg flex justify-between items-center">
                            <span className="text-blue-300">Editing listing</span>
                            <button
                                onClick={cancelEdit}
                                type="button" // NEW: Added type="button"
                                disabled={loading || wikiLoading} // NEW: Disable during async operations
                                className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
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
                                    disabled={loading} // NEW: Disable while submitting
                                />
                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={handleWikiSearch}
                                        disabled={wikiLoading || loading || !formData.title.trim()} // NEW: Added loading check
                                        className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                                    >
                                        {wikiLoading ? "Searching..." : "Search Wiki"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleClearForm}
                                        disabled={loading || wikiLoading} // NEW: Disable during async operations
                                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
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

                            {/* Wiki Preview Card */}
                            {wikiData && (
                                <div className="mt-4 p-4 border border-indigo-500/30 bg-indigo-950/10 rounded-xl flex gap-4 items-start">
                                    {wikiData.image && (
                                        <div className="w-24 h-24 rounded-lg overflow-hidden border border-indigo-500/20 shrink-0">
                                            <img
                                                src={wikiData.image}
                                                alt={wikiData.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-sm font-bold text-indigo-300 truncate">
                                                {wikiData.name}
                                            </h4>
                                            {wikiData.wikiUrl && (
                                                <a
                                                    href={wikiData.wikiUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
                                                >
                                                    Wiki Page
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                                            {wikiData.description}
                                        </p>
                                        {wikiData.price && (
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-xs font-semibold text-green-400">
                                                    Wiki Price: {wikiData.price.toLocaleString()} aUEC
                                                </span>
                                                {isMarketplaceAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSrpCalculatorValues((prev) => ({
                                                                ...prev,
                                                                manualBaseValue: wikiData.price ?? undefined,
                                                            }));
                                                            setShowSrpHelper(true);
                                                            showMessage("success", "Wiki price applied as SRP base value.");
                                                        }}
                                                        className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded transition-colors"
                                                    >
                                                        Use as SRP Base
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
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
                                    disabled={loading} // NEW: Disable while submitting
                                    className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                    style={DARK_SELECT_STYLE}
                                >
                                    {categories.map((cat) => (
                                        <option
                                            key={cat.id}
                                            value={cat.id}
                                            style={DARK_OPTION_STYLE}
                                        >
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
                                    disabled={loading} // NEW: Disable while submitting
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
                                                    Base value x scarcity multiplier x crafted quality x marketplace markup.
                                                    Rank tables come from HouseWolf notes and internal marketplace pricing.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowSrpHelper((prev) => !prev)}
                                                disabled={loading || wikiLoading}
                                                className="text-xs font-semibold text-[var(--accent-strong)] hover:text-[var(--accent-strong)]/80 transition-colors cursor-pointer"
                                            >
                                                {showSrpHelper ? "Hide tool" : "Show tool"}
                                            </button>
                                        </div>

                                        {showSrpHelper && (
                                            <div className="mt-4 space-y-4 text-sm">
                                                <div>
                                                    <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                                                        SRP category
                                                    </label>
                                                    <select
                                                        value={srpItemType}
                                                        onChange={(e) =>
                                                            setSrpItemType(e.target.value as SrpItemType)
                                                        }
                                                        disabled={loading || wikiLoading}
                                                        className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                                        style={DARK_SELECT_STYLE}
                                                    >
                                                        {(["Guns", "Armor", "Components", "Ship Weapons"] as SrpItemType[]).map((type) => (
                                                            <option
                                                                key={type}
                                                                value={type}
                                                                style={DARK_OPTION_STYLE}
                                                            >
                                                                {type}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <p className="text-xs text-[var(--foreground-muted)] mt-1">
                                                        Base value comes from the selected rank table, not a single flat
                                                        category floor.
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                                                        Manual base value override (aUEC)
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            value={srpCalculatorValues.manualBaseValue || ""}
                                                            onChange={(e) =>
                                                                updateCalculatorValue(
                                                                    "manualBaseValue",
                                                                    e.target.value === "" ? 0 : Number(e.target.value)
                                                                )
                                                            }
                                                            disabled={loading || wikiLoading}
                                                            className="flex-1 bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                                            placeholder="Leave blank to use rank-based tables"
                                                        />
                                                        {wikiData?.price && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    updateCalculatorValue("manualBaseValue", wikiData.price ?? 0);
                                                                    showMessage("success", "Wiki price applied as base value.");
                                                                }}
                                                                disabled={loading || wikiLoading}
                                                                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                                                            >
                                                                Use Wiki Price
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-[var(--foreground-muted)] mt-1">
                                                        If set, this replaces the base value from the rank tables below.
                                                    </p>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                                                        Manual scarcity score override (0-{MAX_RARITY_SCORE})
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={MAX_RARITY_SCORE}
                                                        step="1"
                                                        value={srpRarityScore}
                                                        onChange={(e) => setSrpRarityScore(e.target.value)}
                                                        disabled={loading || wikiLoading}
                                                        className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                                        placeholder="Leave blank to use the calculated score"
                                                    />
                                                    <p className="text-xs text-[var(--foreground-muted)] mt-1">
                                                        Leave this empty to use the score from the rank-based calculator.
                                                        Fill it in only if you want to override the scarcity multiplier.
                                                    </p>
                                                    {srpRarityScoreWasClamped && (
                                                        <p className="text-xs text-amber-400 mt-1">
                                                            Scarcity score is capped at {MAX_RARITY_SCORE} to keep the
                                                            multiplier within range.
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="pt-4 border-t border-[var(--border)] flex justify-between items-center">
                                                    <div>
                                                        <p className="text-sm font-bold text-[var(--accent-strong)]">
                                                            SRP: {suggestedRetailPrice?.toLocaleString() || "N/A"} aUEC
                                                        </p>
                                                        <p className="text-xs text-[var(--foreground-muted)]">
                                                            Base value: {srpBaseValue?.toLocaleString() || "N/A"} aUEC
                                                        </p>
                                                        <p className="text-xs text-[var(--foreground-muted)]">
                                                            Scarcity multiplier:{" "}
                                                            {normalizedRarityScore !== null
                                                                ? `x${getRarityCoefficient(normalizedRarityScore).toFixed(2)}`
                                                                : "N/A"}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={applySuggestedPrice}
                                                        disabled={!suggestedRetailPrice || loading || wikiLoading}
                                                        className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                                                    >
                                                        Apply SRP
                                                    </button>
                                                </div>

                                                <div className="pt-4 border-t border-[var(--border)]">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <p className="text-sm font-semibold text-[var(--foreground)]">
                                                                Rank-based calculator
                                                            </p>
                                                            <p className="text-xs text-[var(--foreground-muted)]">
                                                                Pick the actual item ranks and let the helper build the
                                                                value.
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowSrpExplanation(true)}
                                                                disabled={loading || wikiLoading}
                                                                className="text-xs font-semibold text-[var(--accent-strong)] hover:text-[var(--accent-strong)]/80 transition-colors cursor-pointer"
                                                            >
                                                                How pricing works
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowSrpCalculator((prev) => !prev)}
                                                                disabled={loading || wikiLoading}
                                                                className="text-xs font-semibold text-[var(--accent-strong)] hover:text-[var(--accent-strong)]/80 transition-colors cursor-pointer"
                                                            >
                                                                {showSrpCalculator ? "Hide calculator" : "Show calculator"}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {showSrpCalculator && (
                                                        <div className="mt-4 space-y-4">
                                                            <div className="text-xs text-[var(--foreground-muted)]">
                                                                <p>Step 1: choose the rank table that matches the item.</p>
                                                                <p className="mt-1">
                                                                    Step 2: the calculator builds the base value, then
                                                                    applies condition, crafted quality, and marketplace
                                                                    markup.
                                                                </p>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                                <div>
                                                                    <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                                                                        Availability / condition
                                                                    </label>
                                                                    <select
                                                                        value={srpCalculatorValues.condition}
                                                                        onChange={(e) =>
                                                                            updateCalculatorValue(
                                                                                "condition",
                                                                                Number(e.target.value)
                                                                            )
                                                                        }
                                                                        disabled={loading || wikiLoading}
                                                                        className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                                                        style={DARK_SELECT_STYLE}
                                                                    >
                                                                        {CONDITION_OPTIONS.map((opt) => (
                                                                            <option
                                                                                key={opt.value}
                                                                                value={opt.value}
                                                                                style={DARK_OPTION_STYLE}
                                                                            >
                                                                                {opt.label}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>

                                                                {srpItemType === "Guns" && (
                                                                    <div>
                                                                        <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                                                                            Weapon class
                                                                        </label>
                                                                        <select
                                                                            value={srpCalculatorValues.gun}
                                                                            onChange={(e) =>
                                                                                updateCalculatorValue(
                                                                                    "gun",
                                                                                    Number(e.target.value)
                                                                                )
                                                                            }
                                                                            disabled={loading || wikiLoading}
                                                                            className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                                                            style={DARK_SELECT_STYLE}
                                                                        >
                                                                            {GUN_OPTIONS.map((opt) => (
                                                                                <option
                                                                                    key={opt.value}
                                                                                    value={opt.value}
                                                                                    style={DARK_OPTION_STYLE}
                                                                                >
                                                                                    {opt.label}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                )}

                                                                {srpItemType === "Armor" && (
                                                                    <div>
                                                                        <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                                                                            Armor tier
                                                                        </label>
                                                                        <select
                                                                            value={srpCalculatorValues.armor}
                                                                            onChange={(e) =>
                                                                                updateCalculatorValue(
                                                                                    "armor",
                                                                                    Number(e.target.value)
                                                                                )
                                                                            }
                                                                            disabled={loading || wikiLoading}
                                                                            className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                                                            style={DARK_SELECT_STYLE}
                                                                        >
                                                                            {ARMOR_OPTIONS.map((opt) => (
                                                                                <option
                                                                                    key={opt.value}
                                                                                    value={opt.value}
                                                                                    style={DARK_OPTION_STYLE}
                                                                                >
                                                                                    {opt.label}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                )}

                                                                {srpItemType === "Components" && (
                                                                    <>
                                                                        <div>
                                                                            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                                                                                Component size
                                                                            </label>
                                                                            <select
                                                                                value={srpCalculatorValues.size}
                                                                                onChange={(e) =>
                                                                                    updateCalculatorValue(
                                                                                        "size",
                                                                                        Number(e.target.value)
                                                                                    )
                                                                                }
                                                                                disabled={loading || wikiLoading}
                                                                                className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                                                                style={DARK_SELECT_STYLE}
                                                                            >
                                                                                {getSupportedSizeOptions(srpItemType).map((opt) => (
                                                                                    <option
                                                                                        key={opt.value}
                                                                                        value={opt.value}
                                                                                        style={DARK_OPTION_STYLE}
                                                                                    >
                                                                                        {opt.label}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </div>

                                                                        <div>
                                                                            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                                                                                Component type
                                                                            </label>
                                                                            <select
                                                                                value={srpCalculatorValues.component}
                                                                                onChange={(e) =>
                                                                                    updateCalculatorValue(
                                                                                        "component",
                                                                                        Number(e.target.value)
                                                                                    )
                                                                                }
                                                                                disabled={loading || wikiLoading}
                                                                                className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                                                                style={DARK_SELECT_STYLE}
                                                                            >
                                                                                {COMPONENT_OPTIONS.map((opt) => (
                                                                                    <option
                                                                                        key={opt.value}
                                                                                        value={opt.value}
                                                                                        style={DARK_OPTION_STYLE}
                                                                                    >
                                                                                        {opt.label}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    </>
                                                                )}

                                                                {srpItemType === "Ship Weapons" && (
                                                                    <>
                                                                        <div>
                                                                            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                                                                                Weapon size
                                                                            </label>
                                                                            <select
                                                                                value={srpCalculatorValues.size}
                                                                                onChange={(e) =>
                                                                                    updateCalculatorValue(
                                                                                        "size",
                                                                                        Number(e.target.value)
                                                                                    )
                                                                                }
                                                                                disabled={loading || wikiLoading}
                                                                                className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                                                                style={DARK_SELECT_STYLE}
                                                                            >
                                                                                {getSupportedSizeOptions(srpItemType).map((opt) => (
                                                                                    <option
                                                                                        key={opt.value}
                                                                                        value={opt.value}
                                                                                        style={DARK_OPTION_STYLE}
                                                                                    >
                                                                                        {opt.label}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </div>

                                                                        <div>
                                                                            <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                                                                                Weapon type
                                                                            </label>
                                                                            <select
                                                                                value={srpCalculatorValues.shipWeapon}
                                                                                onChange={(e) =>
                                                                                    updateCalculatorValue(
                                                                                        "shipWeapon",
                                                                                        Number(e.target.value)
                                                                                    )
                                                                                }
                                                                                disabled={loading || wikiLoading}
                                                                                className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                                                                style={DARK_SELECT_STYLE}
                                                                            >
                                                                                {SHIP_WEAPON_OPTIONS.map((opt) => (
                                                                                    <option
                                                                                        key={opt.value}
                                                                                        value={opt.value}
                                                                                        style={DARK_OPTION_STYLE}
                                                                                    >
                                                                                        {opt.label}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    </>
                                                                )}

                                                                {isCraftedCondition(srpCalculatorValues.condition) && (
                                                                    <div>
                                                                        <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                                                                            Crafted quality
                                                                        </label>
                                                                        <select
                                                                            value={srpCalculatorValues.craftedQuality ?? CRAFTED_QUALITY_OPTIONS[0].value}
                                                                            onChange={(e) =>
                                                                                updateCalculatorValue(
                                                                                    "craftedQuality",
                                                                                    Number(e.target.value)
                                                                                )
                                                                            }
                                                                            disabled={loading || wikiLoading}
                                                                            className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                                                            style={DARK_SELECT_STYLE}
                                                                        >
                                                                            {CRAFTED_QUALITY_OPTIONS.map((opt) => (
                                                                                <option
                                                                                    key={opt.value}
                                                                                    value={opt.value}
                                                                                    style={DARK_OPTION_STYLE}
                                                                                >
                                                                                    {opt.label}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="pt-4 border-t border-[var(--border)] flex justify-between items-center">
                                                                <div>
                                                                    <p className="text-sm font-bold text-indigo-400">
                                                                        Calculated SRP: {calculatorSuggestedRetailPrice?.toLocaleString() || "N/A"} aUEC
                                                                    </p>
                                                                    <p className="text-xs text-[var(--foreground-muted)]">
                                                                        Base value: {srpBaseValue?.toLocaleString() || "N/A"} aUEC
                                                                    </p>
                                                                    <p className="text-xs text-[var(--foreground-muted)]">
                                                                        Scarcity score: {calculatorRarityScore ?? "N/A"}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={applyCalculatedPrice}
                                                                    disabled={!calculatorSuggestedRetailPrice || loading || wikiLoading}
                                                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                                                                >
                                                                    Apply calculated SRP
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {showSrpExplanation && (
                                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                                                        <div className="w-full max-w-2xl rounded-2xl border border-white/20 bg-[#08131a] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div>
                                                                    <h3 className="text-lg font-semibold text-[#f8f3e7]">
                                                                        How the SRP calculator works
                                                                    </h3>
                                                                    <p className="mt-1 text-sm text-[#d6d0c3]">
                                                                        The calculator now prices the item from its actual rank table first, then applies scarcity and markup.
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowSrpExplanation(false)}
                                                                    className="text-sm font-semibold text-[#d6d0c3] hover:text-[#f8f3e7] transition-colors"
                                                                >
                                                                    Close
                                                                </button>
                                                            </div>

                                                            <div className="mt-6 space-y-4 text-sm text-[#f8f3e7]">
                                                                <div className="rounded-xl border border-white/10 bg-[#0d1b23] px-4 py-3">
                                                                    <p className="font-semibold">1. Base value</p>
                                                                    <p className="mt-1 text-[#d6d0c3]">
                                                                        Guns and armor use a direct rank table. Components and ship weapons use a size-plus-type table.
                                                                    </p>
                                                                </div>
                                                                <div className="rounded-xl border border-white/10 bg-[#0d1b23] px-4 py-3">
                                                                    <p className="font-semibold">2. Scarcity multiplier</p>
                                                                    <p className="mt-1 text-[#d6d0c3]">
                                                                        Condition affects scarcity. Purchasable items stay lowest, while non-purchasable, pledged, event, and crafted items scale higher.
                                                                    </p>
                                                                </div>
                                                                <div className="rounded-xl border border-white/10 bg-[#0d1b23] px-4 py-3">
                                                                    <p className="font-semibold">3. Crafted quality</p>
                                                                    <p className="mt-1 text-[#d6d0c3]">
                                                                        Crafted items get an additional quality modifier from Q700 through Q1000.
                                                                    </p>
                                                                </div>
                                                                <div className="rounded-xl border border-white/10 bg-[#0d1b23] px-4 py-3">
                                                                    <p className="font-semibold">4. Final formula</p>
                                                                    <p className="mt-1 text-[#d6d0c3]">
                                                                        Final SRP = base value x scarcity multiplier x crafted quality modifier x marketplace markup.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* Quantity and Location */}
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
                                    disabled={loading} // NEW: Disable while submitting
                                />
                                <label className="block text-sm font-semibold text-[var(--foreground)] mt-4 mb-2">
                                    Location (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) =>
                                        setFormData({ ...formData, location: e.target.value })
                                    }
                                    className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                    placeholder="e.g., Area 18 or Stanton"
                                    disabled={loading} // NEW: Disable while submitting
                                />
                            </div>
                        </div>

                        {/* Description and Image URL */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                                    Description *
                                </label>
                                <textarea
                                    required
                                    rows={6}
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                    placeholder="Detailed description of the item, condition, and any unique features."
                                    disabled={loading} // NEW: Disable while submitting
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
                                    Image URL (Optional)
                                </label>
                                <input
                                    type="url"
                                    value={formData.imageUrl}
                                    onChange={(e) =>
                                        setFormData({ ...formData, imageUrl: e.target.value })
                                    }
                                    className="w-full bg-[var(--background-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-strong)] focus:border-transparent outline-none transition-all"
                                    placeholder="https://example.com/image.jpg"
                                    disabled={loading} // NEW: Disable while submitting
                                />
                                {formData.imageUrl && isValidImageUrl(formData.imageUrl) && (
                                    <div className="mt-4 border border-[var(--border)] rounded-lg overflow-hidden">
                                        <Image
                                            src={formData.imageUrl}
                                            alt="Listing Preview"
                                            width={500}
                                            height={300}
                                            className="w-full h-auto object-cover"
                                            unoptimized // NEW: Added unoptimized to prevent Vercel/Next.js Image issues with external URLs
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end pt-4 border-t border-[var(--border-soft)]">
                            <button
                                type="submit"
                                disabled={loading || wikiLoading} // NEW: Disable during any async operation
                                className="px-8 py-3 bg-[var(--accent-strong)] hover:bg-[var(--accent-strong)]/80 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
                            >
                                {loading
                                    ? "Saving..."
                                    : editingId
                                        ? "Update Listing"
                                        : "Create Listing"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* My Listings Table */}
            {activeTab === "manage" && (
                <div className="card border border-[var(--border-soft)] bg-black">
                    <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">Your Active Listings ({myListings.length})</h2>
                    {loading && <p className="text-indigo-400">Loading listings...</p>}
                    {!loading && myListings.length === 0 && (
                        <p className="text-[var(--foreground-muted)]">You have no active listings. Create one in the &quot;Create Listing&quot; tab.</p>
                    )}
                    
                    {!loading && myListings.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-[var(--border)]">
                                <thead className="bg-[var(--background-secondary)]">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">Title</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">Price (aUEC)</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">Qty</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-black divide-y divide-[var(--border-soft)]">
                                    {myListings.map((listing) => (
                                        <tr key={listing.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--foreground)]">
                                                {listing.title}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--foreground-muted)]">
                                                {categories.find(c => c.id === listing.categoryId)?.name || 'Unknown'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--foreground)]">
                                                {listing.price.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--foreground-muted)]">
                                                {listing.quantity}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleEdit(listing)}
                                                    disabled={loading || wikiLoading} // NEW: Disable during async operations
                                                    className="text-indigo-600 hover:text-indigo-900 mr-4 disabled:text-gray-500 disabled:cursor-not-allowed"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(listing.id)}
                                                    disabled={loading || wikiLoading} // NEW: Disable during async operations
                                                    className="text-red-600 hover:text-red-900 disabled:text-gray-500 disabled:cursor-not-allowed"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function MarketplaceDashboard() {
    return (
        <Suspense fallback={<p className="text-[var(--foreground-muted)]">Loading Marketplace Interface...</p>}>
            <MarketplaceDashboardContent />
        </Suspense>
    );
}
