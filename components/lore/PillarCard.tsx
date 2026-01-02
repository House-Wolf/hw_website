"use client";

import { SafeImage } from "@/components/utils/SafeImage";
import { JSX } from "react";

interface PillarCardProps {
  title: string;
  image: string;
  children: JSX.Element | JSX.Element[];
}


/**
 * @component PillarCard
 * @description Reusable visual card for the Dragoon Code pillars (Strength, Honor, Death)
 * @param {PillarCardProps} props - The properties for the PillarCard component
 * @returns {JSX.Element} The rendered PillarCard component
 * @author House Wolf Dev Team
 */
export default function PillarCard({ title, image, children } : PillarCardProps): JSX.Element {
  return (
    <div
      className="
        bg-[#06202A]/70
        border border-steel/40
        rounded-xl
        shadow-[0_0_20px_rgba(0,0,0,0.4)]
        hover:shadow-[0_0_35px_rgba(0,0,0,0.6)]
        transition-all
        p-6
      "
    >
      {/* Image */}
      <div className="rounded-lg overflow-hidden mb-6">
        <SafeImage
          src={image}
          alt={title}
          width={400}
          height={400}
          className="w-full h-auto object-cover"
        />
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold text-steel-light text-center mb-4 uppercase tracking-wide">
        {title}
      </h3>

      {/* Content */}
      <div className="text-foreground-muted leading-relaxed text-center">
        {children}
      </div>
    </div>
  );
}