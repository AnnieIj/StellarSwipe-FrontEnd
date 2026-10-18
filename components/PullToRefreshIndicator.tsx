/**
 * Pull-to-refresh visual indicator shown at the top of the signal feed.
 *
 * Displays a spinner and refresh status message with opacity that ramps up
 * as the user pulls down. Styled consistently with SignalCardSkeleton loading
 * skeleton for visual cohesion.
 */

import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { PULL_TO_REFRESH_THRESHOLD } from "@/hooks/usePullToRefresh";

interface PullToRefreshIndicatorProps {
  /** Current drag distance from top (0 when not dragging). */
  pullDistance: number;
  /** Whether a refresh is currently in progress. */
  isRefreshing: boolean;
  /** Threshold distance in px. Should match hook config. */
  threshold?: number;
}

/**
 * Visual feedback for pull-to-refresh gesture.
 *
 * - Shows spinner and message when pulling down
 * - Opacity ramps from 0 at rest to 1 at threshold
 * - Animates refreshing state with rotating spinner
 * - Skeleton-like styling for consistency with loading states
 *
 * @example
 * ```tsx
 * <PullToRefreshIndicator
 *   pullDistance={pullDistance}
 *   isRefreshing={isRefreshing}
 * />
 * ```
 */
export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = PULL_TO_REFRESH_THRESHOLD,
}: PullToRefreshIndicatorProps) {
  const prefersReduced = useReducedMotion();

  // Ramp opacity from 0 to 1 as pull distance approaches threshold
  const opacity = Math.min(pullDistance / threshold, 1);
  // Translate down as user pulls (up to threshold)
  const translateY = Math.min(pullDistance, threshold);

  return (
    <motion.div
      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -30 }}
      animate={
        prefersReduced
          ? { opacity: opacity }
          : { opacity: opacity, y: translateY - 40 }
      }
      transition={
        prefersReduced
          ? { duration: 0.01 }
          : { type: "spring", stiffness: 400, damping: 30 }
      }
      className="relative flex h-16 items-center justify-center rounded-3xl border border-white/10 bg-slate-900/80 px-4"
      role="status"
      aria-live="polite"
      aria-label={
        isRefreshing
          ? "Refreshing signals"
          : `Pull to refresh${
              pullDistance >= threshold ? " — release to refresh" : ""
            }`
      }
      data-testid="pull-to-refresh-indicator"
    >
      <div className="flex flex-col items-center gap-2">
        <motion.div
          data-testid="refresh-spinner"
          animate={{ rotate: isRefreshing && !prefersReduced ? 360 : 0 }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : {
                  duration: isRefreshing ? 1 : 0,
                  repeat: isRefreshing ? Infinity : 0,
                  ease: "linear",
                }
          }
        >
          <RefreshCw size={20} className="text-sky-400" aria-hidden="true" />
        </motion.div>
        <div className="text-xs font-medium text-slate-300">
          {isRefreshing
            ? "Refreshing…"
            : pullDistance >= threshold
            ? "Release to refresh"
            : "Pull to refresh"}
        </div>
      </div>
    </motion.div>
  );
}
