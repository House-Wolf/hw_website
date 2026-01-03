"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    FleetYardsFleetchartConfig?: FleetYardsFleetchartConfig;
  }
}

interface FleetYardsFleetchartConfig {
  details: boolean;
  grouped: boolean;
  fleetchart: boolean;
  fleetchartGrouped: boolean;
  fleetchartScale: number;
  groupedButton: boolean;
  fleetchartSlider: boolean;
  fleetId: string;
}

const MIN_SPINNER_TIME = 7000;

export default function FleetyardsEmbed() {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [delayDone, setDelayDone] = useState(false);

  /* ⏱️ Spinner minimum duration */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDelayDone(true);
    }, MIN_SPINNER_TIME);

    return () => clearTimeout(timer);
  }, []);

  /* 🌐 Load Fleetyards embed */
  useEffect(() => {
    if (document.getElementById("fleetyards-embed")) return;

    window.FleetYardsFleetchartConfig = {
      details: true,
      grouped: false,
      fleetchart: false,
      fleetchartGrouped: false,
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
      "
    >
      {/* 🔄 Spinner Overlay */}
      {showSpinner && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative">
            <div className="h-20 w-20 rounded-full border-4 border-white/10 border-t-[#470000] animate-spin" />
            <div className="absolute inset-0 rounded-full blur-xl bg-[#470000]/30" />
          </div>

          <p className="mt-6 text-sm tracking-widest uppercase text-white/70">
            Fleet Command Uplink
          </p>
          <p className="mt-1 text-xs text-white/40">
            Synchronizing fleet telemetry…
          </p>
        </div>
      )}

      {/* 🚀 Fleetyards Render Target */}
      <div id="fleetyards-view" className="absolute inset-0" />
    </div>
  );
}
