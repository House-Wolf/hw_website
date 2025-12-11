"use client";

import { JSX } from "react";

interface CategoryBarProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
  className?: string;
  activeClassName?: string;
}

/**
 * @component CategoryBar - Enhanced category filter with tactical design
 * @description Displays marketplace categories with smooth animations and House Wolf styling
 * @author House Wolf Dev Team
 */
const categoryIcons: Record<string, string> = {
  All: "M4 6h16M4 12h16M4 18h16",
  Weapons:
    "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  Armor: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  Clothing:
    "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  Components:
    "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
  Items: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  Services:
    "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  Rentals: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
  Misc: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
};

/**
 *@component CategoryBar
 *@description A visually engaging category bar for marketplace filtering with House Wolf design elements.
 *@param {CategoryBarProps} props - The properties for the CategoryBar component.
 *@returns {JSX.Element} The rendered CategoryBar component.
 *@author House Wolf Dev Team
 */
export default function CategoryBar({
  categories,
  selected,
  onSelect,
  className,
  activeClassName,
}: CategoryBarProps): JSX.Element {
  return (
    <div className={`relative ${className ?? ""}`}>
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--hw-steel-teal)]/5 to-transparent blur-xl" />

      <div className="relative flex flex-wrap justify-center gap-3 mb-5 px-2">
        {categories.map((cat, index) => {
          const isSelected = selected === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelect(cat)}
              className={`group relative flex items-center gap-2 px-5 py-2.5 rounded-lg
                text-sm font-bold uppercase tracking-wider
                transition-all duration-500 ease-out
                overflow-hidden cursor-pointer
                ${
                  isSelected
                    ? activeClassName ||
                      `bg-gradient-to-r from-[var(--hw-steel-teal)] to-[var(--hw-steel-teal)]/80
                      text-white border-2 border-[var(--hw-steel-teal)]/70
                      shadow-[0_0_25px_rgba(17,78,98,0.5)]
                      scale-105`
                    : `bg-[var(--background-elevated)]/60 backdrop-blur-sm
                      text-[var(--text-secondary)]
                      border-2 border-[var(--hw-steel-teal)]/20
                      hover:bg-[var(--background-elevated)]/80
                      hover:text-[var(--text-primary)]
                      hover:border-[var(--hw-steel-teal)]/40
                      hover:shadow-[0_0_15px_rgba(17,78,98,0.25)]
                      hover:scale-102`
                }`}
              style={{
                transitionDelay: `${index * 30}ms`,
              }}
            >
              {/* Animated Background Shimmer */}
              {isSelected && (
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent
                  translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"
                />
              )}

              {/* Category Icon */}
              <svg
                className={`w-4 h-4 transition-all duration-300
                  ${
                    isSelected
                      ? "text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]"
                      : "text-[var(--hw-steel-teal)]/60 group-hover:text-[var(--hw-steel-teal)]"
                  }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={categoryIcons[cat] || categoryIcons["All"]}
                />
              </svg>

              {/* Category Name */}
              <span className="relative z-10">{cat}</span>

              {/* Active Indicator Line */}
              {isSelected && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              )}

              {/* Corner Accents for Active */}
              {isSelected && (
                <>
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/40" />
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
