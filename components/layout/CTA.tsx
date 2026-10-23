"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SafeImage } from "../utils/SafeImage";

/**
 * @component CTA Section with a steady background and prominent CTA buttons.
 * @description Call to action with static ambient lighting and division insignia.
 * @returns {JSX.Element} The CTA section component.
 * @author House Wolf Dev Team
 */

export default function EpicCTA() {
  return (
    <section className="relative w-full min-h-[700px] overflow-hidden border-t border-white/40">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <SafeImage
          src="/images/global/Events Background.jpg"
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

      {/* Steady ambient lighting */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-crimson/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-steel/30 rounded-full blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-20 container mx-auto px-4 py-24 md:py-32">
        <div className="max-w-5xl mx-auto text-center space-y-8 sm:space-y-10">

          {/* Icon Row */}
          <div className="flex justify-center items-center gap-8 mb-8">
            <div className="animate-float">
              <SafeImage
                src="/images/divisions/locops/locops.png"
                alt="LOCOPS Division"
                width={65}
                height={65}
                className="object-contain object-center brightness-150"
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
                src="/images/divisions/arcops/arcops.png"
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

            <p className="text-xl md:text-2xl text-white max-w-3xl mx-auto leading-relaxed font-light tracking-wide [text-shadow:0_2px_4px_rgb(0_0_0/90%),0_4px_12px_rgb(0_0_0/70%)]">
              The Dragoons stand ready. Elite warriors, bound by honor and forged in battle.
              <span className="block mt-4 text-white font-semibold drop-shadow-lg">
                Will you rise to join our ranks?
              </span>
            </p>
          </div>

          {/* Values are supporting text; the actions sit below. */}
          <ul aria-label="House Wolf values" className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-black/20 px-5 py-2.5 text-[11px] font-mono font-normal uppercase tracking-[0.12em] text-white/85 [text-shadow:0_1px_4px_rgb(0_0_0/85%)] sm:text-xs">
            {["Elite operations", "Brotherhood", "Legacy"].map((value, index) => (
              <li key={value} className="flex items-center gap-4">
                {index > 0 && <span aria-hidden="true" className="h-0.5 w-0.5 rounded-full bg-white/45" />}
                {value}
              </li>
            ))}
          </ul>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
            <Link
              href="/onboarding"
              prefetch={false}
              className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-white/15 bg-crimson px-7 py-3 text-base font-semibold text-white transition-colors hover:bg-crimson-light focus-visible:outline-white sm:w-auto"
            >
              Join the Dragoons <ChevronRight size={18} aria-hidden="true" />
            </Link>

            <Link
              href="/origins"
              className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-white/25 bg-black/50 px-7 py-3 text-base font-semibold text-white transition-colors hover:bg-black/70 focus-visible:outline-white sm:w-auto"
            >
              Learn our history <ChevronRight size={18} aria-hidden="true" />
            </Link>
          </div>

          {/* Bottom Tagline */}
          <div className="pt-4">
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
