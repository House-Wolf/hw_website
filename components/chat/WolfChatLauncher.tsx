"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
            fixed z-50
            bottom-3 right-3
            sm:bottom-5 sm:right-5
            w-12 h-12
            sm:w-14 sm:h-14
            rounded-full
            bg-[var(--accent-strong)]
            text-white font-bold
            border border-black/30
            animate-pulse
            shadow-lg
            hover:scale-110
            transition-transform
          "
          aria-label="Open Wolf Chat"
        >
          <Image
            src="/images/global/HWiconnew.png"
            alt="Wolf Chat Icon"
            width={56}
            height={56}
            priority
            className="w-full h-full rounded-full"
          />

        </button>
      )}

      {/* Chat window */}
      {open && <WolfChatWindow onClose={() => setOpen(false)} />}
    </>
  );
}
