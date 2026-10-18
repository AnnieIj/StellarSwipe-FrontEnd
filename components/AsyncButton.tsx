"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

/** Visual + logical state of the button. */
type ButtonState = "idle" | "pending" | "success" | "error";

export interface AsyncButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Async action to execute on click. Throw to signal failure. */
  onClick: () => Promise<void>;
  children: React.ReactNode;
  /** Label shown while the action is in-flight. Defaults to children. */
  loadingText?: string;
  /** Label shown briefly after success. Defaults to "Done". */
  successText?: string;
  /** Label shown briefly after failure, before restoring to idle. Defaults to "Failed". */
  errorText?: string;
  /**
   * How long (ms) the success / error state is shown before the button
   * reverts to idle. Defaults to 2000 ms.
   */
  feedbackDurationMs?: number;
  /**
   * When `true` the button shows the destructive variant style and the confirm
   * guard is enforced — useful for delete/cancel actions (#766).
   */
  destructive?: boolean;
}

/**
 * AsyncButton (#766)
 * ──────────────────
 * A button that safely manages async actions with:
 *
 * - **Stable dimensions**: a hidden measurement span ensures the button never
 *   changes width when the label transitions between idle/pending/success/error.
 * - **Duplicate-submit prevention**: the button is disabled and aria-busy while
 *   the action is in-flight.
 * - **Success feedback**: shows a check icon + successText for `feedbackDurationMs`
 *   then reverts to idle.
 * - **Error recovery**: shows an error icon + errorText for `feedbackDurationMs`
 *   then re-enables the button so the user can retry without losing context.
 * - **Accessible status**: uses `aria-busy`, `aria-disabled`, and a live-region
 *   span so screen readers announce state changes.
 * - **Variant-aware**: accepts all CVA button variants so it integrates with the
 *   design system. Pass `destructive` for delete/cancel actions.
 */
export function AsyncButton({
  onClick,
  children,
  loadingText,
  successText = "Done",
  errorText = "Failed",
  feedbackDurationMs = 2000,
  destructive = false,
  disabled,
  className,
  variant,
  size,
  ...props
}: AsyncButtonProps) {
  const [state, setState] = useState<ButtonState>("idle");
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref-based in-flight flag so the guard is synchronous (no setState race).
  const inFlightRef = useRef(false);

  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current !== null) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  // Clean up on unmount.
  useEffect(() => () => clearFeedbackTimer(), [clearFeedbackTimer]);

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (inFlightRef.current || disabled || state !== "idle") {
        e.preventDefault();
        return;
      }

      inFlightRef.current = true;
      setState("pending");
      clearFeedbackTimer();

      try {
        await onClick();
        setState("success");
      } catch {
        setState("error");
      } finally {
        inFlightRef.current = false;
        feedbackTimerRef.current = setTimeout(() => {
          setState("idle");
        }, feedbackDurationMs);
      }
    },
    [onClick, disabled, state, clearFeedbackTimer, feedbackDurationMs]
  );

  const isPending = state === "pending";
  const isDisabled = isPending || disabled || state === "success";

  // Resolve which CVA variant to use.
  const resolvedVariant =
    destructive && state === "idle"
      ? "destructive"
      : state === "error"
      ? "destructive"
      : variant ?? "default";

  // Current visible label text (used for the live region).
  const currentLabel =
    state === "pending"
      ? (loadingText ?? String(children))
      : state === "success"
      ? successText
      : state === "error"
      ? errorText
      : String(children);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-busy={isPending}
      aria-disabled={isDisabled}
      className={cn(
        buttonVariants({ variant: resolvedVariant, size }),
        // Ensure button width never shifts — use `relative` so we can overlay
        // the hidden measurement span.
        "relative",
        isDisabled && "cursor-not-allowed opacity-60",
        className
      )}
      {...props}
    >
      {/*
       * Hidden span that always renders all label text at once so the button
       * reserves enough width for its widest possible content (#766 — no
       * dimension jump during state changes).
       */}
      <span aria-hidden="true" className="invisible absolute inset-0 flex items-center justify-center gap-2 pointer-events-none select-none">
        <Loader2 className="h-4 w-4 shrink-0" />
        {loadingText ?? children}
      </span>

      {/* Visible content — overlaid on top of the measurement span. */}
      <span className="inline-flex items-center gap-2">
        {isPending && (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        )}
        {state === "success" && (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
        )}
        {state === "error" && (
          <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span>
          {state === "idle" && children}
          {state === "pending" && (loadingText ?? children)}
          {state === "success" && successText}
          {state === "error" && errorText}
        </span>
      </span>

      {/* Screen-reader live region announces state changes. */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {currentLabel}
      </span>
    </button>
  );
}

