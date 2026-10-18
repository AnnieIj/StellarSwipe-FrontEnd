"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { useSegmentedControlKeyboard } from "@/hooks/useSegmentedControlKeyboard";
import { TABLE_DENSITIES, type TableDensity } from "@/lib/tableDensity";

interface TableDensityControlProps {
  value: TableDensity;
  onChange: (density: TableDensity) => void;
  /** Visible label for the control. */
  label?: string;
  className?: string;
}

/**
 * Segmented radio group for choosing table row density.
 * Follows the WAI-ARIA radio group pattern (roving tabindex, arrow keys).
 */
export function TableDensityControl({
  value,
  onChange,
  label = "Table density",
  className,
}: TableDensityControlProps) {
  const labelId = useId();
  const activeIndex = Math.max(
    0,
    TABLE_DENSITIES.findIndex((d) => d.value === value)
  );
  const { groupRef, handleKeyDown } = useSegmentedControlKeyboard({
    itemCount: TABLE_DENSITIES.length,
    activeIndex,
    onActiveChange: (index) => onChange(TABLE_DENSITIES[index].value),
  });

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span id={labelId} className="text-xs font-medium text-foreground-muted">
        {label}
      </span>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={handleKeyDown}
        className="inline-flex rounded-lg border border-border bg-surface p-0.5"
      >
        {TABLE_DENSITIES.map((density, index) => {
          const selected = index === activeIndex;
          return (
            <button
              key={density.value}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(density.value)}
              className={cn(
                "min-h-8 rounded-md px-2.5 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                selected
                  ? "bg-surface-high text-foreground shadow-sm"
                  : "text-foreground-muted hover:text-foreground"
              )}
            >
              {density.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
