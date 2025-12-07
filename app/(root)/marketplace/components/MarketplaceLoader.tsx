"use client";

import { useEffect, useState, useRef } from "react";

/**
 * @component MarketplaceLoader
 * @description A visually engaging loader component for the Iron Fang Marketplace.
 * It features animated rotating rings, a pulsing hexagon with crossed tomahawks,
 * dynamic scan lines, and data stream indicators. The loader also plays a subtle
 * space-themed audio clip that fades out as the loader disappears.   
 * @returns {JSX.Element} The rendered MarketplaceLoader component.
 * @author House Wolf Dev Team
 */
export default function MarketplaceLoader() {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create and configure audio element
    const audio = new Audio("/audio/space.mp3");
    audio.volume = 0.3; // Set to 30% volume (audible but not overwhelming)
    audio.loop = false; // Don't loop the audio
    audioRef.current = audio;

    // Play audio when component mounts
    const playPromise = audio.play();

    // Handle play promise to avoid unhandled rejection
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        // Auto-play was prevented (common in browsers)
        console.log("Audio autoplay prevented:", error);
      });
    }

    // Fade out audio over 1 second before loader disappears
    let fadeInterval: NodeJS.Timeout | null = null;
    const startFadeOut = () => {
      if (!audioRef.current) return;

      const fadeDuration = 1000; // 1 second fade
      const fadeSteps = 20; // Number of volume steps
      const stepDuration = fadeDuration / fadeSteps;
      const volumeStep = audioRef.current.volume / fadeSteps;

      fadeInterval = setInterval(() => {
        if (audioRef.current && audioRef.current.volume > 0) {
          audioRef.current.volume = Math.max(0, audioRef.current.volume - volumeStep);
        } else {
          if (fadeInterval) clearInterval(fadeInterval);
        }
      }, stepDuration);
    };

    // Start fade out after 1.5 seconds
    const fadeTimeout = setTimeout(() => {
      startFadeOut();
      // Trigger animation out after audio starts fading
      setIsAnimatingOut(true);
    }, 1500);

    // Cleanup: stop audio when component unmounts
    return () => {
      clearTimeout(fadeTimeout);
      if (fadeInterval) clearInterval(fadeInterval);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[#0b0b0f] backdrop-blur-sm transition-opacity duration-500 ${isAnimatingOut ? 'opacity-0' : 'opacity-100'}`}>
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(239, 68, 68, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(239, 68, 68, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'grid-scroll 20s linear infinite'
        }} />
      </div>

      {/* Main loader container */}
      <div className="relative">
        {/* Outer rotating ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-64 h-64 rounded-full border-2 border-red-500/30 animate-spin-slow"
               style={{ animationDuration: '8s' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/50" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50" />
          </div>
        </div>

        {/* Middle rotating ring (opposite direction) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 rounded-full border-2 border-red-600/40 animate-spin-reverse"
               style={{ animationDuration: '6s' }}>
            <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-red-400 rounded-full shadow-lg shadow-red-400/50" />
            <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-red-400 rounded-full shadow-lg shadow-red-400/50" />
          </div>
        </div>

        {/* Central hexagon with pulse */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Hexagon background */}
          <div className="absolute inset-0 flex items-center justify-center animate-pulse-glow">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#dc2626', stopOpacity: 0.8 }} />
                  <stop offset="100%" style={{ stopColor: '#ef4444', stopOpacity: 0.8 }} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <polygon
                points="50,5 90,30 90,70 50,95 10,70 10,30"
                fill="url(#hexGradient)"
                stroke="#ef4444"
                strokeWidth="2"
                filter="url(#glow)"
                className="animate-rotate-slow"
              />
            </svg>
          </div>

          {/* Inner icon (crossed tomahawks) */}
          <div className="relative z-10 animate-float">
            <svg viewBox="0 0 100 100" className="w-16 h-16 text-white drop-shadow-lg">
              {/* First tomahawk (top-left to bottom-right) */}
              <g transform="rotate(45 50 50)" fill="currentColor">
                {/* Handle */}
                <rect x="47" y="15" width="6" height="70" rx="2" className="opacity-90"/>
                {/* Blade */}
                <path d="M 35 18 L 50 10 L 65 18 L 60 28 L 40 28 Z" className="fill-red-400"/>
                {/* Spike */}
                <path d="M 48 78 L 50 88 L 52 78 Z" className="opacity-90"/>
              </g>

              {/* Second tomahawk (top-right to bottom-left) */}
              <g transform="rotate(-45 50 50)" fill="currentColor">
                {/* Handle */}
                <rect x="47" y="15" width="6" height="70" rx="2" className="opacity-90"/>
                {/* Blade */}
                <path d="M 35 18 L 50 10 L 65 18 L 60 28 L 40 28 Z" className="fill-red-400"/>
                {/* Spike */}
                <path d="M 48 78 L 50 88 L 52 78 Z" className="opacity-90"/>
              </g>

              {/* Center ring/binding */}
              <circle cx="50" cy="50" r="8" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-80"/>
            </svg>
          </div>

          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-red-400 animate-pulse" />
          <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-red-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-orange-400 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-orange-400 animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        {/* Scan lines */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="h-1 w-full bg-linear-to-r from-transparent via-red-500/50 to-transparent animate-scan" />
        </div>

        {/* Loading text */}
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
          <p className="text-red-400 font-semibold text-lg tracking-widest animate-pulse">
            ACCESSING IRON FANG MARKETPLACE
          </p>
          <div className="flex gap-1 justify-center mt-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>

        {/* Data stream indicators (left side) */}
        <div className="absolute -left-32 top-1/2 -translate-y-1/2 space-y-1">
          {[...Array(5)].map((_, i) => {
            const width = 24 + ((i * 13) % 28); // deterministic width to avoid hydration mismatch
            return (
              <div
                key={i}
                className="h-0.5 bg-red-500/60 animate-data-stream"
                style={{
                  width: `${width}px`,
                  animationDelay: `${i * 0.2}s`
                }}
              />
            );
          })}
        </div>

        {/* Data stream indicators (right side) */}
        <div className="absolute -right-32 top-1/2 -translate-y-1/2 space-y-1">
          {[...Array(5)].map((_, i) => {
            const width = 26 + ((i * 17) % 26); // deterministic width to avoid hydration mismatch
            return (
              <div
                key={i}
                className="h-0.5 bg-orange-400/60 animate-data-stream-reverse"
                style={{
                  width: `${width}px`,
                  animationDelay: `${i * 0.2}s`
                }}
              />
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 1;
            filter: drop-shadow(0 0 20px rgba(220, 38, 38, 0.6));
          }
          50% {
            opacity: 0.8;
            filter: drop-shadow(0 0 30px rgba(239, 68, 68, 0.8));
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes scan {
          0% { transform: translateY(-100px); }
          100% { transform: translateY(400px); }
        }

        @keyframes data-stream {
          0% {
            width: 0;
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            width: 60px;
            opacity: 0;
          }
        }

        @keyframes data-stream-reverse {
          0% {
            width: 0;
            opacity: 0;
            margin-left: auto;
          }
          50% {
            opacity: 1;
          }
          100% {
            width: 60px;
            opacity: 0;
            margin-left: 0;
          }
        }

        @keyframes grid-scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }

        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        .animate-spin-reverse {
          animation: spin-reverse 6s linear infinite;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-scan {
          animation: scan 3s linear infinite;
        }

        .animate-data-stream {
          animation: data-stream 2s ease-out infinite;
        }

        .animate-data-stream-reverse {
          animation: data-stream-reverse 2s ease-out infinite;
        }

        .animate-rotate-slow {
          animation: rotate-slow 20s linear infinite;
          transform-origin: center;
        }
      `}</style>
    </div>
  );
}
