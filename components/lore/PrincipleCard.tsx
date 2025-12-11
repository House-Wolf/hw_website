"use client";

import { JSX } from "react";

interface PrincipleCardProps {
  index: number;
  title: string;
  description: string;
  color: "crimson" | "steel";
} 

const COLOR_MAP = {
  crimson: {
    border: "border-crimson",
    title: "text-crimson-light",
    iconBg: "bg-crimson to-crimson-light",
    gradientFrom: "from-crimson-dark/20",
    gradientTo: "to-obsidian",
    shadow: "hover:shadow-crimson-glow",
  },
  steel: {
    border: "border-steel",
    title: "text-steel-light",
    iconBg: "bg-steel to-steel-light",
    gradientFrom: "from-steel-dark/20",
    gradientTo: "to-obsidian",
    shadow: "hover:shadow-steel-glow",
  },
};

/**
 * @component PrincipleCard
 * @description Reusable card for each of the Six Principles (Resol'nare).
 * @props
 *  - title: The title of the principle.
 *  - description: A brief description of the principle.
 *  - index: The principle number (1–6).
 *  - color: "crimson" | "steel" for styling.
 * @return JSX.Element
 * @author House Wolf Dev Team
 */
export default function PrincipleCard({ index, title, description } : PrincipleCardProps): JSX.Element {
  return (
    <div
      className="
        bg-[#06202A]/70
        border border-steel/40
        rounded-xl
        p-6
        shadow-[0_0_20px_rgba(0,0,0,0.4)]
        hover:shadow-[0_0_35px_rgba(0,0,0,0.6)]
        transition-all
      "
    >
      <div className="flex items-start gap-4">
        <div className="
            shrink-0 w-12 h-12 
            rounded-lg 
            bg-steel/20 
            flex items-center justify-center
            text-xl font-bold text-steel-light
        ">
          {index}
        </div>

        <div>
          <h3 className="text-xl font-bold text-steel-light mb-2">{title}</h3>
          <p className="text-foreground-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}