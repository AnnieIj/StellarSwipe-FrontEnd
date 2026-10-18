"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { PerformanceDashboard } from "@/components/performance/PerformanceDashboard";
import { NetworkErrorState } from "@/components/NetworkErrorState";
import { RouteBreadcrumb } from "@/components/RouteBreadcrumb";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const FRESHNESS_THRESHOLD_MS = 5 * 60 * 1000;

type RefreshStatus = "idle" | "pending" | "success" | "error";

type FreshnessState = "loading" | "fresh" | "stale";

const STALE_AFTER_MS = 5 * 60 * 1000;

function formatFreshness(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function MetricFreshness({ timestamp }: { timestamp: number | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  let state: FreshnessState;
  if (timestamp === null) {
    state = "loading";
  } else if (now - timestamp > STALE_AFTER_MS) {
    state = "stale";
  } else {
    state = "fresh";
  }

  const label =
    state === "loading"
      ? "Loading"
      : formatFreshness(timestamp as number);

  const exact =
    timestamp === null
      ? "Data freshness unavailable"
      : `Data last updated ${new Date(timestamp).toLocaleString()}`;

  const tone =
    state === "stale"
      ? "text-amber-600"
      : "text-foreground-muted";

  return (
    <span
      className={`inline-flex h-5 min-w-[4.5rem] items-center gap-1 text-xs ${tone}`}
      title={exact}
      aria-label={exact}
      data-freshness={state}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          state === "stale"
            ? "bg-amber-500"
            : state === "loading"
              ? "bg-foreground-muted/50"
              : "bg-emerald-500"
        }`}
      />
      <span className="truncate">{label}</span>
    </span>
  );
}

function PerformanceDashboardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-surface p-4"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-border" />
            <div className="mt-3 h-7 w-20 animate-pulse rounded bg-border" />
            <div className="mt-3 h-3 w-16 animate-pulse rounded bg-border" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="h-4 w-40 animate-pulse rounded bg-border" />
        <div className="mt-4 h-56 w-full animate-pulse rounded bg-border sm:h-64 lg:h-72" />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-border" />
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-border" />
              <div className="h-4 flex-1 animate-pulse rounded bg-border" />
              <div className="h-4 w-16 shrink-0 animate-pulse rounded bg-border" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const { isOnline } = useNetworkStatus();
  const [lastUpdated, setLastUpdated] = useState<number>(() => Date.now());
  const [isStale, setIsStale] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>("idle");
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    const checkStaleness = () => {
      setIsStale(Date.now() - lastUpdated > FRESHNESS_THRESHOLD_MS);
    };
    checkStaleness();
    const interval = window.setInterval(checkStaleness, 30 * 1000);
    return () => window.clearInterval(interval);
  }, [lastUpdated]);

  useEffect(() => {
    if (isOnline) {
      setLastUpdated(Date.now());
    }
  }, [isOnline]);

  const handleRefresh = useCallback(async () => {
    scrollPositionRef.current = window.scrollY;
    setRefreshStatus("pending");
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 600));
      setLastUpdated(Date.now());
      setIsStale(false);
      setRefreshStatus("success");
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: scrollPositionRef.current });
      });
    } catch {
      setRefreshStatus("error");
    }
  }, []);

  useEffect(() => {
    if (refreshStatus !== "success" && refreshStatus !== "error") return;
    const timeout = window.setTimeout(() => setRefreshStatus("idle"), 4000);
    return () => window.clearTimeout(timeout);
  }, [refreshStatus]);

  const refreshLabel =
    refreshStatus === "pending"
      ? "Refreshing…"
      : refreshStatus === "success"
        ? "Refreshed"
        : refreshStatus === "error"
          ? "Refresh failed"
          : "Refresh";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <RouteBreadcrumb />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Performance Monitoring
          </h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Anonymous metrics for load times, API latency, crashes, device
            performance, and user experience.
          </p>
          <div className="mt-2">
            <MetricFreshness timestamp={isOnline ? lastUpdated : null} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isStale && (
            <span
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"
            >
              <span aria-hidden="true">●</span>
              Data may be out of date
            </span>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshStatus === "pending"}
            aria-busy={refreshStatus === "pending"}
            aria-label={refreshLabel}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span aria-hidden="true">
              {refreshStatus === "pending"
                ? "⟳"
                : refreshStatus === "success"
                  ? "✓"
                  : refreshStatus === "error"
                    ? "!"
                    : "⟳"}
            </span>
            {refreshLabel}
          </button>
        </div>
      </div>

      {refreshStatus === "error" && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          Could not refresh performance data. Please try again.
        </p>
      )}

      {!isOnline && (
        <div className="mb-6">
          <NetworkErrorState
            context="performance metrics"
            onRetry={() => window.location.reload()}
            variant="banner"
          />
        </div>
      )}

      <Suspense fallback={<PerformanceDashboardSkeleton />}>
        <PerformanceDashboard />
      </Suspense>
    </main>
  );
}
