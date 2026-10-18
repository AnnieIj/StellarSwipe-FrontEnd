"use client";

/**
 * PageTransitionSkeleton
 * ─────────────────────
 * Responsive skeleton loader that adapts to different page layouts
 * - Desktop: Multiple card columns, full-height placeholder
 * - Mobile: Single column, compact layout
 * Uses Tailwind's responsive prefixes for mobile-first adaptation
 */

interface PageTransitionSkeletonProps {
  variant?: "feed" | "detail" | "table" | "grid";
}

export function PageTransitionSkeleton({
  variant = "feed",
}: PageTransitionSkeletonProps) {
  if (variant === "feed") {
    return (
      <div
        className="w-full space-y-3 md:space-y-4 px-3 md:px-0"
        role="status"
        aria-label="Loading feed"
      >
        <span className="sr-only">Loading feed…</span>
        {/* Mobile: 1 card, Desktop: 2 cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4" aria-hidden="true">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="w-full rounded-xl border border-border bg-surface p-4 md:p-5 space-y-3 md:space-y-4 animate-pulse"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 md:w-32 rounded bg-surface-high" />
                <div className="h-5 w-12 md:w-14 rounded-full bg-surface-high" />
              </div>

              {/* Main content area */}
              <div className="h-24 md:h-28 w-full rounded-lg bg-surface-high" />

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="space-y-1.5">
                    <div className="h-3 w-full rounded bg-surface-high" />
                    <div className="h-4 w-16 rounded bg-surface-high" />
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 md:pt-3">
                <div className="h-3 w-20 rounded bg-surface-high" />
                <div className="h-8 w-24 rounded-lg bg-surface-high" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div
        className="w-full space-y-4 md:space-y-6 px-3 md:px-0"
        role="status"
        aria-label="Loading page"
      >
        <span className="sr-only">Loading page…</span>
        <div aria-hidden="true" className="space-y-4 md:space-y-6">
          {/* Header section */}
          <div className="rounded-xl border border-border bg-surface p-4 md:p-6 space-y-4 animate-pulse">
            <div className="h-8 w-3/4 md:w-1/2 rounded bg-surface-high" />
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <div className="h-6 w-24 rounded bg-surface-high" />
              <div className="h-6 w-28 rounded bg-surface-high" />
            </div>
          </div>

          {/* Content sections */}
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-surface p-4 md:p-6 space-y-3 md:space-y-4 animate-pulse"
            >
              <div className="h-6 w-32 rounded bg-surface-high" />
              <div className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-4 w-full rounded bg-surface-high" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div
        className="w-full rounded-xl border border-border bg-surface overflow-hidden animate-pulse"
        role="status"
        aria-label="Loading table"
      >
        <span className="sr-only">Loading table…</span>
        <div aria-hidden="true">
          {/* Table header */}
          <div className="hidden md:flex items-center gap-4 px-4 md:px-6 py-4 border-b border-border bg-surface-high">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 w-24 rounded bg-surface" />
            ))}
          </div>

          {/* Mobile stack view */}
          <div className="md:hidden space-y-3 p-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-lg bg-surface-high p-3 space-y-2">
                <div className="h-4 w-3/4 rounded bg-surface" />
                <div className="h-4 w-1/2 rounded bg-surface" />
              </div>
            ))}
          </div>

          {/* Desktop table rows */}
          <div className="hidden md:block space-y-px">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-b-0 bg-surface hover:bg-surface-high/50"
              >
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-4 w-20 rounded bg-surface-high" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div
        className="w-full space-y-3 md:space-y-4 px-3 md:px-0"
        role="status"
        aria-label="Loading grid"
      >
        <span className="sr-only">Loading grid…</span>
        {/* Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4"
          aria-hidden="true"
        >
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-surface p-4 space-y-3 animate-pulse"
            >
              <div className="h-40 w-full rounded-lg bg-surface-high" />
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded bg-surface-high" />
                <div className="h-4 w-1/2 rounded bg-surface-high" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
