"use client";

import { useReducedMotion, type Variants } from "framer-motion";

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: "easeOut" },
  }),
};

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" },
  }),
};

/**
 * Reduced-motion equivalents — no translation, minimal fade duration.
 * Used automatically by useScrollViewport() when the user prefers reduced motion.
 */
export const fadeUpVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.01 } },
};

export const fadeInVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.01 } },
};

/**
 * Returns Framer Motion scroll-viewport props that respect prefers-reduced-motion.
 *
 * When the user prefers reduced motion:
 * - initial is set to "visible" so elements are always shown without animation
 * - No whileInView / viewport observation is needed
 *
 * When motion is allowed:
 * - Elements start as "hidden" and animate to "visible" once they enter the viewport
 */
export function useScrollViewport() {
  const reduced = useReducedMotion();
  return {
    initial: reduced ? "visible" : "hidden",
    whileInView: "visible" as const,
    viewport: { once: true, amount: 0.2 },
  };
}
