"use client";

import { JSX } from "react";  
import Image from "next/image";
import { SafeImage } from "../utils/SafeImage";

interface CategoryBarProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
  className?: string;
  activeClassName?: string;
}

/**
 * @component CategoryBar - A component that displays a horizontal list of category buttons.
 * @description This component renders a list of categories as buttons. Each button displays an icon and the category name.
 * When a button is clicked, it calls the provided onSelect function with the selected category.
 * @param param0 - The props for the CategoryBar component.
 * @param param0.categories - The list of categories to display.
 * @param param0.selected - The currently selected category.
 * @param param0.onSelect - The function to call when a category is selected.
 * @returns JSX.Element - The rendered CategoryBar component.
 * @author House Wolf Dev Team
 */
 
const categories = ["All", "Weapons", "Armor", "Clothing", "Components", "Items", "Services", "Rentals", "Misc"];

export default function CategoryBar({
  categories,
  selected,
  onSelect,
  className,
  activeClassName,
}: CategoryBarProps): JSX.Element {
  return (
    <div className={`flex flex-wrap justify-center gap-2 md:gap-3 mb-5 px-2 ${className ?? ""}`}>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full 
            text-sm font-semibold transition-all duration-300 border backdrop-blur-sm ${
              selected === cat
                ? activeClassName ||
                  "bg-[var(--accent-strong)] text-white shadow-lg shadow-[var(--accent-strong)]/40 border-[var(--accent-strong)]"
                : "bg-[var(--background-secondary)]/80 hover:bg-[var(--background-secondary)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border-[var(--border-soft)] hover:border-[var(--accent-strong)]/50"
            }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
