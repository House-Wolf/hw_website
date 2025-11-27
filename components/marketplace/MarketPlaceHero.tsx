"use client";
import { JSX } from "react";
import { SafeImage } from "../utils/SafeImage";

export default function MarketplaceHero(): JSX.Element {
  return (
    <div className="relative w-full mx-auto mt-4 mb-20 sm:mb-28">
      {/* HERO WRAPPER */}
      <div
        className="relative w-full rounded-2xl group
        shadow-[0_0_40px_rgba(17,78,98,0.45)]
        h-[55vh] sm:h-[60vh] md:h-[65vh]"
      >
        {/* MAIN HERO IMAGE */}
        <SafeImage
          src="/images/marketplace/HWmarketplace.png"
          alt="Marketplace Hero Banner"
          width={2160}
          height={1440}
          className="w-full h-full object-cover opacity-90 
            group-hover:opacity-100 transition duration-500"
          priority
        />
       

      {/* OVERLAY IMAGE (CENTERED UNDER HERO) */}
      <div
        className="absolute left-1/2 top-16 sm:-bottom-20 transform -translate-x-1/2 
        w-40 sm:w-172 md:w-3xl lg:w-200 
        drop-shadow-[0_0_25px_rgba(17,78,98,0.65)]
        transition-transform duration-500 "
      >
        <SafeImage
          src="/images/marketplace/HWMPHeader.png"
          alt="Marketplace Seal"
          width={500}
          height={500}
          className="w-full h-auto object-contain"
        />
        </div>
      </div>
    </div>
  );
}
