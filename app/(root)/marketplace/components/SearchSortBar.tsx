"use client";

import { Search, Filter, SortAsc, SortDesc, Clock } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";

interface SearchSortBarProps {
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;

  sortOption: string;
  setSortOption: Dispatch<SetStateAction<string>>;

  showAdminControls?: boolean;
  setShowAdminControls?: Dispatch<SetStateAction<boolean>>;
  isAdmin?: boolean;

  showFilters?: boolean;
  onOpenFilters?: () => void;
}

/**
 * @component SearchSortBar
 * @description A search and sort bar component for marketplace listings.
 * @param {SearchSortBarProps} props - The props for the component.
 * @returns {JSX.Element} The rendered SearchSortBar component.
 * @author House Wolf Dev Team
 */
export default function SearchSortBar({
  searchQuery,
  setSearchQuery,
  sortOption,
  setSortOption,
  showAdminControls = false,
  setShowAdminControls,
  isAdmin = false,
  showFilters = false,
  onOpenFilters,
}: SearchSortBarProps) {
  const [sortOpen, setSortOpen] = useState(false);

  const currentSortLabel =
    sortOption === "price-asc"
      ? "Price: Low → High (Newest First)"
      : sortOption === "price-desc"
      ? "Price: High → Low"
      : "Newest Added";

  return (
    <div className="w-full mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between p-5 rounded-xl bg-[var(--background-secondary)]/80 shadow-[0_0_25px_rgba(17,78,98,0.25)]">
      {/* SEARCH BOX */}
      <div className="relative w-full sm:w-1/2">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
          size={18}
        />

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search listings..."
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--background)] text-[var(--foreground)] outline-none border-2 border-[var(--hw-steel-teal)]/20 focus:border-[var(--hw-steel-teal)]/40 focus:ring-2 focus:ring-[var(--hw-steel-teal)]/30 transition"
        />
      </div>

      {/* SORT DROPDOWN */}
      <div className="relative">
        <button
          onClick={() => setSortOpen((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--background)] text-[var(--foreground)] border-2 border-[var(--hw-steel-teal)]/20 hover:border-[var(--hw-steel-teal)]/40 hover:bg-[var(--background-elevated)] transition shadow-sm cursor-pointer"
        >
          {sortOption === "newest" ? (
            <Clock size={18} />
          ) : sortOption === "price-asc" ? (
            <SortAsc size={18} />
          ) : (
            <SortDesc size={18} />
          )}
          <span>{currentSortLabel}</span>
        </button>

        {sortOpen && (
          <div className="absolute mt-2 w-56 right-0 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] shadow-lg z-50 overflow-hidden">
            <button
              onClick={() => {
                setSortOption("price-asc");
                setSortOpen(false);
              }}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-[var(--background)] cursor-pointer ${
                sortOption === "price-asc"
                  ? "text-[var(--accent-strong)]"
                  : "text-[var(--foreground)]"
              }`}
            >
              Price: Low → High (Newest First)
            </button>

            <button
              onClick={() => {
                setSortOption("price-desc");
                setSortOpen(false);
              }}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-[var(--background)] cursor-pointer ${
                sortOption === "price-desc"
                  ? "text-[var(--accent-strong)]"
                  : "text-[var(--foreground)]"
              }`}
            >
              Price: High → Low
            </button>

            <button
              onClick={() => {
                setSortOption("newest");
                setSortOpen(false);
              }}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-[var(--background)] cursor-pointer ${
                sortOption === "newest"
                  ? "text-[var(--accent-strong)]"
                  : "text-[var(--foreground)]"
              }`}
            >
              Newest Added
            </button>
          </div>
        )}
      </div>

      {/* ADMIN CONTROLS TOGGLE (OPTIONAL) */}
      {isAdmin && setShowAdminControls && (
        <button
          onClick={() => setShowAdminControls(!showAdminControls)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--background)] text-[var(--foreground)] border-2 border-[var(--hw-steel-teal)]/20 hover:border-[var(--hw-steel-teal)]/40 hover:bg-[var(--background-elevated)] transition shadow-sm cursor-pointer"
        >
          Admin Controls
        </button>
      )}

      {/* FILTERS BUTTON (OPTIONAL) */}
      {showFilters && (
        <button
          onClick={onOpenFilters}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--background)] text-[var(--foreground)] border-2 border-[var(--hw-steel-teal)]/20 hover:border-[var(--hw-steel-teal)]/40 hover:bg-[var(--background-elevated)] transition shadow-sm cursor-pointer"
        >
          <Filter size={18} />
          Filters
        </button>
      )}
    </div>
  );
}
