"use client";

import { ChevronDown, ChevronUp, ChevronsDown, ChevronsUp } from "lucide-react";
import { useDashboardLayoutStore, type DashboardWidgetId } from "@/store/useDashboardLayoutStore";

interface DashboardWidgetControlsProps {
  id: DashboardWidgetId;
  label: string;
  /** Called with a human-readable message describing the widget's new position. */
  onMoved: (message: string) => void;
}

/**
 * Move-before/after/start/end controls for a keyboard- and
 * assistive-technology-operable dashboard widget list.
 */
export function DashboardWidgetControls({ id, label, onMoved }: DashboardWidgetControlsProps) {
  const order = useDashboardLayoutStore((s) => s.order);
  const moveBefore = useDashboardLayoutStore((s) => s.moveBefore);
  const moveAfter = useDashboardLayoutStore((s) => s.moveAfter);
  const moveToStart = useDashboardLayoutStore((s) => s.moveToStart);
  const moveToEnd = useDashboardLayoutStore((s) => s.moveToEnd);

  const index = order.indexOf(id);
  const isFirst = index <= 0;
  const isLast = index === order.length - 1;

  const announce = (newIndex: number) => {
    onMoved(`${label} moved to position ${newIndex + 1} of ${order.length}`);
  };

  const buttonClass =
    "rounded p-1 text-foreground-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

  return (
    <div className="flex items-center gap-1" role="group" aria-label={`Reorder ${label}`}>
      <button
        type="button"
        onClick={() => {
          moveToStart(id);
          announce(0);
        }}
        disabled={isFirst}
        aria-label={`Move ${label} to start`}
        className={buttonClass}
      >
        <ChevronsUp size={14} />
      </button>
      <button
        type="button"
        onClick={() => {
          moveBefore(id);
          announce(Math.max(index - 1, 0));
        }}
        disabled={isFirst}
        aria-label={`Move ${label} up`}
        className={buttonClass}
      >
        <ChevronUp size={14} />
      </button>
      <button
        type="button"
        onClick={() => {
          moveAfter(id);
          announce(Math.min(index + 1, order.length - 1));
        }}
        disabled={isLast}
        aria-label={`Move ${label} down`}
        className={buttonClass}
      >
        <ChevronDown size={14} />
      </button>
      <button
        type="button"
        onClick={() => {
          moveToEnd(id);
          announce(order.length - 1);
        }}
        disabled={isLast}
        aria-label={`Move ${label} to end`}
        className={buttonClass}
      >
        <ChevronsDown size={14} />
      </button>
    </div>
  );
}
