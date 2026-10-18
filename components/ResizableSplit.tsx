"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ResizableSplitProps {
  /** Main content — grows to fill remaining space */
  left: React.ReactNode;
  /** Supporting detail panel — resizable via the handle */
  right: React.ReactNode;
  defaultRightWidth?: number;
  minRightWidth?: number;
  maxRightWidth?: number;
  /** Persists the chosen width per-viewer across sessions */
  storageKey?: string;
  className?: string;
}

const KEYBOARD_STEP = 16;

/**
 * Two-pane layout with a keyboard- and pointer-operable resize handle between
 * a primary column and a supporting detail panel. Falls back to a stacked,
 * full-width layout below the `lg` breakpoint.
 */
export function ResizableSplit({
  left,
  right,
  defaultRightWidth = 360,
  minRightWidth = 260,
  maxRightWidth = 560,
  storageKey,
  className,
}: ResizableSplitProps) {
  const [rightWidth, setRightWidth] = useState(() =>
    Math.min(maxRightWidth, Math.max(minRightWidth, defaultRightWidth))
  );
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    const stored = Number(window.localStorage.getItem(storageKey));
    if (Number.isFinite(stored) && stored >= minRightWidth && stored <= maxRightWidth) {
      setRightWidth(stored);
    }
    // Only read the persisted value once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clamp = useCallback(
    (w: number) => Math.min(maxRightWidth, Math.max(minRightWidth, w)),
    [minRightWidth, maxRightWidth]
  );

  const persist = useCallback(
    (w: number) => {
      if (storageKey && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(storageKey, String(w));
        } catch {
          // ignore write failures (private mode, quota, etc.)
        }
      }
    },
    [storageKey]
  );

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      setRightWidth(clamp(window.innerWidth - e.clientX));
    };
    const stopDragging = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setRightWidth((w) => {
        persist(w);
        return w;
      });
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
    };
  }, [clamp, persist]);

  const startDragging = (e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    let next: number | null = null;
    if (e.key === "ArrowLeft") next = clamp(rightWidth + KEYBOARD_STEP);
    else if (e.key === "ArrowRight") next = clamp(rightWidth - KEYBOARD_STEP);
    else if (e.key === "Home") next = minRightWidth;
    else if (e.key === "End") next = maxRightWidth;
    if (next !== null) {
      e.preventDefault();
      setRightWidth(next);
      persist(next);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6 lg:flex-row lg:items-start", className)}>
      <div className="min-w-0 flex-1">{left}</div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize detail panel"
        aria-valuemin={minRightWidth}
        aria-valuemax={maxRightWidth}
        aria-valuenow={rightWidth}
        aria-valuetext={`${rightWidth} pixels wide`}
        tabIndex={0}
        onPointerDown={startDragging}
        onKeyDown={onKeyDown}
        className="hidden shrink-0 cursor-col-resize touch-none select-none items-center justify-center rounded-full outline-none lg:flex lg:w-3 focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span className="h-10 w-1 rounded-full bg-border" aria-hidden="true" />
      </div>

      <div
        className="flex w-full min-w-0 flex-col gap-4 lg:w-[var(--panel-w)] lg:shrink-0"
        style={{ ["--panel-w" as string]: `${rightWidth}px` }}
      >
        {right}
      </div>
    </div>
  );
}
