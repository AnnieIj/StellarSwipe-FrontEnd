"use client";

import { useCallback, useId, useRef, useState } from "react";
import { GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DragDropListProps<T extends { id: string }> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, props: { dragging: boolean }) => React.ReactNode;
  /** Optional accessible label for the list. */
  ariaLabel?: string;
}

/**
 * Reorderable list that supports three independent interaction modes:
 *
 * 1. **Pointer drag-and-drop** — native HTML5 drag API with a visible drop-
 *    insertion indicator (a blue line between items).
 * 2. **Keyboard reorder** — focus any row and use ↑ / ↓ to move it.  Press
 *    Home / End to move to first / last.  Each move is announced via a live
 *    region so screen-reader users receive confirmation.
 * 3. **Touch** — standard drag events fire on mobile; keyboard buttons (↑↓)
 *    remain usable with a switch/keyboard attached to a touch device.
 *
 * Interaction modes do not conflict: pointer events drive the drag-and-drop
 * state while keyboard events drive the reorder state independently.
 */
export function DragDropList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  ariaLabel = "Reorderable list",
}: DragDropListProps<T>) {
  const liveId = useId();

  // ── drag-and-drop state ──────────────────────────────────────────────────
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  // ── live-region announcement ─────────────────────────────────────────────
  const [announcement, setAnnouncement] = useState("");

  const announce = useCallback((msg: string) => {
    // Toggle a space trick to re-trigger live regions for repeated messages.
    setAnnouncement((prev) => (prev === msg ? msg + "\u00a0" : msg));
  }, []);

  // ── pointer drag handlers ────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    dragOverId.current = id;
    setDropTargetId(id);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData("text/plain");
      if (!sourceId || sourceId === targetId) {
        setDraggingId(null);
        setDropTargetId(null);
        return;
      }

      const sourceIdx = items.findIndex((i) => i.id === sourceId);
      const targetIdx = items.findIndex((i) => i.id === targetId);
      if (sourceIdx === -1 || targetIdx === -1) return;

      const next = [...items];
      const [moved] = next.splice(sourceIdx, 1);
      next.splice(targetIdx, 0, moved);
      onReorder(next);

      setDraggingId(null);
      setDropTargetId(null);
    },
    [items, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTargetId(null);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTargetId(null);
  }, []);

  // ── keyboard reorder handlers ────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, id: string, idx: number) => {
      const next = [...items];
      let moved = false;
      let newIdx = idx;

      if (e.key === "ArrowUp" && idx > 0) {
        e.preventDefault();
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        newIdx = idx - 1;
        moved = true;
      } else if (e.key === "ArrowDown" && idx < items.length - 1) {
        e.preventDefault();
        [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
        newIdx = idx + 1;
        moved = true;
      } else if (e.key === "Home" && idx > 0) {
        e.preventDefault();
        next.splice(idx, 1);
        next.unshift(items[idx]);
        newIdx = 0;
        moved = true;
      } else if (e.key === "End" && idx < items.length - 1) {
        e.preventDefault();
        next.splice(idx, 1);
        next.push(items[idx]);
        newIdx = items.length - 1;
        moved = true;
      }

      if (!moved) return;
      onReorder(next);

      // Announce the new position to assistive technology.
      announce(
        `Item moved to position ${newIdx + 1} of ${items.length}.`
      );

      // Re-focus the row at its new index after React re-renders.
      requestAnimationFrame(() => {
        const list = document.getElementById(`drag-drop-list-${liveId}`);
        if (!list) return;
        const rows = list.querySelectorAll<HTMLElement>("[data-dnd-row]");
        rows[newIdx]?.focus();
      });
    },
    [items, onReorder, announce, liveId]
  );

  // ── keyboard-driven move buttons ─────────────────────────────────────────
  const handleMoveButton = useCallback(
    (id: string, direction: "up" | "down") => {
      const idx = items.findIndex((i) => i.id === id);
      if (idx === -1) return;
      const next = [...items];
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= items.length) return;
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      onReorder(next);
      announce(`Item moved to position ${newIdx + 1} of ${items.length}.`);
    },
    [items, onReorder, announce]
  );

  return (
    <>
      {/* Live region for screen-reader announcements */}
      <div
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <ul
        id={`drag-drop-list-${liveId}`}
        className="flex flex-col"
        role="listbox"
        aria-label={ariaLabel}
        aria-multiselectable={false}
      >
        {items.map((item, idx) => {
          const isDropTarget = dropTargetId === item.id && draggingId !== item.id;
          const isDragging = draggingId === item.id;

          return (
            <li
              key={item.id}
              role="option"
              aria-selected={false}
              aria-label={`Item ${idx + 1} of ${items.length}. Press Arrow Up or Down to move, Home or End to jump to first or last.`}
              data-dnd-row
              draggable
              tabIndex={0}
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDrop={(e) => handleDrop(e, item.id)}
              onDragEnd={handleDragEnd}
              onDragLeave={handleDragLeave}
              onKeyDown={(e) => handleKeyDown(e, item.id, idx)}
              className={cn(
                "group relative flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                "hover:bg-surface-high/10 cursor-grab active:cursor-grabbing",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                isDragging && "opacity-50 ring-2 ring-blue-400/50 bg-surface-high/10",
                // Drop insertion indicator above this row.
                isDropTarget && "pt-[calc(0.375rem+2px)]"
              )}
            >
              {/* Visible drop insertion indicator */}
              {isDropTarget && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-full bg-blue-500"
                />
              )}

              {/* Drag handle */}
              <GripVertical
                className="h-4 w-4 shrink-0 text-foreground-muted"
                aria-hidden="true"
              />

              {/* Item content */}
              <div className="min-w-0 flex-1">
                {renderItem(item, { dragging: isDragging })}
              </div>

              {/* Keyboard move buttons — visible on hover/focus for pointer users,
                  always visible for keyboard-only users (via focus-within). */}
              <div
                className={cn(
                  "flex flex-col gap-0.5 opacity-0 transition-opacity",
                  "group-hover:opacity-100 group-focus-within:opacity-100"
                )}
              >
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMoveButton(item.id, "up")}
                  aria-label={`Move item up`}
                  tabIndex={-1}
                  className="rounded p-0.5 text-foreground-muted hover:text-foreground hover:bg-surface-high/20 disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                >
                  <ArrowUp size={12} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={idx === items.length - 1}
                  onClick={() => handleMoveButton(item.id, "down")}
                  aria-label={`Move item down`}
                  tabIndex={-1}
                  className="rounded p-0.5 text-foreground-muted hover:text-foreground hover:bg-surface-high/20 disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                >
                  <ArrowDown size={12} aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
