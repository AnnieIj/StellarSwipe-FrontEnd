"use client";

import { useCallback, useRef, useState } from "react";

export type ExportStatus = "idle" | "running" | "cancelled" | "done" | "error";

export interface ExportProgressState {
  status: ExportStatus;
  /** 0–100, or null when progress is indeterminate. */
  progress: number | null;
  /** Label describing the current phase, e.g. "Generating CSV…". */
  label: string;
  /** File name that was produced (populated on `done`). */
  fileName: string | null;
  /** Download URL for the exported file (populated on `done`). */
  downloadUrl: string | null;
  /** Error message (populated on `error`). */
  errorMessage: string | null;
}

export interface UseExportProgressOptions {
  /**
   * The async export function.  It receives a `signal` so it can check
   * `signal.aborted` during long-running loops and exit early.
   * It must call `reportProgress(0–100, label)` as work progresses.
   * On success it returns `{ fileName, url }`.
   */
  onExport: (
    signal: AbortSignal,
    reportProgress: (pct: number, label: string) => void
  ) => Promise<{ fileName: string; url: string }>;
  /** Label shown while work is starting. @default "Preparing export…" */
  initialLabel?: string;
}

export interface UseExportProgressResult {
  state: ExportProgressState;
  /** Start the export.  No-op if one is already running. */
  start: () => void;
  /** Cancel the in-progress export. No-op if not running. */
  cancel: () => void;
  /** Reset to `idle` so the panel can be re-opened. */
  reset: () => void;
}

const IDLE_STATE: ExportProgressState = {
  status: "idle",
  progress: null,
  label: "",
  fileName: null,
  downloadUrl: null,
  errorMessage: null,
};

/**
 * useExportProgress
 *
 * Manages the lifecycle of a long-running export: running → done / cancelled
 * / error.  The export function receives an AbortSignal so it can honour
 * cancellation mid-stream.
 *
 * Key properties (#779):
 * - `cancel()` aborts the underlying async work via AbortController.
 * - Cancelled and failed exports reset to a clean state — no stale progress.
 * - On `done`, the caller can read `state.downloadUrl` and trigger the download.
 * - The hook is UI-framework-agnostic; pair it with ExportProgressPanel for
 *   the visual surface.
 */
export function useExportProgress({
  onExport,
  initialLabel = "Preparing export…",
}: UseExportProgressOptions): UseExportProgressResult {
  const [state, setState] = useState<ExportProgressState>(IDLE_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const reportProgress = useCallback((pct: number, label: string) => {
    setState((prev) => {
      // If the export was cancelled while progress was being reported, ignore.
      if (prev.status !== "running") return prev;
      return {
        ...prev,
        progress: Math.min(100, Math.max(0, pct)),
        label,
      };
    });
  }, []);

  const start = useCallback(() => {
    setState((prev) => {
      if (prev.status === "running") return prev;
      return {
        status: "running",
        progress: 0,
        label: initialLabel,
        fileName: null,
        downloadUrl: null,
        errorMessage: null,
      };
    });

    const controller = new AbortController();
    abortRef.current = controller;

    onExport(controller.signal, reportProgress)
      .then(({ fileName, url }) => {
        // Only update state if the export wasn't cancelled in the meantime.
        setState((prev) => {
          if (prev.status !== "running") return prev;
          return {
            status: "done",
            progress: 100,
            label: "Export complete.",
            fileName,
            downloadUrl: url,
            errorMessage: null,
          };
        });
      })
      .catch((err: unknown) => {
        // AbortError means the user cancelled — surface a friendly state.
        const isCancelled =
          err instanceof Error && err.name === "AbortError";
        setState((prev) => {
          if (prev.status !== "running" && !isCancelled) return prev;
          if (isCancelled) {
            return {
              status: "cancelled",
              progress: null,
              label: "Export cancelled.",
              fileName: null,
              downloadUrl: null,
              errorMessage: null,
            };
          }
          return {
            status: "error",
            progress: null,
            label: "Export failed.",
            fileName: null,
            downloadUrl: null,
            errorMessage:
              err instanceof Error ? err.message : "An unexpected error occurred.",
          };
        });
      })
      .finally(() => {
        abortRef.current = null;
      });
  }, [onExport, initialLabel, reportProgress]);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setState((prev) => {
      if (prev.status !== "running") return prev;
      return {
        status: "cancelled",
        progress: null,
        label: "Export cancelled.",
        fileName: null,
        downloadUrl: null,
        errorMessage: null,
      };
    });
  }, []);

  const reset = useCallback(() => {
    // Cancel any in-flight work before resetting.
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setState(IDLE_STATE);
  }, []);

  return { state, start, cancel, reset };
}
