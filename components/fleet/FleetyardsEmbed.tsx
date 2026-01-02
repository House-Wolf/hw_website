"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    FleetYardsFleetchartConfig?: any;
  }
}

const MIN_SPINNER_TIME = 5000; // cinematic but not annoying

export default function FleetyardsEmbed() {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [delayDone, setDelayDone] = useState(false);
  const [telemetryOnline, setTelemetryOnline] = useState(false);

  /* ⏳ Minimum spinner time */
  useEffect(() => {
    const timer = setTimeout(() => setDelayDone(true), MIN_SPINNER_TIME);
    return () => clearTimeout(timer);
  }, []);

  /* 🚀 Load Fleetyards script */
  useEffect(() => {
    if (document.getElementById("fleetyards-embed")) {
      setScriptLoaded(true);
      return;
    }

    window.FleetYardsFleetchartConfig = {
      details: true,
      grouped: true,
      fleetchart: true,
      fleetchartGrouped: true,
      fleetchartScale: 50,
      groupedButton: true,
      fleetchartSlider: true,
      fleetId: "hw-flt-001",
    };

    const script = document.createElement("script");
    script.id = "fleetyards-embed";
    script.src = "https://fleetyards.net/embed-v2.js";
    script.async = true;

    script.onload = () => {
      setScriptLoaded(true);
      setTimeout(() => setTelemetryOnline(true), 600);
    };

    document.body.appendChild(script);
  }, []);

  const showSpinner = !(scriptLoaded && delayDone);

  return (
    <div
      className="
        relative
        w-full
        h-full
        rounded-2xl
        overflow-y-scroll-hidden
        contain-layout
      "
    >
      <div
        className="
    absolute inset-0
    bg-[url('/images/global/wolf-sigil.svg')]
    bg-center bg-no-repeat bg-contain
    opacity-[0.02]
    pointer-events-none
    z-0
  "
      />
      {/* 🔴 Spinner Overlay */}
      <div
        className={`
          absolute inset-0 z-20
          flex flex-col items-center justify-center
          bg-black/70 backdrop-blur-sm
          transition-opacity duration-700
          ${showSpinner ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
      >
        <div className="relative">
          <div className="h-20 w-20 rounded-full border-4 border-white/10 border-t-[#470000] animate-spin" />
          <div className="absolute inset-0 rounded-full blur-xl bg-[#470000]/30" />
        </div>

        <p
          className="
            mt-6
            text-sm
            uppercase
            text-white/70
            tracking-[0.4em]
            animate-[tracking-tight_1s_ease-out_forwards]
          "
        >
          Fleet Command Uplink
        </p>
        <p className="mt-1 text-xs text-white/40">
          Synchronizing fleet telemetry…
        </p>
      </div>

      {/* 🧭 Fleetyards Embed */}
      <div
        id="fleetyards-view"
        className={`
          absolute inset-0
          transition-opacity duration-700
          ${showSpinner ? "opacity-0" : "opacity-100"}
        `}
      />
    </div>
  );
}
