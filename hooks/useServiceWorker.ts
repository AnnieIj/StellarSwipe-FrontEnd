"use client";

import { useEffect, useState } from "react";

/**
 * Registers the service worker and tracks online/offline state.
 * Returns `isOffline` — true when the browser has lost network connectivity.
 */
export function useServiceWorker() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Register SW (skip in dev to avoid caching stale assets)
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("SW registration failed:", err);
      });
    }

    function handleOffline() { setIsOffline(true); }
    function handleOnline()  { setIsOffline(false); }

    setIsOffline(!navigator.onLine);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return { isOffline };
}
