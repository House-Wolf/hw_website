"use client";

import { useEffect, useState, useRef } from "react";

declare global {
  interface Window {
    FleetYardsFleetchartConfig?: FleetYardsFleetchartConfig;
    FleetYardsFleetchart?: unknown;
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

export default function FleetyardsEmbed() {
  const [embedReady, setEmbedReady] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (document.getElementById("fleetyards-embed")) {
      // Script already loaded from a previous navigation — poll for mount
      pollForMount();
      return;
    }

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
    script.onload = pollForMount;
    document.body.appendChild(script);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function pollForMount() {
    // window.FleetYardsFleetchart is set by the embed after Vue mounts
    pollRef.current = setInterval(() => {
      if (window.FleetYardsFleetchart) {
        clearInterval(pollRef.current!);
        setEmbedReady(true);
      }
    }, 200);

    // Safety: hide spinner after 15s regardless
    setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
      setEmbedReady(true);
    }, 15000);
  }

  return (
    <div className="relative w-full min-h-[700px]">
      {/* Spinner Overlay */}
      {!embedReady && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center min-h-[700px]">
          <div className="relative">
            <div className="h-20 w-20 rounded-full border-4 border-white/20 border-t-red-700 animate-spin" />
            <div className="absolute inset-0 rounded-full blur-xl bg-red-900/20" />
          </div>
          <p className="mt-6 text-sm tracking-widest uppercase text-white/70">
            Fleet Command Uplink
          </p>
          <p className="mt-1 text-xs text-white/40">
            Synchronizing fleet telemetry…
          </p>
        </div>
      )}

      {/* Fleetyards Render Target */}
      <div id="fleetyards-view" className="w-full" />
    </div>
  );
}
