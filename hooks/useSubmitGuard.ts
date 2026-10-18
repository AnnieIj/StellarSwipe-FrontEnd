"use client";

import { useCallback, useRef, useState } from "react";

export interface UseSubmitGuardReturn<T = void> {
  /**
   * True while the guarded submission is in-flight.
   * Use this to disable the submit button and Enter-key handler.
   */
  isSubmitting: boolean;
  /**
   * True when the last submission ended in an error.
   * The form remains actionable (not permanently disabled).
   */
  hasError: boolean;
  /**
   * Error message from the last failure, or null.
   */
  errorMessage: string | null;
  /**
   * Wrap your async submit handler with this function.
   * Guarantees only one in-flight call at a time — subsequent calls
   * while a submission is pending are silently ignored.
   *
   * On failure the form state is restored so the user can retry without
   * losing their valid input.
   */
  guard: (fn: () => Promise<T>) => Promise<T | undefined>;
  /**
   * Reset error state (e.g. when the user starts editing again).
   */
  clearError: () => void;
  /**
   * Props to spread on the submit button to enforce the guard at the DOM level.
   */
  submitButtonProps: {
    disabled: boolean;
    "aria-disabled": boolean;
    "aria-busy": boolean;
  };
}

/**
 * Centralises duplicate-submission prevention for all primary forms.
 *
 * - A single in-flight flag shared by both button-click and Enter-key paths.
 * - On failure, `isSubmitting` is reset to false so the form stays actionable.
 * - Callers never lose valid input on error — guard only manages pending state.
 *
 * @example
 * const { isSubmitting, guard, submitButtonProps } = useSubmitGuard();
 *
 * const handleSubmit = async (e: React.FormEvent) => {
 *   e.preventDefault();
 *   await guard(async () => {
 *     await saveEntry(formData);
 *   });
 * };
 *
 * <form onSubmit={handleSubmit}>
 *   <button type="submit" {...submitButtonProps}>Save</button>
 * </form>
 */
export function useSubmitGuard<T = void>(): UseSubmitGuardReturn<T> {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Ref-based in-flight flag so the guard check is synchronous
  const inFlightRef = useRef(false);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const guard = useCallback(async (fn: () => Promise<T>): Promise<T | undefined> => {
    // Idempotent: ignore if already in-flight
    if (inFlightRef.current) return undefined;

    inFlightRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await fn();
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An error occurred. Please try again.";
      setErrorMessage(message);
      return undefined;
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  }, []);

  return {
    isSubmitting,
    hasError: errorMessage !== null,
    errorMessage,
    guard,
    clearError,
    submitButtonProps: {
      disabled: isSubmitting,
      "aria-disabled": isSubmitting,
      "aria-busy": isSubmitting,
    },
  };
}
