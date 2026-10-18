"use client";

import { useState } from "react";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cn } from "@/lib/utils";

interface NetworkErrorStateProps {
  /** What failed to load, used in the default copy — e.g. "signals", "performance metrics". */
  context: string;
  onRetry?: () => void | Promise<unknown>;
  className?: string;
  /**
   * "card" renders a full centered fallback for an empty section.
   * "banner" renders a slim inline notice above content that's still
   * partially available (e.g. stale/cached data left on screen).
   */
  variant?: "card" | "banner";
}

/**
 * Network-aware fallback for data views. Distinguishes "you're offline"
 * from "the request failed for another reason" so the message is accurate
 * instead of a generic, brittle-feeling error — and always offers a visible
 * retry path.
 */
export function NetworkErrorState({
  context,
  onRetry,
  className,
  variant = "card",
}: NetworkErrorStateProps) {
  const { isOffline, isSlow, recheck } = useNetworkStatus();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      recheck();
      await Promise.resolve(onRetry?.());
    } finally {
      setRetrying(false);
    }
  };

  const title = isOffline
    ? "You're offline"
    : isSlow
      ? `Slow connection detected`
      : `Couldn't load ${context}`;

  const description = isOffline
    ? `We can't reach the network right now, so ${context} may be out of date. Reconnect and retry when you're back online.`
    : isSlow
      ? `Your connection looks slow — ${context} may take longer than usual to load.`
      : `Something went wrong while fetching ${context}. This is usually temporary.`;

  if (variant === "banner") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-xs",
          isOffline
            ? "border-destructive/30 bg-destructive/5 text-destructive"
            : "border-amber-500/30 bg-amber-500/10 text-amber-600",
          className
        )}
      >
        <span className="flex items-center gap-2 font-medium">
          {isOffline ? (
            <WifiOff size={13} aria-hidden="true" />
          ) : (
            <AlertTriangle size={13} aria-hidden="true" />
          )}
          {title} — {description}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={handleRetry}
          disabled={retrying}
        >
          <RefreshCw
            size={11}
            className={retrying ? "animate-spin" : ""}
            aria-hidden="true"
          />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border px-6 py-10 text-center",
        isOffline
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-surface/40",
        className
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl",
          isOffline
            ? "bg-destructive/10 text-destructive"
            : "bg-amber-500/10 text-amber-500"
        )}
        aria-hidden="true"
      >
        {isOffline ? <WifiOff size={20} /> : <AlertTriangle size={20} />}
      </div>
      <div className="max-w-sm">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 text-foreground-muted">
          {description}
        </p>
      </div>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={handleRetry} disabled={retrying}>
        <RefreshCw
          size={13}
          className={retrying ? "animate-spin" : ""}
          aria-hidden="true"
        />
        {retrying ? "Retrying…" : "Try again"}
      </Button>
    </div>
  );
}
