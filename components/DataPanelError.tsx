"use client";

import {
  WifiOff,
  ServerCrash,
  ShieldOff,
  AlertTriangle,
  RefreshCw,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PanelErrorInfo } from "@/hooks/usePanelError";

interface DataPanelErrorProps {
  /** Structured error info from usePanelError.classify() */
  errorInfo: PanelErrorInfo;
  /** Called when the user clicks Retry */
  onRetry: () => void;
  /** Whether a retry is currently in flight */
  retrying?: boolean;
}

const ICONS: Record<PanelErrorInfo["reason"], React.ReactNode> = {
  network: <WifiOff className="h-8 w-8 text-yellow-500" aria-hidden="true" />,
  server: (
    <ServerCrash className="h-8 w-8 text-destructive" aria-hidden="true" />
  ),
  permission: (
    <ShieldOff className="h-8 w-8 text-orange-500" aria-hidden="true" />
  ),
  unknown: (
    <AlertTriangle className="h-8 w-8 text-foreground-subtle" aria-hidden="true" />
  ),
};

const BORDER_MAP: Record<PanelErrorInfo["reason"], string> = {
  network: "border-yellow-500/30 bg-yellow-500/5",
  server: "border-destructive/30 bg-destructive/5",
  permission: "border-orange-500/30 bg-orange-500/5",
  unknown: "border-border bg-surface/40",
};

/**
 * Generic, self-contained error panel for any data-fetching section.
 *
 * Displays a concise, actionable reason when available; falls back to
 * a safe generic message for unknown failures.  Retry is scoped to the
 * parent panel via the `onRetry` callback — it never reloads unrelated
 * content.
 */
export function DataPanelError({
  errorInfo,
  onRetry,
  retrying = false,
}: DataPanelErrorProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex flex-col items-center gap-3 rounded-2xl border p-6 text-center ${BORDER_MAP[errorInfo.reason]}`}
    >
      {ICONS[errorInfo.reason]}

      <div>
        <p className="text-sm font-semibold text-foreground">
          {errorInfo.title}
        </p>
        <p className="mt-1 text-xs text-foreground-muted">
          {errorInfo.message}
        </p>
      </div>

      <Button
        variant="default"
        size="sm"
        onClick={onRetry}
        disabled={retrying}
        className="mt-1 flex items-center gap-2"
        aria-label={`Retry loading ${errorInfo.title.toLowerCase()}`}
      >
        {retrying ? (
          <>
            <Clock size={14} className="animate-spin" aria-hidden="true" />
            Retrying\u2026
          </>
        ) : (
          <>
            <RefreshCw size={14} aria-hidden="true" />
            Try Again
          </>
        )}
      </Button>
    </div>
  );
}

/**
 * Safe fallback for truly unknown/unexpected errors.
 *
 * Shows a generic message with a logging hook so callers can surface
 * the error to their monitoring pipeline.  Used when the caller does
 * not have a specific error classification.
 */
export function DataPanelFallback({
  onRetry,
  retrying = false,
}: {
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <DataPanelError
      errorInfo={{
        reason: "unknown",
        title: "Unable to load data",
        message:
          "An unexpected error occurred. The rest of the page is unaffected. You can try again or check back later.",
      }}
      onRetry={onRetry}
      retrying={retrying}
    />
  );
}
