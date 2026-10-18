"use client";

import { useState, useCallback } from "react";
import * as Sentry from "@sentry/nextjs";

/** Describes the outcome of the last copy attempt. */
export type ClipboardStatus = "idle" | "copied" | "error";

export interface UseClipboardOptions {
  /** Duration in ms before the "copied" state resets. Default: 2000 */
  resetDelay?: number;
  /**
   * Called when the clipboard write succeeds. Useful for triggering
   * non-intrusive confirmation UI external to the hook.
   */
  onSuccess?: () => void;
  /**
   * Called when clipboard permission is denied or the API is unavailable.
   * Receives the text so the caller can display a manual-copy fallback.
   */
  onError?: (text: string, err: unknown) => void;
}

export interface UseClipboardReturn {
  /** True immediately after a successful copy, resets after `resetDelay`. */
  copied: boolean;
  /** Reflects the last copy attempt outcome. */
  status: ClipboardStatus;
  /**
   * Error message when `status === "error"`. Suitable for displaying a
   * "please copy manually" prompt with the raw text.
   */
  errorMessage: string | null;
  /**
   * Copy `text` to clipboard.
   * Resolves to `true` on success, `false` on failure.
   */
  copy: (text: string) => Promise<boolean>;
  /** Reset status back to idle (e.g. when the user dismisses an error). */
  reset: () => void;
}

/**
 * Utility hook for copying text to the clipboard with:
 * - Nonintrusive success confirmation via `copied` / `status`
 * - Permission or browser failures surfaced via `status === "error"` and
 *   `errorMessage`, so callers can present a manual-copy fallback without
 *   relying on persistent notifications.
 * - Sensitive values are never stored in persistent state — the hook only
 *   tracks success/failure, not the copied content.
 * - Legacy `document.execCommand` fallback for browsers that don't support
 *   the async Clipboard API (e.g. older Safari, non-secure contexts).
 */
export function useClipboard(
  options: UseClipboardOptions = {}
): UseClipboardReturn {
  const { resetDelay = 2000, onSuccess, onError } = options;

  const [status, setStatus] = useState<ClipboardStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      // Clear previous error before each attempt
      setErrorMessage(null);

      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // Legacy execCommand fallback for older browsers / non-HTTPS
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.setAttribute("readonly", "");
          textarea.style.cssText = "position:fixed;opacity:0;pointer-events:none;";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          const ok = document.execCommand("copy");
          document.body.removeChild(textarea);
          if (!ok) throw new Error("execCommand copy returned false");
        }

        setStatus("copied");
        onSuccess?.();

        setTimeout(() => {
          setStatus((s) => (s === "copied" ? "idle" : s));
        }, resetDelay);

        return true;
      } catch (err) {
        // Determine a helpful message for the manual-copy fallback
        let message: string;
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          message =
            "Clipboard access was denied. Please copy manually: select the text and press Ctrl+C (or ⌘C on Mac).";
        } else if (!navigator?.clipboard) {
          message =
            "Your browser does not support automatic clipboard access. Please copy the value manually.";
        } else {
          message = "Copy failed. Please select the text and copy manually.";
        }

        setStatus("error");
        setErrorMessage(message);
        onError?.(text, err);

        Sentry.captureException(err, {
          extra: { context: "useClipboard", apiAvailable: !!navigator?.clipboard },
        });

        return false;
      }
    },
    [resetDelay, onSuccess, onError]
  );

  return {
    copied: status === "copied",
    status,
    errorMessage,
    copy,
    reset,
  };
}
