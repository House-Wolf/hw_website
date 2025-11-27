"use client";

import { JSX } from "react";  
import Image from "next/image";
import { SafeImage } from "../utils/SafeImage";

interface CategoryBarProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
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

export default function CategoryBar({ categories, selected, onSelect }: CategoryBarProps): JSX.Element {
  return (
    <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-5 px-2">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full 
            text-sm font-semibold transition-all duration-300 border backdrop-blur-sm
            ${
              selected === cat
                ? "bg-steel-light text-black shadow-lg shadow-steel/40 border-steel"
                : "bg-[#1a1a1a]/80 hover:bg-[#252525] text-gray-300 hover:text-steel-light border-gray-700"
            }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
