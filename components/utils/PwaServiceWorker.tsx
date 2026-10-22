"use client";

import { useEffect } from "react";

export default function PwaServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      return;
    }

    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      return;
    }

    const controller = new AbortController();

    window.addEventListener(
      "load",
      () => {
        navigator.serviceWorker.register("/sw.js").catch((error) => {
          console.warn("House Wolf service worker registration failed.", error);
        });
      },
      { once: true, signal: controller.signal }
    );

    return () => {
      controller.abort();
    };
  }, []);

  return null;
}
