"use client";

import { useCallback, useRef, useState } from "react";
import { NetworkError, ServerError } from "@/lib/api";

/**
 * Categorised failure reason exposed to the UI so each panel
 * can display a concise, actionable message.
 */
export type PanelFailureReason =
  | "network"
  | "server"
  | "permission"
  | "unknown";

export interface PanelErrorInfo {
  /** High-level category of the failure */
  reason: PanelFailureReason;
  /** Short, user-facing headline */
  title: string;
  /** One-sentence explanation the user can act on */
  message: string;
}

/**
 * Map an arbitrary Error (or unknown) to a structured error info
 * object.  Falls back to a safe "unknown" entry so callers never
 * have to handle `null`.
 */
export function classifyError(error: unknown): PanelErrorInfo {
  if (error instanceof NetworkError) {
    return {
      reason: "network",
      title: "Connection problem",
      message:
        "We couldn\u2019t reach the server. Check your internet connection and try again.",
    };
  }

  if (error instanceof ServerError) {
    if (error.status === 403 || error.status === 401) {
      return {
        reason: "permission",
        title: "Permission denied",
        message:
          "You don\u2019t have access to this data. Make sure you\u2019re signed in with the right account.",
      };
    }
    return {
      reason: "server",
      title: "Service unavailable",
      message:
        "The server is temporarily down. Our team has been notified \u2014 try again in a moment.",
    };
  }

  // Unknown or unrecognised error
  const msg =
    error instanceof Error ? error.message : "An unexpected error occurred.";
  return {
    reason: "unknown",
    title: "Something went wrong",
    message: msg || "An unexpected error occurred. Please try again.",
  };
}

const PANEL_ERROR_PREFIX = "[DataPanelError]";

function logFailure(panelId: string, info: PanelErrorInfo, raw: unknown) {
  // Surface to console so it shows up in any log pipeline the app wires up.
  console.warn(
    `${PANEL_ERROR_PREFIX} panel="${panelId}" reason=${info.reason}`,
    raw instanceof Error ? raw : String(raw),
  );
}

interface UsePanelErrorOptions {
  /** Stable identifier for the panel (e.g. "signal-feed", "portfolio") */
  panelId: string;
}

/**
 * Manages error state for a single data panel.
 *
 * - `classify`  – maps any thrown value to a user-facing info object
 * - `retrying`  – `true` while an async retry callback is in flight
 * - `handleRetry` – wraps the caller's async retry function; tracks
 *   `retrying` state and logs unknown failures automatically
 */
export function usePanelError({ panelId }: UsePanelErrorOptions) {
  const [retrying, setRetrying] = useState(false);
  const mountedRef = useRef(true);

  // Track mounted so we don't setState after unmount
  useState(() => {
    return () => {
      mountedRef.current = false;
    };
  });

  const classify = useCallback(
    (error: unknown): PanelErrorInfo => {
      const info = classifyError(error);
      // Always log unknowns so they're visible in dev / CI
      if (info.reason === "unknown") {
        logFailure(panelId, info, error);
      }
      return info;
    },
    [panelId],
  );

  const handleRetry = useCallback(
    async (retryFn: () => Promise<void>) => {
      setRetrying(true);
      try {
        await retryFn();
      } catch (err) {
        const info = classifyError(err);
        logFailure(panelId, info, err);
      } finally {
        if (mountedRef.current) {
          setRetrying(false);
        }
      }
    },
    [panelId],
  );

  return { classify, retrying, handleRetry } as const;
}
