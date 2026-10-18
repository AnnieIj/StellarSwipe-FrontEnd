"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  loading?: boolean;
  className?: string;
  /** Inline styles applied to the outer scroll container (e.g. to set a fixed height). */
  style?: React.CSSProperties;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 3,
  loading = false,
  className,
  style,
  onEndReached,
  endReachedThreshold = 200,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (!onEndReached || !sentinelRef.current) return;
    const sentinel = sentinelRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onEndReached();
      },
      {
        root: containerRef.current,
        rootMargin: `0px 0px ${endReachedThreshold}px 0px`,
      }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onEndReached, endReachedThreshold, items.length]);

  const containerHeight = containerRef.current?.clientHeight ?? 0;

  const { visibleItems, offsetY } = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan
    );
    const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
    const endIndex = Math.min(items.length, startIndex + visibleCount);
    return {
      visibleItems: items.slice(startIndex, endIndex).map((item, i) => ({
        item,
        index: startIndex + i,
      })),
      offsetY: startIndex * itemHeight,
    };
  }, [items, scrollTop, itemHeight, overscan, containerHeight]);

  const totalHeight = items.length * itemHeight;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      style={{ contain: "strict", ...style }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{ height: itemHeight }}
              className="flex items-center"
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>

      {onEndReached && (
        <div
          ref={sentinelRef}
          className="h-px w-full"
          aria-hidden="true"
        />
      )}

      {loading && (
        <div className="flex justify-center items-center py-4">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading…</span>
        </div>
      )}
    </div>
  );
}
