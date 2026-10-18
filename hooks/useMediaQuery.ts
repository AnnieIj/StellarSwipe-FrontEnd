"use client";

import { useEffect, useState } from "react";

/**
 * Returns `true` when the given CSS media query matches.
 *
 * On the server (SSR) the hook returns the provided `defaultValue`
 * (default `false`) so there is no hydration mismatch.
 *
 * @example
 * const isMobile = useMediaQuery("(max-width: 639px)");
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState(defaultValue);

  useEffect(() => {
    const mql = window.matchMedia(query);
    // Set the initial value once we're on the client
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
