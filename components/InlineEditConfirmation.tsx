"use client";

import {
  useState,
  useCallback,
  useId,
  KeyboardEvent,
} from "react";
import { AlertCircle, Check, X, Pencil, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateNumeric, type NumericValidationOptions } from "@/hooks/useNumericValidation";

export interface InlineEditConfirmationProps extends NumericValidationOptions {
  /** Current committed value (number). */
  value: number;
  /**
   * Called after the user confirms a valid new value.
   * Return a string to signal a server-side rejection with an explanation.
   * Return void/undefined to indicate success.
   */
  onConfirm: (newValue: number) => Promise<string | void> | string | void;
  /** Format the number for display (e.g. currency, percent). Defaults to two-decimal string. */
  formatDisplay?: (value: number) => string;
  /** Unit suffix shown inside the input (e.g. "%" or "XLM"). */
  unit?: string;
  /** Label for the field — used for accessible aria-label text. */
  label: string;
  /** Extra Tailwind classes on the outer wrapper. */
  className?: string;
  disabled?: boolean;
}

/**
 * InlineEditConfirmation
 *
 * Lets the user edit a financial value directly in the UI with a deliberate
 * two-step confirm/cancel flow before the change is committed.
 *
 * Features:
 * - Click the edit icon (or value) to enter edit mode.
 * - Validates format and allowed ranges inline via NumericValidationOptions.
 * - Shows old vs new value side-by-side before the user confirms.
 * - Cancel restores the original value without any network request.
 * - Server rejection (returned string from onConfirm) restores state and
 *   displays the correction message.
 * - Keyboard: Enter to confirm, Escape to cancel.
 * - Fully ARIA-labelled for screen readers.
 */
export function InlineEditConfirmation({
  value,
  onConfirm,
  formatDisplay = (v) => v.toFixed(2),
  unit,
  label,
  className,
  disabled = false,
  min,
  max,
  precision,
  isPercent,
  required,
  requiredMessage,
}: InlineEditConfirmationProps) {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [touched, setTouched] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // ─── Enter edit mode ──────────────────────────────────────────────────────
  const startEdit = useCallback(() => {
    if (disabled || pending) return;
    setDraft(String(value));
    setTouched(false);
    setServerError(null);
    setConfirming(false);
    setEditing(true);
  }, [value, disabled, pending]);

  // ─── Cancel – restore original ───────────────────────────────────────────
  const cancelEdit = useCallback(() => {
    setEditing(false);
    setDraft("");
    setTouched(false);
    setConfirming(false);
    setServerError(null);
  }, []);

  // ─── Validate draft on-demand ────────────────────────────────────────────
  const validation = validateNumeric(draft, {
    min,
    max,
    precision,
    required,
    isPercent,
    requiredMessage,
  });

  // ─── Advance to confirmation step ────────────────────────────────────────
  const requestConfirm = useCallback(() => {
    setTouched(true);
    if (!validation.isValid) return;
    setConfirming(true);
    setServerError(null);
  }, [validation.isValid]);

  // ─── Commit confirmed value ──────────────────────────────────────────────
  const commit = useCallback(async () => {
    if (!validation.isValid) return;

    const newValue = parseFloat(draft.replace(",", "."));
    if (isNaN(newValue)) return;

    setPending(true);
    try {
      const result = await onConfirm(newValue);
      if (typeof result === "string") {
        // Server rejected — show the message, stay in edit mode
        setServerError(result);
        setConfirming(false);
        setPending(false);
      } else {
        // Success
        setEditing(false);
        setConfirming(false);
        setDraft("");
        setTouched(false);
        setServerError(null);
        setPending(false);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setServerError(message);
      setConfirming(false);
      setPending(false);
    }
  }, [draft, onConfirm, validation.isValid]);

  // ─── Keyboard shortcuts inside the input ─────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (confirming) {
          void commit();
        } else {
          requestConfirm();
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      }
    },
    [confirming, commit, requestConfirm, cancelEdit]
  );

  const visibleError = touched ? validation.error : null;
  const newNumericValue = parseFloat(draft.replace(",", "."));

  // ─── Read mode ────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <span
        className={cn("inline-flex items-center gap-1.5 group", className)}
        aria-label={`${label}: ${formatDisplay(value)}. Press to edit.`}
      >
        <span className="tabular-nums">{formatDisplay(value)}</span>
        <button
          type="button"
          onClick={startEdit}
          disabled={disabled}
          aria-label={`Edit ${label}`}
          className={cn(
            "rounded p-0.5 text-muted-foreground opacity-0 transition-opacity",
            "group-hover:opacity-100 focus-visible:opacity-100",
            "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            disabled && "pointer-events-none"
          )}
        >
          <Pencil size={12} aria-hidden="true" />
        </button>
      </span>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* ── Input row ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            id={fieldId}
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={(e) =>
              setDraft(e.target.value.replace(/[^0-9.,-]/g, ""))
            }
            onBlur={() => setTouched(true)}
            onKeyDown={handleKeyDown}
            disabled={pending}
            autoFocus
            aria-label={label}
            aria-invalid={!!visibleError}
            aria-describedby={visibleError ? errorId : undefined}
            className={cn(
              "w-full rounded-lg border bg-transparent py-1.5 text-sm outline-none transition-colors",
              unit ? "pl-3 pr-10" : "px-3",
              visibleError
                ? "border-destructive focus:ring-1 focus:ring-destructive"
                : "border-border focus:border-foreground focus:ring-1 focus:ring-foreground/20",
              pending && "opacity-50"
            )}
          />
          {unit && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none"
            >
              {unit}
            </span>
          )}
        </div>

        {/* Confirm / cancel action buttons */}
        {!confirming && (
          <>
            <button
              type="button"
              onClick={requestConfirm}
              disabled={pending || !draft}
              aria-label={`Review change to ${label}`}
              className="rounded-lg border border-border p-1.5 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
            >
              <Check size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={pending}
              aria-label={`Cancel editing ${label}`}
              className="rounded-lg border border-border p-1.5 text-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* ── Inline validation error ───────────────────────────────────── */}
      {visibleError && (
        <p
          id={errorId}
          role="alert"
          aria-live="assertive"
          className="flex items-center gap-1 text-xs text-destructive"
        >
          <AlertCircle size={12} aria-hidden="true" />
          {visibleError}
        </p>
      )}

      {/* ── Server rejection message ──────────────────────────────────── */}
      {serverError && (
        <p
          role="alert"
          aria-live="assertive"
          className="flex items-center gap-1 text-xs text-destructive"
        >
          <AlertCircle size={12} aria-hidden="true" />
          {serverError}
        </p>
      )}

      {/* ── Confirmation step — shows old vs new ─────────────────────── */}
      {confirming && !visibleError && (
        <div
          role="region"
          aria-label="Confirm value change"
          className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm"
        >
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Review your change
          </p>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Current
              </span>
              <span className="tabular-nums line-through text-muted-foreground">
                {formatDisplay(value)}
              </span>
            </div>
            <span className="text-muted-foreground" aria-hidden="true">→</span>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                New
              </span>
              <span className="tabular-nums font-semibold text-foreground">
                {!isNaN(newNumericValue) ? formatDisplay(newNumericValue) : draft}
                {unit && ` ${unit}`}
              </span>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onClick={commit}
              disabled={pending}
              aria-label={`Confirm new ${label} value`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {pending ? (
                <span className="animate-pulse">Saving…</span>
              ) : (
                <>
                  <Check size={12} aria-hidden="true" />
                  Confirm
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              aria-label="Go back to editing"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Edit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
