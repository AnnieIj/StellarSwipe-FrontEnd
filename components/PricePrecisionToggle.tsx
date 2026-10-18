"use client";

import { ScanSearch } from "lucide-react";
import { usePricePrecisionStore } from "@/store/usePricePrecisionStore";
import { cn } from "@/lib/utils";

interface PricePrecisionToggleProps {
  className?: string;
}

/**
 * Compact toggle button that switches between compact (4 dp) and precise (8 dp)
 * price display across signal cards, charts, and the trade modal.
 *
 * Accessibility:
 * - role="switch" with aria-checked reflects current state.
 * - aria-label describes the action in both states.
 */
export function PricePrecisionToggle({ className }: PricePrecisionToggleProps) {
  const { mode, toggle } = usePricePrecisionStore();
  const isPrecise = mode === "precise";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isPrecise}
      aria-label={
        isPrecise
          ? "Switch to compact price display"
          : "Switch to precise price display"
      }
      onClick={toggle}
      title={isPrecise ? "Compact prices" : "Precise prices"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        isPrecise
          ? "border-accent-sky/50 bg-accent-sky/10 text-accent-sky hover:bg-accent-sky/20"
          : "border-border bg-foreground/5 text-foreground-muted hover:border-border-strong hover:text-foreground",
        className
      )}
    >
      <ScanSearch size={12} aria-hidden="true" />
      <span>{isPrecise ? "Precise" : "Compact"}</span>
    </button>
  );
}
