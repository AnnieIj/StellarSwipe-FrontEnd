export function TradeSkeleton() {
  return (
    <div
      className="skeleton-shimmer w-full max-w-sm rounded-2xl border border-border bg-surface p-5 space-y-4"
      role="status"
      aria-label="Loading trade"
    >
      <span className="sr-only">Loading trade…</span>
      <div aria-hidden="true" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 rounded bg-surface-high" />
          <div className="h-5 w-14 rounded-full bg-surface-high" />
        </div>
        <div className="h-28 w-full rounded-xl bg-surface-high" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-16 rounded bg-surface-high" />
              <div className="h-4 w-12 rounded bg-surface-high" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="h-3 w-20 rounded bg-surface-high" />
          <div className="h-8 w-24 rounded-lg bg-surface-high" />
        </div>
      </div>
    </div>
  );
}
