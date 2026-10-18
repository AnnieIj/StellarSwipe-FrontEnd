"use client";

import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollToTop, UseScrollToTopOptions } from "@/hooks/useScrollToTop";

export interface ScrollToTopProps extends UseScrollToTopOptions {
  className?: string;
}

/**
 * Floating action button that appears after the user scrolls past a threshold
 * and smoothly returns them to the top of the page.
 *
 * - Renders in the bottom-right corner, above mobile nav safe area.
 * - Does not obstruct primary navigation (z-index below modals).
 * - Respects `prefers-reduced-motion` by jumping instantly instead of animating.
 * - Keyboard-focusable; has an accessible label.
 * - Shares the same threshold configuration as `useScrollToTop`.
 *
 * @example
 * // Drop into any long-scroll page layout
 * <ScrollToTop />
 */
export function ScrollToTop({ className, threshold }: ScrollToTopProps) {
  const { isVisible, scrollToTop } = useScrollToTop({ threshold });

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      // Visibility toggle via opacity + pointer-events so the button is not
      // in the tab order when hidden.
      tabIndex={isVisible ? 0 : -1}
      aria-hidden={!isVisible}
      className={cn(
        // Position: bottom-right, above bottom nav, below modals
        "fixed bottom-6 right-6 z-40",
        // Appearance
        "flex h-11 w-11 items-center justify-center rounded-full",
        "bg-primary text-primary-foreground shadow-lg",
        "ring-offset-background transition-all duration-200",
        // Hover / focus
        "hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        // Visibility
        isVisible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none",
        className
      )}
    >
      <ChevronUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
