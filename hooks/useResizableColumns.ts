"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ColumnDef {
  /** Unique key identifying the column (also used as localStorage key). */
  key: string;
  /** Human-readable header label. */
  label: string;
  /** Initial width in pixels. @default 150 */
  defaultWidth?: number;
  /** Minimum width in pixels — prevents content becoming unreadable. @default 80 */
  minWidth?: number;
  /** Maximum width in pixels. @default 500 */
  maxWidth?: number;
}

interface ColumnState {
  width: number;
}

export interface UseResizableColumnsOptions {
  /** Column definitions including min/max constraints. */
  columns: ColumnDef[];
  /**
   * localStorage key under which widths are persisted between sessions.
   * Must be unique per table.
   */
  storageKey: string;
  /**
   * Whether to apply resize handles.  When false (e.g. on narrow viewports)
   * the hook returns the default widths and resize is a no-op.
   * @default true
   */
  enabled?: boolean;
  /**
   * Keyboard step in pixels applied when the user presses ← or → on a
   * resize handle.
   * @default 10
   */
  keyboardStep?: number;
}

export interface ResizableColumnInfo extends ColumnDef {
  /** Current width in pixels. */
  width: number;
  /** Props to spread onto the <th> resize handle element. */
  resizeHandleProps: {
    role: string;
    tabIndex: number;
    "aria-label": string;
    "aria-valuenow": number;
    "aria-valuemin": number;
    "aria-valuemax": number;
    onMouseDown: (e: React.MouseEvent) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
}

export interface UseResizableColumnsResult {
  columns: ResizableColumnInfo[];
  /** Reset all columns to their `defaultWidth`. */
  resetWidths: () => void;
}

/**
 * useResizableColumns
 *
 * Manages per-column widths with mouse-drag and keyboard adjustment, enforces
 * min/max constraints, and persists widths to localStorage so the user's
 * layout survives page reloads.
 *
 * Key properties (#778):
 * - Resize handles are keyboard-accessible (← / → arrow keys, step configurable).
 * - Min/max constraints prevent clipped or unusable content.
 * - Column widths are stored under `storageKey` so each table saves independently.
 * - On mobile (`enabled: false`) the hook is inert — the calling component
 *   falls back to its responsive table behaviour.
 */
export function useResizableColumns({
  columns: columnDefs,
  storageKey,
  enabled = true,
  keyboardStep = 10,
}: UseResizableColumnsOptions): UseResizableColumnsResult {
  const resolveDefault = useCallback(
    (col: ColumnDef) => ({
      width: col.defaultWidth ?? 150,
      minWidth: col.minWidth ?? 80,
      maxWidth: col.maxWidth ?? 500,
    }),
    []
  );

  // Load persisted widths from localStorage (best-effort).
  const loadPersistedWidths = useCallback((): Record<string, number> => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return {};
      return parsed as Record<string, number>;
    } catch {
      return {};
    }
  }, [storageKey]);

  const [widths, setWidths] = useState<Record<string, ColumnState>>(() => {
    const persisted = loadPersistedWidths();
    return Object.fromEntries(
      columnDefs.map((col) => {
        const { width, minWidth, maxWidth } = resolveDefault(col);
        const persisted_width = persisted[col.key];
        const finalWidth =
          persisted_width !== undefined
            ? Math.min(maxWidth, Math.max(minWidth, persisted_width))
            : width;
        return [col.key, { width: finalWidth }];
      })
    );
  });

  // Persist whenever widths change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const toStore: Record<string, number> = {};
      for (const [key, state] of Object.entries(widths)) {
        toStore[key] = state.width;
      }
      window.localStorage.setItem(storageKey, JSON.stringify(toStore));
    } catch {
      // Storage unavailable — silently skip.
    }
  }, [widths, storageKey]);

  // Track which column is currently being dragged.
  const dragging = useRef<{
    key: string;
    startX: number;
    startWidth: number;
    min: number;
    max: number;
  } | null>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return;
    const { key, startX, startWidth, min, max } = dragging.current;
    const delta = e.clientX - startX;
    const newWidth = Math.min(max, Math.max(min, startWidth + delta));
    setWidths((prev) => ({ ...prev, [key]: { width: newWidth } }));
  }, []);

  const onMouseUp = useCallback(() => {
    dragging.current = null;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [onMouseMove]);

  const buildMouseDown = useCallback(
    (col: ColumnDef) => (e: React.MouseEvent) => {
      if (!enabled) return;
      e.preventDefault();
      const { minWidth, maxWidth } = resolveDefault(col);
      dragging.current = {
        key: col.key,
        startX: e.clientX,
        startWidth: widths[col.key]?.width ?? (col.defaultWidth ?? 150),
        min: minWidth,
        max: maxWidth,
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [enabled, widths, resolveDefault, onMouseMove, onMouseUp]
  );

  const buildKeyDown = useCallback(
    (col: ColumnDef) => (e: React.KeyboardEvent) => {
      if (!enabled) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const { minWidth, maxWidth } = resolveDefault(col);
      const step = e.key === "ArrowRight" ? keyboardStep : -keyboardStep;
      setWidths((prev) => {
        const current = prev[col.key]?.width ?? (col.defaultWidth ?? 150);
        const next = Math.min(maxWidth, Math.max(minWidth, current + step));
        return { ...prev, [col.key]: { width: next } };
      });
    },
    [enabled, keyboardStep, resolveDefault]
  );

  const resetWidths = useCallback(() => {
    setWidths(
      Object.fromEntries(
        columnDefs.map((col) => [col.key, { width: col.defaultWidth ?? 150 }])
      )
    );
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
  }, [columnDefs, storageKey]);

  const result: ResizableColumnInfo[] = columnDefs.map((col) => {
    const { minWidth, maxWidth } = resolveDefault(col);
    const currentWidth = widths[col.key]?.width ?? (col.defaultWidth ?? 150);
    return {
      ...col,
      width: currentWidth,
      resizeHandleProps: {
        role: "separator",
        tabIndex: enabled ? 0 : -1,
        "aria-label": `Resize ${col.label} column`,
        "aria-valuenow": currentWidth,
        "aria-valuemin": minWidth,
        "aria-valuemax": maxWidth,
        onMouseDown: buildMouseDown(col),
        onKeyDown: buildKeyDown(col),
      },
    };
  });

  return { columns: result, resetWidths };
}
