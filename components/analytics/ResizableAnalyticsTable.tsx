"use client";

import { useMemo } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  useResizableColumns,
  type ColumnDef,
} from "@/hooks/useResizableColumns";
import { cn } from "@/lib/utils";

export type { ColumnDef };

export interface ResizableAnalyticsTableProps<
  TRow extends Record<string, unknown>,
> {
  /** Column definitions — order determines display order. */
  columns: ColumnDef[];
  /** Rows to display. */
  rows: TRow[];
  /**
   * Unique localStorage key for this table's column widths.
   * Different tables must use different keys.
   */
  storageKey: string;
  /**
   * Renders the cell content for a given row and column key.
   * Falls back to `String(row[columnKey])` if omitted.
   */
  renderCell?: (row: TRow, columnKey: string) => React.ReactNode;
  /** Optional caption for accessibility. */
  caption?: string;
  className?: string;
  /** Called when a row is clicked. */
  onRowClick?: (row: TRow) => void;
  /** aria-label for the table element. */
  "aria-label"?: string;
}

/**
 * ResizableAnalyticsTable
 *
 * A table component where each column header carries a visible drag-handle
 * that lets the user resize that column (#778).  On narrow viewports the
 * resize handles are hidden and the table uses standard responsive scrolling.
 *
 * Key properties:
 * - Drag-to-resize via mouse or touch-equivalent (pointer events).
 * - Keyboard resize: focus a handle, use ← / → (10 px step).
 * - Min/max constraints come from each column's `minWidth` / `maxWidth`.
 * - Widths persist to localStorage under `storageKey`.
 * - Mobile: handles hidden, table scrolls horizontally as usual.
 */
export function ResizableAnalyticsTable<
  TRow extends Record<string, unknown>,
>({
  columns,
  rows,
  storageKey,
  renderCell,
  caption,
  className,
  onRowClick,
  "aria-label": ariaLabel,
}: ResizableAnalyticsTableProps<TRow>) {
  // On narrow screens (< 768 px) disable resize and fall back to horizontal
  // scroll — the standard responsive table behaviour.
  const isWide = useMediaQuery("(min-width: 768px)");

  const { columns: resizableCols, resetWidths } = useResizableColumns({
    columns,
    storageKey,
    enabled: isWide,
  });

  const totalWidth = useMemo(
    () => resizableCols.reduce((acc, col) => acc + col.width, 0),
    [resizableCols]
  );

  return (
    <div className={cn("relative w-full", className)}>
      {/* Reset button — only shown on wide screens where resize is active */}
      {isWide && (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={resetWidths}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Reset column widths
          </button>
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-2xl border border-white/10">
        <table
          className="w-full border-collapse text-sm"
          style={{ minWidth: isWide ? totalWidth : undefined }}
          aria-label={ariaLabel}
        >
          {caption && (
            <caption className="sr-only">{caption}</caption>
          )}

          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {resizableCols.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="relative select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground"
                  style={isWide ? { width: col.width, minWidth: col.minWidth } : undefined}
                >
                  <span className="truncate">{col.label}</span>

                  {/* Resize handle — hidden on mobile via the `isWide` gate */}
                  {isWide && (
                    <span
                      {...col.resizeHandleProps}
                      className={cn(
                        "absolute inset-y-0 right-0 z-10 flex w-4 cursor-col-resize items-center justify-center",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
                        "group"
                      )}
                    >
                      {/* Visual indicator — a thin vertical line that brightens on hover/focus */}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "h-4 w-px rounded-full bg-white/20 transition-colors",
                          "group-hover:bg-blue-400/70 group-focus-visible:bg-blue-400"
                        )}
                      />
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={resizableCols.length}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No data available.
                </td>
              </tr>
            ) : (
              rows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={cn(
                    "border-b border-white/5 transition-colors last:border-0",
                    onRowClick && "cursor-pointer hover:bg-white/5"
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  role={onRowClick ? "button" : undefined}
                >
                  {resizableCols.map((col) => (
                    <td
                      key={col.key}
                      className="truncate px-4 py-3 text-sm text-foreground"
                      style={
                        isWide
                          ? { width: col.width, maxWidth: col.width }
                          : undefined
                      }
                    >
                      {renderCell
                        ? renderCell(row, col.key)
                        : (row[col.key] != null
                            ? String(row[col.key])
                            : "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
