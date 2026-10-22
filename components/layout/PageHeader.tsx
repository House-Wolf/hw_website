"use client";

import React from "react";
import { SafeImage } from "@/components/utils/SafeImage";

interface HeroSectionProps {
  title?: string;
  subtitle?: string;

  iconSrc?: string;
  iconAlt?: string;

  backgroundImage?: string;
  backgroundImageOpacity?: number;
  backgroundOverlay?: string;

  minHeight?: string;

  glowColor1?: string;
  glowColor2?: string;

  children?: React.ReactNode;
}

/**
 * @component HeroSection - A customizable hero section component with background, title, subtitle, and decorative effects.
 * @description Renders a hero section with optional background image, title, subtitle, icon, and glow effects.
 * @author House Wolf Dev Team
 */
export default function HeroSection({
  title,
  subtitle,
  iconSrc,
  iconAlt = "Hero icon",

  backgroundImage,
  backgroundImageOpacity = 0.5,
  backgroundOverlay = "bg-background-elevated/95",

  minHeight = "60vh",

  glowColor1,
  glowColor2,

  children,
}: HeroSectionProps) {
  return (
    <section
      className="relative flex items-center justify-center overflow-hidden w-full"
      style={{ minHeight }}
    >
      {/* Background Image */}
      {backgroundImage && (
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <SafeImage
              src={backgroundImage}
              alt="Background"
              fill
              priority={true}
              className="object-cover"
              style={{ opacity: backgroundImageOpacity }}
            />
          </div>
        </div>
      )}

      {/* Overlay Gradient */}
      <div className={`absolute inset-0 z-0 ${backgroundOverlay}`} />

      {/* Optional static ambient lighting */}
      {glowColor1 && <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/4 left-1/4 w-96 h-96 ${glowColor1} rounded-full blur-[120px]`}
      />}
      {glowColor2 && <div
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-1/4 right-1/4 w-96 h-96 ${glowColor2} rounded-full blur-[120px]`}
      />}

      {/* Decorative Bottom Line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-white to-transparent opacity-40 z-10" />

      {/* Main Content */}
      <div className="relative z-10 text-center px-4 max-w-7xl mx-auto">
        {iconSrc && (
          <SafeImage
            src={iconSrc}
            alt={iconAlt}
            width={220}
            height={220}
            style={{ height: "auto" }}
            className="mx-auto drop-shadow-[0_0_30px_rgba(17,78,98,0.8)] mb-8"
          />
        )}
        {title && (
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-wider uppercase drop-shadow-lg">
            {title}
          </h1>
        )}

        {subtitle && (
          <>
            <div className="h-1 w-32 bg-linear-to-r from-transparent via-steel-light to-transparent mx-auto mb-8 shadow-[0_0_15px_rgba(17,78,98,0.8)]" />
            <p className="text-xl md:text-2xl text-foreground-muted italic leading-relaxed">
              {subtitle}
            </p>
          </>
        )}

        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
