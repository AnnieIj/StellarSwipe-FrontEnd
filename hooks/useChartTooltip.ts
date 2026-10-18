"use client";

import { useState, useCallback, useRef, useId } from "react";

export interface ChartTooltipPoint {
  index: number;
  value: number | string;
  label?: string;
}

/**
 * Classes for the keyboard focus overlay rendered on top of a chart.
 * - `pointer-events-none` lets pointer/touch events reach the SVG hit areas
 *   underneath, so hover and tap keep working.
 * - The focus indicator is a ring (box-shadow), which never affects layout.
 */
export const CHART_FOCUS_OVERLAY_CLASS =
  "pointer-events-none absolute inset-0 rounded outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const CHART_KEYBOARD_INSTRUCTIONS =
  "Use the left and right arrow keys to move between data points, Home and End to jump to the first or last point, and Escape to clear.";

/** Signed percentage change from `reference` to `value`, e.g. "+2.40%". */
export function formatPercentChange(value: number, reference: number): string {
  if (!reference) return "0.00%";
  const pct = ((value - reference) / Math.abs(reference)) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

export interface UseChartTooltipReturn {
  /** Index of the currently active data point, or null if none */
  activeIndex: number | null;
  /** Whether the tooltip is currently visible */
  isVisible: boolean;
  /** Accessible description of the current data point for screen readers */
  activeDescription: string;
  /** Unique id for aria-describedby relationships */
  tooltipId: string;
  /** Id of the element holding CHART_KEYBOARD_INSTRUCTIONS (render it sr-only) */
  instructionsId: string;
  /** Call on keyboard ArrowLeft/ArrowRight to navigate between points */
  handleKeyDown: (e: React.KeyboardEvent, dataLength: number) => void;
  /** Call on pointer/touch enter of a segment/point */
  showAt: (index: number) => void;
  /** Call on pointer/touch leave or Escape key */
  hide: () => void;
  /** Props to spread on the container element */
  containerProps: {
    tabIndex: number;
    role: "application";
    "aria-roledescription": string;
    "aria-label": string;
    "aria-describedby": string;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onBlur: () => void;
  };
}

interface UseChartTooltipOptions {
  /** Accessible label for the chart container */
  ariaLabel: string;
  /** Produce a human-readable description from the active point */
  describePoint: (index: number) => string;
  /** Total number of data points */
  dataLength: number;
}

/**
 * Manages focusable keyboard/touch navigation state for chart tooltips.
 *
 * - Arrow keys cycle through data points when the chart has focus.
 * - Escape hides the tooltip.
 * - Touch/pointer hovers are wired via showAt/hide.
 * - Screen readers receive an aria-describedby live-region with the
 *   current point's value.
 */
export function useChartTooltip({
  ariaLabel,
  describePoint,
  dataLength,
}: UseChartTooltipOptions): UseChartTooltipReturn {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const tooltipId = useId();
  const instructionsId = useId();
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isVisible = activeIndex !== null;
  const activeDescription =
    activeIndex !== null ? describePoint(activeIndex) : "";

  const showAt = useCallback((index: number) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setActiveIndex(index);
  }, []);

  const hide = useCallback(() => {
    // Small delay so moving between adjacent touch targets doesn't flicker
    hideTimerRef.current = setTimeout(() => {
      setActiveIndex(null);
    }, 80);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, length: number) => {
      if (length === 0) return;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowUp": {
          e.preventDefault();
          setActiveIndex((prev) => {
            if (prev === null) return 0;
            return (prev + 1) % length;
          });
          break;
        }
        case "ArrowLeft":
        case "ArrowDown": {
          e.preventDefault();
          setActiveIndex((prev) => {
            if (prev === null) return length - 1;
            return (prev - 1 + length) % length;
          });
          break;
        }
        case "Home": {
          e.preventDefault();
          setActiveIndex(0);
          break;
        }
        case "End": {
          e.preventDefault();
          setActiveIndex(length - 1);
          break;
        }
        case "Escape": {
          setActiveIndex(null);
          break;
        }
        default:
          break;
      }
    },
    []
  );

  const containerProps = {
    tabIndex: 0,
    // "application" lets screen readers pass arrow keys through to the chart
    // instead of treating it as a static image.
    role: "application" as const,
    "aria-roledescription": "interactive chart",
    "aria-label": ariaLabel,
    "aria-describedby": `${instructionsId} ${tooltipId}`,
    onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, dataLength),
    onBlur: hide,
  };

  return {
    activeIndex,
    isVisible,
    activeDescription,
    tooltipId,
    instructionsId,
    handleKeyDown,
    showAt,
    hide,
    containerProps,
  };
}
