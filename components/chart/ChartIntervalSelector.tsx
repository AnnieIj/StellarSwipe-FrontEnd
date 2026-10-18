"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  CHART_INTERVALS,
  ChartInterval,
  DEFAULT_INTERVAL,
  useChartIntervalStore,
} from "@/store/useChartIntervalStore";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChartIntervalSelectorProps {
  /**
   * The set of intervals this chart surface supports.
   * Defaults to all intervals when omitted.
   */
  supportedIntervals?: ChartInterval[];
  /**
   * Override the selected interval from the parent — useful for charts that
   * manage their own local interval rather than using the global store.
   */
  value?: ChartInterval;
  /** Called when the user picks a new interval. */
  onChange?: (interval: ChartInterval) => void;
  /** Whether the chart is currently fetching data for the selected interval. */
  isLoading?: boolean;
  /**
   * URL search-param key to sync the selection into.
   * When provided the selected interval is written to `?<syncKey>=<interval>`.
   * Defaults to "interval" when `syncToUrl` is true.
   */
  syncToUrl?: boolean;
  urlParamKey?: string;
  className?: string;
  /** Visual size variant. */
  size?: "sm" | "md";
}

const ALL_INTERVALS = Object.keys(CHART_INTERVALS) as ChartInterval[];
const DEFAULT_URL_PARAM = "interval";

// ---------------------------------------------------------------------------
// URL sync hook (internal)
// ---------------------------------------------------------------------------

/**
 * Reads the initial interval from a URL search param (if present and valid),
 * and writes back when the interval changes.
 */
function useUrlSync(
  enabled: boolean,
  paramKey: string,
  value: ChartInterval,
  onChange: (i: ChartInterval) => void
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // On mount, hydrate from the URL if a valid value is present.
  useEffect(() => {
    if (!enabled) return;
    const raw = searchParams.get(paramKey);
    if (raw && ALL_INTERVALS.includes(raw as ChartInterval) && raw !== value) {
      onChange(raw as ChartInterval);
    }
    // Only run once on mount — intentional single-run effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push URL update whenever the selection changes.
  useEffect(() => {
    if (!enabled) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramKey, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [enabled, value, paramKey, router, pathname, searchParams]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ChartIntervalSelector
 *
 * A consistent pill-style control for selecting the time interval used by a
 * price or performance chart.  Key properties:
 *
 * - Highlights unsupported intervals with a tooltip explaining why they are
 *   unavailable, instead of silently hiding them.
 * - Shows a loading indicator on the currently-selected interval while new
 *   data is being fetched, preserving chart framing so the layout doesn't shift.
 * - Optionally syncs the selection to a URL search parameter so sharing a link
 *   or refreshing the page restores the correct view.
 * - Works with both the global `useChartIntervalStore` and a local controlled
 *   `value`/`onChange` pair.
 */
export function ChartIntervalSelector({
  supportedIntervals,
  value: controlledValue,
  onChange: controlledOnChange,
  isLoading = false,
  syncToUrl = false,
  urlParamKey = DEFAULT_URL_PARAM,
  className,
  size = "md",
}: ChartIntervalSelectorProps) {
  const globalInterval = useChartIntervalStore((s) => s.interval);
  const setGlobalInterval = useChartIntervalStore((s) => s.setInterval);

  const isControlled = controlledValue !== undefined;
  const activeInterval = isControlled ? controlledValue : globalInterval;

  const handleChange = useCallback(
    (interval: ChartInterval) => {
      if (isControlled) {
        controlledOnChange?.(interval);
      } else {
        setGlobalInterval(interval);
      }
    },
    [isControlled, controlledOnChange, setGlobalInterval]
  );

  useUrlSync(syncToUrl, urlParamKey, activeInterval, handleChange);

  const intervals = supportedIntervals ?? ALL_INTERVALS;
  const allIntervals = ALL_INTERVALS;

  const listId = useId();

  return (
    <div
      role="group"
      aria-label="Chart time interval"
      id={listId}
      className={cn("flex items-center gap-0.5 rounded-xl bg-surface-high p-0.5", className)}
    >
      {allIntervals.map((interval) => {
        const meta = CHART_INTERVALS[interval];
        const isSupported = intervals.includes(interval);
        const isActive = activeInterval === interval;
        const isActiveLoading = isActive && isLoading;

        return (
          <button
            key={interval}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`${meta.description}${!isSupported ? " (unavailable for this chart)" : ""}${isActiveLoading ? ", loading" : ""}`}
            title={
              !isSupported
                ? `${meta.description} is not available for this chart type.`
                : meta.description
            }
            disabled={!isSupported}
            onClick={() => isSupported && handleChange(interval)}
            className={cn(
              "relative flex items-center justify-center rounded-lg font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              size === "sm" ? "h-6 min-w-[32px] px-1.5 text-[10px]" : "h-7 min-w-[36px] px-2 text-xs",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : isSupported
                  ? "text-foreground-muted hover:text-foreground"
                  : "cursor-not-allowed text-foreground-subtle opacity-40"
            )}
          >
            {isActiveLoading ? (
              // Show a spinner on the active button while loading; the label
              // remains in the DOM for screen readers via aria-label.
              <Loader2 size={size === "sm" ? 10 : 12} className="animate-spin" aria-hidden="true" />
            ) : (
              meta.label
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unsupported combination callout (standalone)
// ---------------------------------------------------------------------------

interface UnsupportedIntervalCalloutProps {
  interval: ChartInterval;
  reason?: string;
  supportedIntervals: ChartInterval[];
  onSelectSupported?: (interval: ChartInterval) => void;
  className?: string;
}

/**
 * UnsupportedIntervalCallout
 *
 * Renders an actionable explanation when the selected interval is not
 * compatible with the current chart (e.g. a chart without enough history
 * to show a 1-year view, or an intraday chart that doesn't support weekly).
 */
export function UnsupportedIntervalCallout({
  interval,
  reason,
  supportedIntervals,
  onSelectSupported,
  className,
}: UnsupportedIntervalCalloutProps) {
  const meta = CHART_INTERVALS[interval];
  const firstSupported = supportedIntervals[0];
  const firstSupportedMeta = firstSupported ? CHART_INTERVALS[firstSupported] : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm",
        className
      )}
    >
      <AlertCircle className="mt-0.5 shrink-0 text-amber-400" size={16} aria-hidden="true" />
      <div className="flex-1">
        <p className="font-medium text-amber-300">
          {meta.description} not available
        </p>
        <p className="mt-0.5 text-xs text-amber-300/80">
          {reason ??
            `This chart does not have enough history to display the ${meta.description} view.`}
          {firstSupportedMeta && (
            <>
              {" "}
              Try{" "}
              <button
                type="button"
                onClick={() => onSelectSupported?.(firstSupported)}
                className="underline hover:text-amber-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
              >
                {firstSupportedMeta.description}
              </button>{" "}
              instead.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook: controlled interval with URL sync (for page-level use)
// ---------------------------------------------------------------------------

/**
 * useChartInterval
 *
 * Convenience hook for charts that want a local interval state that is
 * also reflected in the URL.
 *
 * @example
 * const { interval, setInterval, isSupported } = useChartInterval({
 *   supportedIntervals: ["1D", "1W", "1M"],
 *   syncToUrl: true,
 * });
 */
export function useChartInterval({
  supportedIntervals,
  syncToUrl = false,
  urlParamKey = DEFAULT_URL_PARAM,
}: {
  supportedIntervals?: ChartInterval[];
  syncToUrl?: boolean;
  urlParamKey?: string;
} = {}) {
  const globalInterval = useChartIntervalStore((s) => s.interval);
  const setGlobalInterval = useChartIntervalStore((s) => s.setInterval);

  const [localInterval, setLocalInterval] = useState<ChartInterval>(globalInterval);

  const supported = supportedIntervals ?? ALL_INTERVALS;

  // If the global interval is not supported here, fall back to the first supported one.
  const activeInterval: ChartInterval = supported.includes(localInterval)
    ? localInterval
    : (supported[0] ?? DEFAULT_INTERVAL);

  const isSupported = supported.includes(localInterval);

  const setInterval = useCallback(
    (interval: ChartInterval) => {
      setLocalInterval(interval);
      // Also update the global store so other charts can follow along.
      setGlobalInterval(interval);
    },
    [setGlobalInterval]
  );

  useUrlSync(syncToUrl, urlParamKey, activeInterval, setInterval);

  return { interval: activeInterval, setInterval, isSupported, supportedIntervals: supported };
}
