"use client";

import { useCallback, useState } from "react";

export interface NumericValidationOptions {
  /** Minimum allowed value (inclusive). */
  min?: number;
  /** Maximum allowed value (inclusive). */
  max?: number;
  /** Maximum number of decimal places. 0 means integers only. */
  precision?: number;
  /** Whether the field is required (empty string is an error). */
  required?: boolean;
  /** Treat input as a percentage: value must be 0–100 unless min/max override. */
  isPercent?: boolean;
  /** Custom error message for a required but empty field. */
  requiredMessage?: string;
}

export interface NumericValidationResult {
  /** Parsed numeric value, or null when the raw string is empty / invalid. */
  numericValue: number | null;
  /** The current validation error message, or null when the value is valid. */
  error: string | null;
  /** Whether the current raw string is valid (no error). */
  isValid: boolean;
}

/**
 * Validates a raw string as a numeric (or percentage) value according to
 * the supplied constraints.
 *
 * Handling:
 * - Normalises both `.` and `,` as decimal separators.
 * - Strips leading/trailing whitespace and pasted non-numeric noise.
 * - Enforces min, max, and decimal-precision bounds.
 * - Returns a human-readable, screenreader-friendly error message.
 */
export function validateNumeric(
  raw: string,
  options: NumericValidationOptions = {}
): NumericValidationResult {
  const {
    min,
    max,
    precision,
    required = false,
    isPercent = false,
    requiredMessage,
  } = options;

  const trimmed = raw.trim();

  if (trimmed === "") {
    if (required) {
      return {
        numericValue: null,
        error: requiredMessage ?? "This field is required.",
        isValid: false,
      };
    }
    return { numericValue: null, error: null, isValid: true };
  }

  // Normalise locale decimal separator (comma → period).
  const normalised = trimmed.replace(",", ".");

  // Reject anything that cannot represent a finite number.
  if (!/^-?\d*\.?\d*$/.test(normalised) || normalised === "-" || normalised === ".") {
    return {
      numericValue: null,
      error: "Please enter a valid number.",
      isValid: false,
    };
  }

  const value = parseFloat(normalised);

  if (!isFinite(value)) {
    return {
      numericValue: null,
      error: "Please enter a valid number.",
      isValid: false,
    };
  }

  // Precision check.
  if (precision !== undefined && precision >= 0) {
    const parts = normalised.split(".");
    if (parts.length > 1 && parts[1].length > precision) {
      const label = precision === 0 ? "whole numbers only" : `up to ${precision} decimal place${precision !== 1 ? "s" : ""}`;
      return {
        numericValue: value,
        error: `Enter ${label}.`,
        isValid: false,
      };
    }
  }

  // Percentage implicit bounds.
  const effectiveMin = min ?? (isPercent ? 0 : undefined);
  const effectiveMax = max ?? (isPercent ? 100 : undefined);

  if (effectiveMin !== undefined && value < effectiveMin) {
    return {
      numericValue: value,
      error: `Minimum value is ${effectiveMin}${isPercent ? "%" : ""}.`,
      isValid: false,
    };
  }

  if (effectiveMax !== undefined && value > effectiveMax) {
    return {
      numericValue: value,
      error: `Maximum value is ${effectiveMax}${isPercent ? "%" : ""}.`,
      isValid: false,
    };
  }

  return { numericValue: value, error: null, isValid: true };
}

/**
 * Hook that manages the raw input string and its validation state for a
 * single numeric / percentage field.
 *
 * @example
 * const { rawValue, numericValue, error, handleChange, handleBlur } =
 *   useNumericValidation({ min: 0, max: 100, isPercent: true, required: true });
 */
export function useNumericValidation(options: NumericValidationOptions = {}) {
  const [rawValue, setRawValue] = useState("");
  const [touched, setTouched] = useState(false);

  const result = validateNumeric(rawValue, options);

  // Only surface the error after the user has interacted with the field.
  const visibleError = touched ? result.error : null;

  const handleChange = useCallback((value: string) => {
    setRawValue(value);
  }, []);

  const handleBlur = useCallback(() => {
    setTouched(true);
  }, []);

  /** Force-validate and mark the field as touched (for pre-submit checks). */
  const touch = useCallback(() => setTouched(true), []);

  /** Reset value and touched state. */
  const reset = useCallback(() => {
    setRawValue("");
    setTouched(false);
  }, []);

  return {
    rawValue,
    numericValue: result.numericValue,
    error: visibleError,
    isValid: touched ? result.isValid : true,
    touched,
    handleChange,
    handleBlur,
    touch,
    reset,
  };
}
