"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  /** Short label announced to assistive tech and shown under the spinner. */
  label?: string;
  className?: string;
  /** Use "inline" for small in-place spinners, "page" for full-section loading. */
  variant?: "page" | "inline";
}

export function LoadingState({
  label = "Loading…",
  className,
  variant = "page",
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-muted-foreground",
        variant === "page" ? "py-24" : "py-4",
        className
      )}
    >
      <Loader2
        className={cn(
          "animate-spin",
          variant === "page" ? "h-8 w-8" : "h-4 w-4"
        )}
        aria-hidden="true"
      />
      <span className={cn(variant === "page" ? "text-sm" : "text-xs")}>
        {label}
      </span>
    </div>
  );
}

interface SkeletonRowsProps {
  count?: number;
  className?: string;
  rowClassName?: string;
}

export function SkeletonRows({
  count = 3,
  className,
  rowClassName,
}: SkeletonRowsProps) {
  return (
    <div
      className={cn("space-y-4", className)}
      role="status"
      aria-busy="true"
      aria-label="Loading content"
    >
      <span className="sr-only">Loading content…</span>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={cn(
            "h-20 rounded-2xl border border-white/10 bg-white/5 animate-pulse",
            rowClassName
          )}
        />
      ))}
    </div>
  );
}
