"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Skeleton placeholders for dashboard widgets, sized to match each widget's
 * real layout so content doesn't shift when data arrives.
 */

export function PortfolioSummaryCardsSkeleton() {
  return (
    <Card
      className="w-full animate-pulse"
      role="status"
      aria-label="Loading portfolio snapshot"
    >
      <span className="sr-only">Loading portfolio snapshot…</span>
      <CardContent className="pt-4 pb-3 px-4" aria-hidden="true">
        <div className="h-3 w-32 rounded bg-surface-high mb-3" />
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-surface-high" />
                <div className="h-3 w-12 rounded bg-surface-high" />
              </div>
              <div className="h-4 w-16 rounded bg-surface-high" />
              <div className="h-3 w-10 rounded bg-surface-high" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PnLWidgetSkeleton() {
  return (
    <Card
      className="w-full animate-pulse"
      role="status"
      aria-label="Loading P&L overview"
    >
      <span className="sr-only">Loading P&amp;L overview…</span>
      <div aria-hidden="true">
        <CardHeader>
          <div className="h-5 w-32 rounded bg-surface-high" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-lg p-4 bg-surface-high/50 space-y-2">
            <div className="h-4 w-24 rounded bg-surface-high" />
            <div className="h-7 w-32 rounded bg-surface-high" />
          </div>
          <div className="rounded-lg p-4 bg-surface-high/50 space-y-2">
            <div className="h-4 w-32 rounded bg-surface-high" />
            <div className="h-7 w-20 rounded bg-surface-high" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-lg p-3 bg-surface-high/50 space-y-2">
                <div className="h-3 w-20 rounded bg-surface-high" />
                <div className="h-5 w-16 rounded bg-surface-high" />
              </div>
            ))}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export function PortfolioAllocationChartSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <Card
      className={cn("w-full animate-pulse", className)}
      role="status"
      aria-label="Loading portfolio allocation"
    >
      <span className="sr-only">Loading portfolio allocation…</span>
      <div aria-hidden="true">
        <CardHeader>
          <div className="h-5 w-40 rounded bg-surface-high" />
          <div className="h-3 w-28 rounded bg-surface-high" />
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-48 sm:h-56 flex items-center justify-center">
            <div className="h-36 w-36 sm:h-44 sm:w-44 rounded-full bg-surface-high" />
          </div>
          <div className="mt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-surface-high" />
                  <div className="h-3 w-20 rounded bg-surface-high" />
                </div>
                <div className="h-3 w-10 rounded bg-surface-high" />
              </div>
            ))}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export function PortfolioPerformanceBenchmarkChartSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <Card
      className={cn("w-full animate-pulse", className)}
      role="status"
      aria-label="Loading portfolio performance"
    >
      <span className="sr-only">Loading portfolio performance…</span>
      <div aria-hidden="true">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-5 w-56 rounded bg-surface-high" />
            <div className="h-3 w-24 rounded bg-surface-high" />
          </div>
          <div className="h-3 w-32 rounded bg-surface-high" />
        </CardHeader>
        <CardContent>
          <div className="h-48 sm:h-56 rounded-lg bg-surface-high/50" />
          <div className="mt-4 grid grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-20 rounded bg-surface-high" />
                <div className="h-4 w-14 rounded bg-surface-high" />
              </div>
            ))}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
