"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Generic failure state for a page/section. For signal-fetch specific
 * errors with network/timeout messaging, use SignalErrorState instead.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this data. Please try again.",
  onRetry,
  retryLabel = "Try again",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-slate-900/60 px-6 py-12 text-center",
        className
      )}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10"
        aria-hidden="true"
      >
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <div className="max-w-md">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1.5 text-sm text-foreground-muted">{description}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
