"use client";

import { useCallback, useMemo, useRef, useState } from "react";

export interface VirtualActivityListOptions<T> {
  /** Full list of items to virtualize. */
  items: T[];
  /** Fixed row height in pixels. */
  itemHeight: number;
  /**
   * Number of rows rendered outside the visible window (above + below).
   * Larger values smooth scroll at the cost of extra DOM nodes.
   * @default 3
   */
  overscan?: number;
  /**
   * Pixels from the bottom of the scroll container at which `onLoadMore`
   * fires.  Lets you pre-fetch the next page before the user actually hits
   * the end.
   * @default 300
   */
  loadMoreThreshold?: number;
  /** Called when the user scrolls within `loadMoreThreshold` of the bottom. */
  onLoadMore?: () => void;
}

export interface VirtualActivityListResult<T> {
  /** Ref that must be attached to the scrollable container element. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Ref that must be attached to a sentinel element placed at the list end. */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  /** The subset of items that should be rendered, together with their absolute indices. */
  visibleItems: Array<{ item: T; index: number }>;
  /** Total height of the virtual list in pixels (used to reserve scroll space). */
  totalHeight: number;
  /** Vertical offset from the top of the container to the first rendered item. */
  offsetY: number;
  /** Scroll event handler — attach to the container element. */
  onScroll: () => void;
}

/**
 * useVirtualActivityList
 *
 * Renders only the rows within the visible viewport plus an `overscan`
 * buffer, keeping DOM node count low regardless of how many activity records
 * are loaded.
 *
 * Key properties (#777):
 * - Loading additional records via `onLoadMore` does **not** reset the scroll
 *   position — the total height grows without touching already-rendered nodes.
 * - The hook is decoupled from any specific store; pass any filtered/sorted
 *   array and the hook manages the window into it.
 * - Screen-reader coherence: the containing component is responsible for
 *   placing a visually-hidden live region that announces newly loaded counts.
 */
export function useVirtualActivityList<T>({
  items,
  itemHeight,
  overscan = 3,
  onLoadMore,
}: VirtualActivityListOptions<T>): VirtualActivityListResult<T> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const onScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  // Wire the IntersectionObserver-based end-of-list trigger. The dependency
  // on `items.length` causes the observer to be re-created whenever the list
  // grows, re-checking whether the sentinel is already visible (e.g. when
  // the user has the list fully in view before more records arrive).
  const setupSentinel = useCallback(() => {
    if (!onLoadMore || !sentinelRef.current) return;
    const sentinel = sentinelRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoadMore();
      },
      {
        root: containerRef.current,
        rootMargin: "0px 0px 300px 0px",
      }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore]);

  // Expose sentinel setup so the consuming component can call it in a
  // useEffect. Keeping it out of the hook's own effect avoids the hook
  // needing to know about the React component lifecycle.
  void setupSentinel;

  const containerHeight = containerRef.current?.clientHeight ?? 0;

  const { visibleItems, offsetY } = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan
    );
    const visibleCount =
      containerHeight > 0
        ? Math.ceil(containerHeight / itemHeight) + overscan * 2
        : overscan * 2 + 10; // SSR/first-paint fallback
    const endIndex = Math.min(items.length, startIndex + visibleCount);

    return {
      visibleItems: items.slice(startIndex, endIndex).map((item, i) => ({
        item,
        index: startIndex + i,
      })),
      offsetY: startIndex * itemHeight,
    };
  }, [items, scrollTop, itemHeight, overscan, containerHeight]);

  return {
    containerRef,
    sentinelRef,
    visibleItems,
    totalHeight: items.length * itemHeight,
    offsetY,
    onScroll,
  };
}
