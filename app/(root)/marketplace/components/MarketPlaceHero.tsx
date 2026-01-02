"use client";

import React, { JSX, useEffect, useState } from "react";
import { SafeImage } from "../../../../components/utils/SafeImage";

/**
 * @component MarketplaceHero
 * @description Hero section for the Marketplace page with parallax, glitch effects, and animated overlays.
 * @returns {JSX.Element} The MarketplaceHero component.
 * @author House Wolf Dev Team
 */
export default function MarketplaceHero(): JSX.Element {
  const [scrollY, setScrollY] = useState(0);
  const [showGlitch, setShowGlitch] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Generate error code when glitch shows
  useEffect(() => {
    if (showGlitch) {
      // Defer state update to avoid cascading render
      const timer = setTimeout(() => {
        setErrorCode(Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0'));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [showGlitch]);

  useEffect(() => {
    // Throttle scroll handler for better performance
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Canvas static noise generator - OPTIMIZED with throttling
  useEffect(() => {
    if (!showGlitch || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = Math.min(canvas.offsetWidth, 800); // Limit canvas size
    canvas.height = Math.min(canvas.offsetHeight, 600);

    let animationId: number;
    let lastFrame = 0;
    const fps = 15; // Reduce from 60fps to 15fps
    const interval = 1000 / fps;

    const drawStatic = (timestamp: number) => {
      if (timestamp - lastFrame < interval) {
        animationId = requestAnimationFrame(drawStatic);
        return;
      }
      lastFrame = timestamp;

      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;

      // Draw every 4th pixel for better performance
      for (let i = 0; i < data.length; i += 16) {
        const color = Math.random() * 255;
        data[i] = color;     // Red
        data[i + 1] = color; // Green
        data[i + 2] = color; // Blue
        data[i + 3] = 200;   // Alpha
      }

      ctx.putImageData(imageData, 0, 0);
      animationId = requestAnimationFrame(drawStatic);
    };

    animationId = requestAnimationFrame(drawStatic);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [showGlitch]);

  useEffect(() => {
    const triggerGlitch = () => {
      setShowGlitch(true);
      setTimeout(() => setShowGlitch(false), 5000); // Reduced from 10s to 5s
    };

    const scheduleNextGlitch = () => {
      // Random interval between 10-15 minutes (increased from 5-10)
      const nextGlitchDelay = 600000 + Math.random() * 300000;

      setTimeout(() => {
        triggerGlitch();
        scheduleNextGlitch();
      }, nextGlitchDelay);
    };

    // Initial delay before first glitch (5-10 minutes) - much longer
    const initialDelay = 300000 + Math.random() * 300000;
    const initialTimer = setTimeout(() => {
      triggerGlitch();
      scheduleNextGlitch();
    }, initialDelay);

    return () => clearTimeout(initialTimer);
  }, []);

  return (
    <div className="relative w-full mx-auto mt-4 mb-20 sm:mb-28">
      {/* HERO WRAPPER */}
      <div
        className="relative w-full rounded-2xl overflow-hidden group
        shadow-[0_0_60px_rgba(17,78,98,0.6),0_0_120px_rgba(71,0,0,0.3)]
        h-[55vh] sm:h-[60vh] md:h-[65vh]
        border border-[var(--hw-steel-teal)]/30"
      >
        {/* ANIMATED GRADIENT OVERLAYS */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--hw-dark-crimson)]/20 via-transparent to-[var(--hw-steel-teal)]/20
          animate-pulse pointer-events-none z-10 mix-blend-overlay"
          style={{ animationDuration: "6s" }}
        />

        {/* SCANNING LINE EFFECT */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--hw-steel-teal)] to-transparent
            animate-scan opacity-60" />
        </div>

        {/* CORNER ACCENTS */}
        <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-[var(--hw-steel-teal)]/60 z-20" />
        <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-[var(--hw-steel-teal)]/60 z-20" />
        <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-[var(--hw-dark-crimson)]/60 z-20" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-[var(--hw-dark-crimson)]/60 z-20" />

        {/* MAIN HERO IMAGE WITH PARALLAX */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translateY(${scrollY * 0.3}px) scale(${1 + scrollY * 0.0002})`,
            transition: "transform 0.1s ease-out"
          }}
        >
          <SafeImage
            src="/images/marketplace/HWmarketplace.png"
            alt="Marketplace Hero Banner"
            width={2160}
            height={1440}
            className="w-full h-full object-cover opacity-85
              group-hover:opacity-75 transition-all duration-500"
            priority
          />
        </div>

        {/* VIGNETTE OVERLAY */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/60 pointer-events-none z-10" />

        {/* GRID OVERLAY FOR TECH AESTHETIC */}
        <div className="absolute inset-0 opacity-[0.03] z-10 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(var(--hw-steel-teal) 1px, transparent 1px),
                            linear-gradient(90deg, var(--hw-steel-teal) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        {/* GLITCH STATIC OVERLAY WITH TRANSMISSION LOST */}
        {showGlitch && (
          <div className="absolute inset-0 z-40 pointer-events-none">
            {/* Canvas-based realistic static noise */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full opacity-90 mix-blend-overlay"
            />

            {/* Dark overlay for contrast */}
            <div className="absolute inset-0 bg-black/60" />

            {/* Scan lines overlay */}
            <div className="absolute inset-0 opacity-30"
              style={{
                background: `repeating-linear-gradient(
                  0deg,
                  transparent 0px,
                  rgba(255, 255, 255, 0.03) 1px,
                  transparent 2px
                )`
              }}
            />

            {/* Random horizontal glitch bars */}
            <div className="absolute inset-0 opacity-40">
              {[...Array(5)].map((_, i) => {
                const seed = (i * 6151) % 100;
                return (
                  <div
                    key={i}
                    className="absolute left-0 right-0 bg-red-600/30 animate-pulse"
                    style={{
                      top: `${seed}%`,
                      height: '2px',
                      animationDelay: `${i * 0.2}s`,
                      animationDuration: '0.3s'
                    }}
                  />
                );
              })}
            </div>

            {/* TRANSMISSION LOST text */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center text-red-900 space-y-3">
                {/* Main text - Solid dark red, no animation */}
                <div className="text-2xl md:text-4xl font-black uppercase tracking-wider text-red-900">
                  TRANSMISSION LOST
                </div>

                {/* Subtitle */}
                <div className="text-xs md:text-sm text-red-800/90 font-mono tracking-[0.3em] uppercase opacity-80">
                  ◆ SIGNAL INTERRUPTED ◆
                </div>

                {/* Signal bars */}
                <div className="flex justify-center gap-1 mt-4">
                  {[...Array(12)].map((_, i) => {
                    const seed = (i * 4373) % 20;
                    return (
                      <div
                        key={i}
                        className="w-1 bg-red-800 animate-pulse shadow-[0_0_4px_rgba(180,0,0,0.5)]"
                        style={{
                          height: `${8 + seed}px`,
                          animationDelay: `${i * 0.08}s`,
                          animationDuration: '0.4s'
                        }}
                      />
                    );
                  })}
                </div>

                {/* Error code */}
                <div className="text-[10px] md:text-xs text-red-700/70 font-mono mt-3 tracking-widest">
                  ERROR CODE: 0x{errorCode}
                </div>
              </div>
            </div>

            {/* Flickering overlay for additional effect */}
            <div className="absolute inset-0 bg-black animate-flicker opacity-20" />
          </div>
        )}

        {/* OVERLAY IMAGE (CENTERED BOTH HORIZONTALLY AND VERTICALLY) WITH ENHANCED EFFECTS */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          w-75 sm:w-100 md:w-150 lg:w-200 xl:w-275 z-30
          drop-shadow-[0_0_40px_rgba(17,78,98,0.9)]
          group-hover:drop-shadow-[0_0_60px_rgba(17,78,98,1)]"
        >
          {/* GLOW RING BEHIND SEAL */}
          <div className="absolute inset-0 bg-gradient-radial from-[var(--hw-steel-teal)]/30 via-[var(--hw-steel-teal)]/10 to-transparent
            blur-2xl scale-110 animate-pulse" style={{ animationDuration: "3s" }} />

          <SafeImage
            src="/images/marketplace/HWMPHeader.png"
            alt="Marketplace Seal"
            width={1000}
            height={1000}
            className="w-full h-auto object-contain relative z-10
              group-hover:brightness-110 transition-all duration-500"
          />
        </div>

        {/* AMBIENT PARTICLES */}
        <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
          {[...Array(8)].map((_, i) => {
            // Deterministic pseudo-random values based on index
            const seed1 = (i * 7919) % 100;
            const seed2 = (i * 6151) % 100;
            const seed3 = (i * 4373) % 2;
            return (
              <div
                key={i}
                className="absolute w-1 h-1 bg-[var(--hw-steel-teal)] rounded-full opacity-40 animate-float-particle"
                style={{
                  left: `${seed1}%`,
                  top: `${seed2}%`,
                  animationDelay: `${i * 0.7}s`,
                  animationDuration: `${3 + seed3}s`
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
