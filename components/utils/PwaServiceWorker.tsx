"use client";

import { useEffect } from "react";

export default function PwaServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "development") {
      let cancelled = false;
      async function removeDevelopmentWorker() {
        const expectedScript = new URL("/sw.js", window.location.origin).href;
        const controlled = navigator.serviceWorker.controller?.scriptURL === expectedScript;
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (cancelled) return;
        const owned = registrations.filter(registration =>
          [registration.active, registration.waiting, registration.installing].some(worker => worker?.scriptURL === expectedScript)
        );
        const removed = await Promise.all(owned.map(registration => registration.unregister()));
        if ("caches" in window) {
          const keys = await window.caches.keys();
          await Promise.all(keys.filter(key => key.startsWith("house-wolf-pwa-")).map(key => window.caches.delete(key)));
        }
        // Unregistration alone does not detach the controller from this page.
        // Reload only when this cleanup actually removed our controlling worker.
        if (!cancelled && controlled && removed.some(Boolean)) window.location.reload();
      }
      void removeDevelopmentWorker().catch(error => console.warn("Could not clear the development PWA cache.", error));
      return () => { cancelled = true; };
    }

    if (!window.isSecureContext) {
      return;
    }

    const controller = new AbortController();

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("House Wolf service worker registration failed.", error);
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true, signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, []);

  return null;
}
