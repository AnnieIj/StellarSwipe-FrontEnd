import { cn } from "@/lib/utils";

interface SignalCardSkeletonProps {
  density?: "comfortable" | "compact";
  animationDelay?: number;
  style?: React.CSSProperties;
  className?: string;
}

// #192: richer skeleton that mirrors SignalCard's structure (header, price grid,
// live-delta box, mini chart, action row) so swapping in real data doesn't shift layout.
export function SignalCardSkeleton({
  density = "comfortable",
  animationDelay,
  style,
  className,
}: SignalCardSkeletonProps = {}) {
  const mergedStyle: React.CSSProperties = {
    ...(animationDelay !== undefined && {
      "--shimmer-delay": `${animationDelay}ms`,
    }),
    ...style,
  };

  return (
    <div
      className={cn(
        "skeleton-shimmer rounded-3xl border border-white/10 bg-slate-900/80",
        density === "compact" ? "p-2 sm:p-3 mb-2" : "p-4 sm:p-6 mb-4",
        className
      )}
      style={mergedStyle}
      role="status"
      aria-label="Loading signal"
    >
      <span className="sr-only">Loading signal…</span>

      <div aria-hidden="true">
        <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between ${
          density === "compact" ? "gap-2" : "gap-3"
        }`}>
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-5 w-24 rounded-lg bg-surface-high" />
              <div className="h-4 w-14 rounded-md bg-surface-high" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-3 w-16 rounded bg-surface-high" />
              <div className="h-3 w-10 rounded bg-surface-high" />
              <div className="h-3 w-20 rounded bg-surface-high" />
            </div>
          </div>
          <div className="h-8 w-16 shrink-0 rounded-full bg-surface-high" />
        </div>

        <div className={density === "compact" ? "mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4" : "mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-1.5">
              <div className="h-3 w-16 rounded bg-surface-high" />
              <div className="h-4 w-12 rounded bg-surface-high" />
            </div>
          ))}
        </div>

        <div className={density === "compact" ? "mt-2 grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 sm:grid-cols-[minmax(0,1fr)_auto]" : "mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 sm:grid-cols-[minmax(0,1fr)_auto]"}>
          <div className="space-y-1.5">
            <div className="h-3 w-16 rounded bg-surface-high" />
            <div className="h-7 w-24 rounded-full bg-surface-high" />
          </div>
          <div className="h-3 w-14 self-end rounded bg-surface-high sm:self-center" />
        </div>

        {/* mini chart preview placeholder, sized to match MiniChart's default 120x40 viewBox */}
        <div className={density === "compact" ? "mt-2 flex items-center gap-2" : "mt-4 flex items-center gap-2"}>
          <div className="h-4 w-4 shrink-0 rounded-full bg-surface-high" />
          <div className="h-10 flex-1 rounded-xl bg-surface-high" />
        </div>

        <div className={density === "compact" ? "mt-2 h-9 w-full rounded-xl bg-surface-high" : "mt-4 h-9 w-full rounded-xl bg-surface-high"} />

        <div className={density === "compact" ? "mt-2 flex gap-2" : "mt-4 flex gap-2"}>
          <div className="h-9 flex-1 rounded-lg bg-surface-high" />
          <div className="h-9 flex-1 rounded-lg bg-surface-high" />
        </div>
      </div>
    </div>
  );
}
