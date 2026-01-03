"use client";

import { useState, useEffect } from "react";
import WolfChatWindow from "@/components/chat/WolfChatWindow";

export default function WolfChatLauncher() {
  const [open, setOpen] = useState(false);

  // Auto-open once per session
  useEffect(() => {
    const seen = sessionStorage.getItem("wolfChatOpened");
    if (!seen) {
      setTimeout(() => {
        setOpen(true);
        sessionStorage.setItem("wolfChatOpened", "true");
      }, 1200);
    }
  }, []);

  return (
    <>
      {/* Launcher button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="
            fixed bottom-5 right-5 z-50
            w-14 h-14 rounded-full
            bg-[var(--accent-strong)]
            text-white font-bold
            border border-black/30
            animate-pulse
          "
          aria-label="Open Wolf Chat"
        >
          🐺
        </button>
      )}

      {/* Chat window */}
      {open && <WolfChatWindow onClose={() => setOpen(false)} />}
    </>
  );
}
