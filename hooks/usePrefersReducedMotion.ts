"use client";

import { useEffect, useState } from "react";

/**
 * usePrefersReducedMotion
 * ───────────────────────
 * Detects the user's `prefers-reduced-motion` system/browser setting and
 * returns `true` when the user has requested reduced motion.
 *
 * For Framer Motion components, prefer the built-in `useReducedMotion()`
 * hook from framer-motion instead of this hook.
 *
 * Use this hook for:
 * - CSS-in-JS animation decisions
 * - Canvas / requestAnimationFrame loops
 * - Non-framer-motion animation libraries
 * - Deciding whether to render decorative animated elements at all
 *
 * Behaviour:
 * - Returns `false` on the server (SSR safe) and updates after mount.
 * - Reacts to live changes (e.g. user toggles OS setting while tab is open).
 * - Falls back to `false` (allow motion) in environments that don't support
 *   matchMedia (e.g. old browsers, test environments without mocks).
 *
 * @example
 * const reduced = usePrefersReducedMotion();
 * const style = { transition: reduced ? 'none' : 'transform 0.3s ease' };
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq =
      typeof window !== "undefined"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    if (!mq) return;

    // Set the initial value
    setPrefersReduced(mq.matches);

    // React to live changes
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
}
