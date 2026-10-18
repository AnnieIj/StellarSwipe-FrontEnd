"use client";

import { useCallback, useState } from "react";

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Manages a set of field-level validation errors plus a submit-attempted
 * flag, so a summary can be shown only after a failed submit while
 * focusing an individual field clears only that field's own error
 * (unrelated errors stay visible).
 */
export function useValidationSummary() {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [submitted, setSubmitted] = useState(false);

  /** Runs validation, records any errors, and returns whether it passed. */
  const validate = useCallback((next: ValidationError[]) => {
    setSubmitted(true);
    setErrors(next);
    return next.length === 0;
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors((prev) => prev.filter((e) => e.field !== field));
  }, []);

  const reset = useCallback(() => {
    setErrors([]);
    setSubmitted(false);
  }, []);

  return {
    errors,
    hasErrors: errors.length > 0,
    submitted,
    validate,
    clearFieldError,
    reset,
  };
}
