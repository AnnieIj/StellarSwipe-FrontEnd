"use client";

import { useEffect, useState, useCallback } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export interface UseScrollToTopOptions {
  /**
   * Scroll offset (in pixels) past which the button becomes visible.
   * Defaults to one viewport height (`window.innerHeight`).
   */
  threshold?: number;
}

export interface UseScrollToTopReturn {
  /** Whether the button should be rendered/visible */
  isVisible: boolean;
  /** Scrolls the page back to the top, respecting prefers-reduced-motion */
  scrollToTop: () => void;
}

/**
 * Tracks scroll position and provides a scroll-to-top callback.
 *
 * - Shows after the user scrolls past `threshold` (default: 1× viewport height).
 * - `scrollToTop` uses smooth scrolling unless the user prefers reduced motion,
 *   in which case it jumps instantly.
 */
export function useScrollToTop(
  options: UseScrollToTopOptions = {}
): UseScrollToTopReturn {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const getThreshold = () =>
      options.threshold ??
      (typeof window !== "undefined" ? window.innerHeight : 600);

    const handleScroll = () => {
      setIsVisible(window.scrollY > getThreshold());
    };

    // Set initial state
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [options.threshold]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "instant" : "smooth",
    });
  }, [prefersReducedMotion]);

  return { isVisible, scrollToTop };
}
