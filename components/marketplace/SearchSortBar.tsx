"use client";

import { Search, Filter, SortAsc, SortDesc } from "lucide-react";
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

export default function SearchSortBar({
  searchQuery,
  setSearchQuery,
  sortOption,
  setSortOption,
  showAdminControls = false,
  setShowAdminControls,
  isAdmin = false,
  showFilters = false,
  onOpenFilters
}: SearchSortBarProps) {
  const [sortOpen, setSortOpen] = useState(false);

  return (
    <div className="w-full mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between p-4 rounded-xl bg-linear-to-r from-obsidian via-night-deep to-shadow border border-accent-secondary/30 shadow-[0_0_20px_rgba(0,0,0,0.4)]">
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
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-night-deep border border-accent-main/20 text-foreground outline-none focus:border-steel-light focus:ring-2 focus:ring-steel-light/40 transition"
        />
      </div>

      {/* SORT DROPDOWN */}
      <div className="relative">
        <button
          onClick={() => setSortOpen((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-night-deep border border-accent-main/20 text-foreground hover:border-steel-light transition"
        >
          {sortOption === "price-asc" ? <SortAsc size={18} /> : <SortDesc size={18} />}
          Sort
        </button>

        {sortOpen && (
          <div className="absolute mt-2 w-40 right-0 rounded-lg bg-obsidian border border-accent-main/30 shadow-lg z-50">
            <button
              onClick={() => {
                setSortOption("price-asc");
                setSortOpen(false);
              }}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-night-deep ${
                sortOption === "price-asc" ? "text-steel-light" : "text-foreground"
              }`}
            >
              {"Price: Low -> High"}
            </button>

            <button
              onClick={() => {
                setSortOption("price-desc");
                setSortOpen(false);
              }}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-night-deep ${
                sortOption === "price-desc" ? "text-crimson-light" : "text-foreground"
              }`}
            >
              {"Price: High -> Low"}
            </button>
          </div>
        )}
      </div>

      {/* ADMIN CONTROLS TOGGLE (OPTIONAL) */}
      {isAdmin && setShowAdminControls && (
        <button
          onClick={() => setShowAdminControls(!showAdminControls)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-night-deep border transition ${
            showAdminControls
              ? "border-crimson-light text-crimson-light"
              : "border-accent-main/20 text-foreground hover:border-steel-light"
          }`}
        >
          Admin Controls
        </button>
      )}

      {/* FILTERS BUTTON (OPTIONAL) */}
      {showFilters && (
        <button
          onClick={onOpenFilters}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-night-deep border border-accent-main/20 text-foreground hover:border-crimson-light transition"
        >
          <Filter size={18} />
          Filters
        </button>
      )}
    </div>
  );
}
