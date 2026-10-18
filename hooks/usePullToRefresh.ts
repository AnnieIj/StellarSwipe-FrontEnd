/**
 * Pull-to-refresh gesture hook for mobile touch devices.
 *
 * Detects vertical drag from the top of a scrollable container and triggers
 * a refresh callback when the user pulls down far enough. Includes debouncing
 * to prevent repeated refreshes while one is already in flight.
 *
 * Based on standard mobile feed interaction patterns (iOS, Android).
 */

import { useCallback, useEffect, useRef, useState } from "react";

/** Minimum vertical drag distance (px) to trigger a refresh. */
export const PULL_TO_REFRESH_THRESHOLD = 80;

/** Time (ms) to debounce while a refresh is already in flight. */
export const PULL_TO_REFRESH_DEBOUNCE_MS = 1000;

export interface UsePullToRefreshOptions {
  /** Container element that will listen for touch events. */
  container: HTMLElement | null;
  /** Callback triggered when pull threshold is reached. */
  onRefresh: () => void | Promise<void>;
  /** Whether pull-to-refresh is currently disabled. */
  disabled?: boolean;
  /** Threshold distance in px (default: 80). */
  threshold?: number;
}

export interface UsePullToRefreshState {
  /** Current drag distance from top (0 when not dragging). */
  pullDistance: number;
  /** Whether a refresh is in progress (debouncing period). */
  isRefreshing: boolean;
}

/**
 * Hook to detect pull-to-refresh gestures on touch devices.
 *
 * - Listens for `touchstart`, `touchmove`, `touchend` events
 * - Only activates when container is scrolled to the top
 * - Debounces refreshes while one is already in flight
 * - Returns drag distance for visual feedback (pull indicator opacity/translation)
 *
 * @param options Configuration for pull detection and refresh callback
 * @returns Current pull state for rendering feedback
 *
 * @example
 * ```tsx
 * const { pullDistance, isRefreshing } = usePullToRefresh({
 *   container: feedRef.current,
 *   onRefresh: () => refetch(),
 * });
 *
 * return (
 *   <div>
 *     <PullToRefreshIndicator distance={pullDistance} />
 *     <div ref={feedRef} className="overflow-y-auto">
 *       feed content
 *     </div>
 *   </div>
 * );
 * ```
 */
export function usePullToRefresh({
  container,
  onRefresh,
  disabled = false,
  threshold = PULL_TO_REFRESH_THRESHOLD,
}: UsePullToRefreshOptions): UsePullToRefreshState {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const touchStartYRef = useRef<number | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;

      const scrollElement = container as HTMLElement;
      // Only activate when at the top of the scroll container
      if (scrollElement.scrollTop !== 0) {
        touchStartYRef.current = null;
        return;
      }

      touchStartYRef.current = e.touches[0]?.clientY ?? null;
    },
    [container, disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (
        disabled ||
        isRefreshing ||
        touchStartYRef.current === null ||
        !container
      ) {
        return;
      }

      const scrollElement = container as HTMLElement;
      // Ensure we're still at the top
      if (scrollElement.scrollTop !== 0) {
        touchStartYRef.current = null;
        setPullDistance(0);
        return;
      }

      const currentY = e.touches[0]?.clientY ?? 0;
      const distance = Math.max(0, currentY - touchStartYRef.current);

      // Dampen the pull distance beyond threshold for a spring-like feel
      const dampenedDistance =
        distance > threshold
          ? threshold + (distance - threshold) * 0.5
          : distance;

      setPullDistance(dampenedDistance);
    },
    [container, disabled, isRefreshing, threshold]
  );

  const handleTouchEnd = useCallback(() => {
    if (touchStartYRef.current === null || disabled || isRefreshing) {
      touchStartYRef.current = null;
      setPullDistance(0);
      return;
    }

    touchStartYRef.current = null;

    // Trigger refresh if threshold reached
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(0);

      // Call the refresh callback
      Promise.resolve(onRefresh()).finally(() => {
        // Debounce: don't allow another refresh for PULL_TO_REFRESH_DEBOUNCE_MS
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        refreshTimeoutRef.current = setTimeout(() => {
          setIsRefreshing(false);
          refreshTimeoutRef.current = null;
        }, PULL_TO_REFRESH_DEBOUNCE_MS);
      });
    } else {
      // Reset if threshold not reached
      setPullDistance(0);
    }
  }, [pullDistance, threshold, disabled, isRefreshing, onRefresh]);

  // Attach touch event listeners to container
  useEffect(() => {
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: true,
    });
    container.addEventListener("touchend", handleTouchEnd, {
      passive: true,
    });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [container, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    pullDistance,
    isRefreshing,
  };
}
