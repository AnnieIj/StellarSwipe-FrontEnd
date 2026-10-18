"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { usePageTransitionStore } from "@/store/usePageTransitionStore";
import { useFocusAfterNavigation } from "@/hooks/useFocusAfterNavigation";

/**
 * RouteAnnouncer
 * ──────────────
 * Announces completed client-side route transitions to screen reader users,
 * who can't rely on the visual page transition to know navigation happened.
 *
 * - Tracks the in-flight transition's destination (`toPath`) from
 *   usePageTransitionStore. Only once that transition reports complete
 *   (isTransitioning -> false) *and* the resolved pathname matches the
 *   tracked destination do we announce — so a page that errors out before
 *   calling usePageTransitionComplete() never announces a misleading
 *   destination; it just never announces at all.
 * - Announces once per completed pathname (a ref guards against duplicate
 *   announcements from unrelated store updates, and rapid A→B→C navigation
 *   only ever announces the final destination C).
 * - Uses document.title, which pages set via metadata/generateMetadata, as
 *   the human-readable destination name.
 *
 * Focus management (#790)
 * ────────────────────────
 * Also moves keyboard focus to the new page's heading (or #main-content)
 * after each completed transition via useFocusAfterNavigation, so keyboard
 * and screen-reader users are not left stranded on the previous page's DOM.
 */
export function RouteAnnouncer() {
  const pathname = usePathname();
  const isTransitioning = usePageTransitionStore((s) => s.isTransitioning);
  const toPath = usePageTransitionStore((s) => s.toPath);
  const [message, setMessage] = useState("");
  // Skip announcing the very first render (initial page load) — a screen
  // reader already announces the document title on load.
  const announcedPath = useRef<string | null>(pathname);
  const pendingPath = useRef<string | null>(null);

  // Restore focus to the new page's heading after each navigation (#790).
  useFocusAfterNavigation();

  useEffect(() => {
    if (isTransitioning) {
      if (toPath) pendingPath.current = toPath;
      return;
    }

    if (pendingPath.current === null || pendingPath.current !== pathname) {
      return;
    }
    pendingPath.current = null;

    if (announcedPath.current === pathname) return;
    announcedPath.current = pathname;

    // Give document.title (set by the newly-rendered route) a tick to
    // update before reading it.
    const id = requestAnimationFrame(() => {
      setMessage(`Navigated to ${document.title || "page"}`);
    });
    return () => cancelAnimationFrame(id);
  }, [pathname, isTransitioning, toPath]);

  return (
    <div aria-live="polite" role="status" className="sr-only">
      {message}
    </div>
  );
}
