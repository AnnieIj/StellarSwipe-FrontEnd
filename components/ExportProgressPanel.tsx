"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ExportProgressState } from "@/hooks/useExportProgress";

interface ExportProgressPanelProps {
  /** Current state produced by `useExportProgress`. */
  state: ExportProgressState;
  /** Cancel the running export. */
  onCancel: () => void;
  /** Dismiss the panel (resets to idle). */
  onDismiss: () => void;
  /** Called when the user clicks "Download" on a completed export. */
  onDownload?: (url: string, fileName: string) => void;
  /** Optional class overrides for the panel container. */
  className?: string;
}

/**
 * ExportProgressPanel
 *
 * A non-blocking progress surface that reflects the four export states
 * produced by `useExportProgress` (#779):
 *
 * - running  → progress bar + Cancel button
 * - done     → success message + Download / Dismiss
 * - cancelled → confirmation message + Dismiss
 * - error    → error message + Dismiss
 *
 * The panel is hidden when status === "idle" so it can be mounted
 * unconditionally alongside the trigger button.
 *
 * Accessibility:
 * - The panel uses role="status" while running (polite live region).
 * - On error it upgrades to role="alert" (assertive).
 * - The cancel button has a descriptive aria-label.
 * - Focus is moved into the panel when it becomes visible.
 */
export function ExportProgressPanel({
  state,
  onCancel,
  onDismiss,
  onDownload,
  className,
}: ExportProgressPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Move focus into the panel when it first appears so keyboard users
  // don't lose context.
  const prevStatus = useRef(state.status);
  useEffect(() => {
    if (prevStatus.current === "idle" && state.status !== "idle") {
      panelRef.current?.focus();
    }
    prevStatus.current = state.status;
  }, [state.status]);

  const handleDownload = useCallback(() => {
    if (state.downloadUrl && state.fileName) {
      if (onDownload) {
        onDownload(state.downloadUrl, state.fileName);
      } else {
        // Default: programmatically trigger download.
        const a = document.createElement("a");
        a.href = state.downloadUrl;
        a.download = state.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  }, [state.downloadUrl, state.fileName, onDownload]);

  if (state.status === "idle") return null;

  const isRunning = state.status === "running";
  const isDone = state.status === "done";
  const isCancelled = state.status === "cancelled";
  const isError = state.status === "error";

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="false"
      aria-label={
        isRunning
          ? "Export in progress"
          : isDone
            ? "Export complete"
            : isCancelled
              ? "Export cancelled"
              : "Export failed"
      }
      className={cn(
        "rounded-2xl border p-4 shadow-md outline-none transition-all",
        isRunning && "border-blue-500/25 bg-blue-500/10",
        isDone && "border-emerald-500/25 bg-emerald-500/10",
        isCancelled && "border-white/10 bg-white/5",
        isError && "border-red-500/25 bg-red-500/10",
        className
      )}
    >
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          {isRunning && (
            <Loader2
              size={16}
              className="shrink-0 animate-spin text-blue-400"
              aria-hidden="true"
            />
          )}
          {isDone && (
            <CheckCircle2
              size={16}
              className="shrink-0 text-emerald-400"
              aria-hidden="true"
            />
          )}
          {isCancelled && (
            <XCircle
              size={16}
              className="shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          )}
          {isError && (
            <AlertCircle
              size={16}
              className="shrink-0 text-red-400"
              aria-hidden="true"
            />
          )}
          <span
            className={cn(
              isRunning && "text-blue-300",
              isDone && "text-emerald-300",
              isCancelled && "text-muted-foreground",
              isError && "text-red-300"
            )}
          >
            {state.label}
          </span>
        </div>

        {/* Cancel (running) or Dismiss (terminal states) */}
        {isRunning ? (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel export"
            className="shrink-0 rounded-lg p-1 text-blue-300 transition-colors hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── Progress bar (running only) ─────────────────────────────────── */}
      {isRunning && (
        <div className="mt-3">
          <div
            role="progressbar"
            aria-valuenow={state.progress ?? undefined}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Export progress"
            className="h-1.5 w-full overflow-hidden rounded-full bg-blue-900/30"
          >
            <div
              className="h-full rounded-full bg-blue-400 transition-[width] duration-300 ease-out"
              style={{
                width:
                  state.progress !== null ? `${state.progress}%` : "100%",
              }}
            />
          </div>
          {state.progress !== null && (
            <p className="mt-1 text-right text-[11px] text-blue-400/70">
              {Math.round(state.progress)}%
            </p>
          )}
        </div>
      )}

      {/* ── Error details ────────────────────────────────────────────────── */}
      {isError && state.errorMessage && (
        <p className="mt-2 text-xs text-red-300/80">{state.errorMessage}</p>
      )}

      {/* ── File context + Download button (done) ───────────────────────── */}
      {isDone && state.fileName && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="truncate text-xs text-emerald-300/80">
            {state.fileName}
          </p>
          <Button
            size="sm"
            onClick={handleDownload}
            className="shrink-0 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-400"
          >
            <Download size={13} aria-hidden="true" />
            Download
          </Button>
        </div>
      )}

      {/* ── Cancel confirmation text ─────────────────────────────────────── */}
      {isCancelled && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          The export was stopped. No file was created.
        </p>
      )}
    </div>
  );
}
