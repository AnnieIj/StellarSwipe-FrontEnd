"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { usePageTransitionStore } from "@/store/usePageTransitionStore";

/**
 * useFocusAfterNavigation
 * ────────────────────────
 * Moves keyboard focus to the new page's primary heading (or a designated
 * landmark) after each completed client-side route transition, so keyboard
 * and screen-reader users land in a sensible context instead of remaining on
 * whatever element was focused in the previous page.
 *
 * Focus strategy (first match wins):
 * 1. An element carrying `data-focus-target` in `#main-content`.
 * 2. The first `<h1>` in `#main-content`.
 * 3. `#main-content` itself (which carries `tabIndex={-1}` in AppShell).
 * 4. `document.body` as a last resort.
 *
 * Timing:
 * - Focus is applied only once the page transition reports complete
 *   (`isTransitioning → false`) AND the resolved pathname matches what was
 *   navigated to.  This prevents focus from jumping during intermediate
 *   loading updates.
 * - A `requestAnimationFrame` delay lets the DOM settle (e.g. React finishes
 *   painting the new page content) before the focus call.
 *
 * Modal / inline-nav exclusions:
 * - If a modal or overlay is currently open (indicated by
 *   `[aria-modal="true"]` being present in the DOM) the hook does nothing —
 *   the overlay's own focus management takes precedence.
 * - The hook skips the very first render so the initial page load isn't
 *   disrupted.
 */
export function useFocusAfterNavigation(): void {
  const pathname = usePathname();
  const isTransitioning = usePageTransitionStore((s) => s.isTransitioning);
  const toPath = usePageTransitionStore((s) => s.toPath);

  // Guard: skip the initial mount (first render reflects the current URL, not
  // a navigation event).
  const initialPathRef = useRef<string | null>(null);
  const pendingPathRef = useRef<string | null>(null);
  const frameIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Record the initial pathname on first mount — we never focus on it.
    if (initialPathRef.current === null) {
      initialPathRef.current = pathname;
      return;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isTransitioning) {
      // Capture the destination as soon as the transition starts.
      if (toPath) pendingPathRef.current = toPath;
      return;
    }

    // Transition ended — check if the resolved pathname matches what we tracked.
    if (pendingPathRef.current === null || pendingPathRef.current !== pathname) {
      return;
    }

    // Skip if this is the very first path (initial load).
    if (pathname === initialPathRef.current) {
      pendingPathRef.current = null;
      return;
    }

    pendingPathRef.current = null;

    // Cancel any previous pending frame.
    if (frameIdRef.current !== null) {
      cancelAnimationFrame(frameIdRef.current);
    }

    frameIdRef.current = requestAnimationFrame(() => {
      frameIdRef.current = null;

      // Don't steal focus from an open modal/overlay.
      if (document.querySelector("[aria-modal='true']")) return;

      const main = document.getElementById("main-content");

      const target =
        (main?.querySelector<HTMLElement>("[data-focus-target]")) ??
        (main?.querySelector<HTMLElement>("h1")) ??
        main ??
        document.body;

      // Ensure the element accepts programmatic focus.
      if (target !== document.body && !target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }

      target.focus({ preventScroll: false });
    });
  }, [pathname, isTransitioning, toPath]);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, []);
}
