"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SafeImage } from "../utils/SafeImage";
import Image from "next/image";

export default function EpicCTA() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative w-full min-h-[700px] overflow-hidden border-t border-white/40">
      {/* Background Image with Parallax */}
      <div
        className="absolute inset-0 z-0"
        style={{ transform: `translateY(${scrollY * 0.5}px)` }}
      >
        <SafeImage
          src="/images/global/Websitebgnew.png"
          alt="House Wolf Background"
          fill
          className="object-cover brightness-150"
          sizes="100vw"
          priority
        />
        {/* Gradient Overlays for depth - lighter */}
        <div className="absolute inset-0 bg-linear-to-b from-black/40 via-black/20 to-black/50" />
        <div className="absolute inset-0 bg-linear-to-r from-crimson/10 via-transparent to-steel/10" />
      </div>

      {/* Animated Glow Effect */}
      <div className="absolute inset-0 z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-crimson/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-steel/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Content */}
      <div className="relative z-20 container mx-auto px-4 py-24 md:py-32">
        <div className="max-w-5xl mx-auto text-center space-y-12">

          {/* Icon Row */}
          <div className="flex justify-center items-center gap-8 mb-8">
            <div className="animate-float">
              <SafeImage
                src="/images/divisions/locops/locops.png"
                alt="LOCOPS Division"
                width={65}
                height={65}
                className="object-contain brightness-150"
              />    
            </div>
            <div className="animate-float" style={{ animationDelay: "0.3s" }}>
              <SafeImage
                src="/images/divisions/tacops/tacops.png"
                alt="TACOPS Division"
                width={65}
                height={65}
                className="object-contain brightness-150"
              />
            </div>
            <div className="animate-float" style={{ animationDelay: "0.3s" }}>
              <SafeImage
                src="/images/divisions/leadership.png"
                alt="Leadership Division"
                width={85}
                height={85}
                className="object-contain brightness-150"
              />
            </div>
            <div className="animate-float" style={{ animationDelay: "0.6s" }}>
              <SafeImage
                src="/images/divisions/specops/specops.png"
                alt="SPECOPS Division"
                width={65}
                height={65}
                className="object-contain brightness-150"
              />
            </div>
            <div className="animate-float" style={{ animationDelay: "0.6s" }}>
              <SafeImage
                src="/images/divisions/arccops/arcops.png"
                alt="ARCCOPS Division"
                width={65}
                height={65}
                className="object-contain brightness-150"
              />
            </div>
          </div>

          {/* Main Heading */}
          <div className="space-y-6">
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight">
              <span className="block text-foreground drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                ANSWER THE CALL
              </span>
            </h2>

            <p className="text-xl md:text-2xl text-foreground/90 max-w-3xl mx-auto leading-relaxed font-light tracking-wide">
              The Dragoons stand ready. Elite warriors, bound by honor and forged in battle.
              <span className="block mt-4 text-crimson-light font-semibold">
                Will you rise to join our ranks?
              </span>
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-4 pt-8">
            <div className="px-6 py-3 bg-background-card/40 backdrop-blur-md border border-crimson/50 rounded-full text-sm font-mono tracking-wider text-foreground shadow-lg shadow-crimson/20">
              ELITE OPERATIONS
            </div>
            <div className="px-6 py-3 bg-background-card/40 backdrop-blur-md border border-steel/50 rounded-full text-sm font-mono tracking-wider text-foreground shadow-lg shadow-steel/20">
              BROTHERHOOD
            </div>
            <div className="px-6 py-3 bg-background-card/40 backdrop-blur-md border border-white/50 rounded-full text-sm font-mono tracking-wider text-foreground shadow-lg shadow-white/20">
              LEGACY
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 pt-12">
            <Link
              href="https://robertsspaceindustries.com/en/orgs/CUTTERWOLF"
              target="_blank"
              rel="noopener noreferrer"
              prefetch={false}
              className="group relative px-12 py-5 bg-linear-to-r from-crimson to-crimson-light text-foreground text-lg font-bold uppercase tracking-widest rounded-md overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(220,38,38,0.6)] border-2 border-crimson-light"
            >
              <span className="relative z-10 flex items-center gap-3">
                Join the Dragoons
                <ChevronRight className="group-hover:translate-x-2 transition-transform" size={24} />
              </span>
              <div className="absolute inset-0 bg-linear-to-r from-crimson-light to-crimson opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            <Link
              href="/origins"
              className="group px-12 py-5 bg-transparent border-2 border-steel-light text-foreground text-lg font-bold uppercase tracking-widest rounded-md transition-all duration-300 hover:bg-steel-light/10 hover:scale-105 hover:shadow-[0_0_40px_rgba(220,38,38,0.6)]"
            >
              <span className="flex items-center gap-3">
                Learn Our History
                <ChevronRight className="group-hover:translate-x-2 transition-transform" size={24} />
              </span>
            </Link>
          </div>

          {/* Bottom Tagline */}
          <div className="pt-16">
            <p className="text-sm md:text-base text-foreground/60 font-mono tracking-[0.3em] uppercase">
              This is the Way
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Edge Glow */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-crimson to-transparent opacity-50" />
    </section>
  );
}
