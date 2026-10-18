"use client";

import { useLayoutEffect, useRef, useState } from "react";

export interface TooltipCollisionOffset {
  /** Extra x/y translation (px) to apply on top of the tooltip's natural position. */
  x: number;
  y: number;
}

const VIEWPORT_PADDING = 8;

/**
 * Keeps a manually-positioned floating tooltip (chart tooltips, custom
 * popovers) fully inside the viewport instead of clipping off-screen when
 * its trigger sits near an edge.
 *
 * Charts position their tooltip absolutely relative to their own container,
 * clamped only to the chart's local width/height — that's not enough once
 * the chart itself is scrolled, near a screen edge, or the page is zoomed.
 * This hook measures the tooltip's actual position in the viewport via
 * `getBoundingClientRect` (viewport-relative, so it's correct regardless of
 * scroll offset or zoom) and returns a translation that nudges it back
 * on-screen.
 *
 * Usage: attach the returned `ref` to the tooltip element and add
 * `translate(${offset.x}px, ${offset.y}px)` to its existing transform.
 * Recomputes whenever `isVisible` or any value in `deps` changes (e.g. the
 * active data point index), since a new position needs a fresh measurement.
 */
export function useTooltipCollision<T extends HTMLElement>(
  isVisible: boolean,
  deps: readonly unknown[] = []
) {
  const ref = useRef<T | null>(null);
  const [offset, setOffset] = useState<TooltipCollisionOffset>({ x: 0, y: 0 });

  useLayoutEffect(() => {
    if (!isVisible || !ref.current) {
      setOffset({ x: 0, y: 0 });
      return;
    }

    const el = ref.current;
    const measure = () => {
      // Reset first so a previous offset doesn't compound into the measurement.
      el.style.transform = "";
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let dx = 0;
      let dy = 0;

      if (rect.right > vw - VIEWPORT_PADDING) dx = vw - VIEWPORT_PADDING - rect.right;
      if (rect.left + dx < VIEWPORT_PADDING) dx = VIEWPORT_PADDING - rect.left;
      if (rect.bottom > vh - VIEWPORT_PADDING) dy = vh - VIEWPORT_PADDING - rect.bottom;
      if (rect.top + dy < VIEWPORT_PADDING) dy = VIEWPORT_PADDING - rect.top;

      setOffset({ x: dx, y: dy });
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, ...deps]);

  return { ref, offset };
}
