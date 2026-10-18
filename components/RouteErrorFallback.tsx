"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

interface RouteErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Human-readable name of the affected area, e.g. "Provider profile". */
  areaName: string;
  /** Optional override for the body copy; defaults to a generic, safe message. */
  description?: string;
  /** Where the "back" action should take the user — a stable, still-working parent view. */
  parentHref: string;
  parentLabel: string;
}

/**
 * Segment-level error.tsx fallback. Renders inside the route's own layout,
 * so the app shell (nav, toasts, etc.) stays mounted and interactive —
 * only this route segment's content is replaced.
 */
export function RouteErrorFallback({
  error,
  reset,
  areaName,
  description,
  parentHref,
  parentLabel,
}: RouteErrorFallbackProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, startRetry] = useTransition();
  const router = useRouter();

  const handleRetry = () => {
    if (isRetrying) return;
    setRetryCount((count) => count + 1);
    // Re-fetch server data for this segment, then re-render it.
    startRetry(() => {
      router.refresh();
      reset();
    });
  };

  useEffect(() => {
    Sentry.withScope((scope) => {
      scope.setContext("route_error", { area: areaName, retryCount });
      Sentry.captureException(error);
    });
    // Only re-report when a *new* error instance surfaces (including after a retry).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div
        role="alert"
        aria-live="assertive"
        className="w-full max-w-md rounded-2xl border border-accent-danger/30 bg-accent-danger/10 p-6 text-center shadow-lg"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-danger/20">
          <AlertTriangle className="h-8 w-8 text-accent-danger" aria-hidden="true" />
        </div>

        <h2 className="mb-2 text-xl font-semibold text-foreground">
          {areaName} unavailable
        </h2>

        <p className="mb-4 text-sm text-foreground-muted">
          {description ??
            `Something went wrong loading ${areaName.toLowerCase()}. The rest of StellarSwipe is unaffected.`}
        </p>

        {retryCount > 0 && (
          <p className="mb-4 text-xs text-foreground-subtle" role="status">
            Still having trouble? Head back and try again in a moment.
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            aria-busy={isRetrying}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw
              className={`h-4 w-4${isRetrying ? " animate-spin" : ""}`}
              aria-hidden="true"
            />
            {isRetrying ? "Retrying…" : "Try Again"}
          </button>

          <Link
            href={parentHref}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {parentLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
