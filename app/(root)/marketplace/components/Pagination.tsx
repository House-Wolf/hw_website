"use client";

import { Dispatch, SetStateAction } from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  setItemsPerPage?: Dispatch<SetStateAction<number>>;
  totalItems?: number;
}

/**
 * @component Pagination
 * @description A pagination component that displays page numbers and navigation controls.
 * @param {number} currentPage - The current active page.
 * @param {number} totalPages - The total number of pages.
 * @param {function} onPageChange - Callback function to handle page changes.
 * @param {number} [itemsPerPage] - (Optional) Number of items displayed per page.
 * @param {function} [setItemsPerPage] - (Optional) Function to set the number of items per page.
 * @param {number} [totalItems] - (Optional) Total number of items across all pages.
 * @returns {JSX.Element} The rendered Pagination component.
 * @author House Wolf Dev Team
 */
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  setItemsPerPage,
  totalItems
}: PaginationProps) {
  const createPageArray = () => {
    const pages = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push("...");

      pages.push(totalPages);
    }

    return pages;
  };

  const pages = createPageArray();

  return (
    <div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
      {/* PREVIOUS */}
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className={`px-3 py-2 rounded-lg border transition ${
          currentPage === 1
            ? "border-accent-main/10 text-foreground-muted cursor-not-allowed"
            : "border-accent-main/30 text-foreground hover:border-steel-light"
        }`}
      >
        Prev
      </button>

      {/* PAGE NUMBERS */}
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={i} className="px-2 text-foreground-muted">
            ...
          </span>
        ) : (
          <button
            key={i}
            onClick={() => onPageChange(Number(p))}
            className={`px-3 py-2 rounded-lg border transition ${
              currentPage === p
                ? "border-crimson-light bg-crimson-dark/30 text-crimson-light"
                : "border-accent-main/20 text-foreground hover:border-steel-light"
            }`}
          >
            {p}
          </button>
        )
      )}

      {/* NEXT */}
      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className={`px-3 py-2 rounded-lg border transition ${
          currentPage === totalPages
            ? "border-accent-main/10 text-foreground-muted cursor-not-allowed"
            : "border-accent-secondary/30 text-foreground hover:border-crimson-light"
        }`}
      >
        Next
      </button>

      {typeof itemsPerPage === "number" &&
        setItemsPerPage && (
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="ml-4 px-2 py-1 rounded border border-accent-main/20 bg-night-deep text-sm text-foreground"
          >
            {[12, 24, 48].map((count) => (
              <option key={count} value={count}>
                {count} / page
              </option>
            ))}
          </select>
        )}

      {typeof totalItems === "number" && (
        <span className="text-sm text-foreground-muted ml-2">
          Total: {totalItems}
        </span>
      )}
    </div>
  );
}
