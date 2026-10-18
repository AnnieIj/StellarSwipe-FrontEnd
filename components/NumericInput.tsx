"use client";

import {
  ChangeEvent,
  FocusEvent,
  useCallback,
  useId,
  useRef,
} from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  validateNumeric,
  type NumericValidationOptions,
} from "@/hooks/useNumericValidation";
import { cn } from "@/lib/utils";

export interface NumericInputProps extends NumericValidationOptions {
  /** Visible label for the field. */
  label: string;
  /** Input name attribute. */
  name: string;
  /** Controlled raw string value. */
  value: string;
  /** Called with the new raw string on every keystroke. */
  onChange: (value: string) => void;
  /** Called when the field loses focus. */
  onBlur?: () => void;
  /** Unit suffix shown inside the input (e.g. "%" or "XLM"). */
  unit?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** Extra Tailwind classes on the outer wrapper. */
  className?: string;
  /**
   * Whether the field has been touched (interacted with) — when true the
   * validation error becomes visible.  Pass the `touched` flag from
   * `useNumericValidation` to drive this automatically.
   */
  touched?: boolean;
  /** Override label for the helper hint shown when there is no error. */
  helperText?: string;
  /** Show a green success indicator when the value is valid. */
  showSuccess?: boolean;
}

/**
 * A controlled input specialised for numeric and percentage values.
 *
 * Features:
 * - Accepts both `.` and `,` as decimal separators (normalised on blur).
 * - Enforces min, max, and precision constraints from NumericValidationOptions.
 * - Displays inline validation rules and accessible error announcements.
 * - Strips pasted non-numeric noise.
 * - Works with `useNumericValidation` for full form-level control.
 */
export function NumericInput({
  label,
  name,
  value,
  onChange,
  onBlur,
  unit,
  placeholder,
  disabled = false,
  required = false,
  className,
  touched = false,
  helperText,
  showSuccess = true,
  // NumericValidationOptions forwarded to validateNumeric
  min,
  max,
  precision,
  isPercent,
  requiredMessage,
}: NumericInputProps) {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;
  const hintId = `${fieldId}-hint`;

  const inputRef = useRef<HTMLInputElement>(null);

  const validationResult = validateNumeric(value, {
    min,
    max,
    precision,
    required,
    isPercent,
    requiredMessage,
  });

  const error = touched ? validationResult.error : null;
  const isValid =
    showSuccess &&
    touched &&
    value !== "" &&
    validationResult.isValid;

  // Build a static hint string that describes the constraints.
  const constraintHint = buildConstraintHint({ min, max, precision, isPercent });

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      // Strip characters that can never be part of a valid number except the
      // minus sign, digits, period, and comma (locale decimal separator).
      const sanitised = e.target.value.replace(/[^0-9.,-]/g, "");
      onChange(sanitised);
    },
    [onChange]
  );

  const handleBlur = useCallback(
    (_e: FocusEvent<HTMLInputElement>) => {
      // Normalise comma → period on blur so the stored value is canonical.
      if (value.includes(",")) {
        onChange(value.replace(",", "."));
      }
      onBlur?.();
    },
    [value, onChange, onBlur]
  );

  const inputClasses = cn(
    "w-full rounded-lg border bg-transparent py-2 text-sm outline-none transition-colors",
    unit ? "pl-3 pr-10" : "px-3",
    error
      ? "border-destructive focus:ring-1 focus:ring-destructive"
      : isValid
      ? "border-emerald-500/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
      : "border-border focus:border-foreground focus:ring-1 focus:ring-foreground/20",
    disabled && "opacity-50 cursor-not-allowed"
  );

  const describedBy = [
    error ? errorId : null,
    constraintHint && !error ? hintId : null,
    helperText && !error && !constraintHint ? helperId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id={fieldId}
          name={name}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          placeholder={placeholder ?? (isPercent ? "0–100" : undefined)}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          autoComplete="off"
          className={inputClasses}
        />

        {/* Unit suffix */}
        {unit && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-foreground-muted select-none"
          >
            {unit}
          </span>
        )}

        {/* Success tick — only when no unit suffix to avoid overlap */}
        {isValid && !unit && (
          <CheckCircle2
            size={14}
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500"
          />
        )}
      </div>

      {/* Constraint hint (visible below the field when no error) */}
      {constraintHint && !error && (
        <p id={hintId} className="text-xs text-foreground-muted">
          {constraintHint}
        </p>
      )}

      {/* Error message — role="alert" so screenreaders announce it */}
      {error ? (
        <p
          id={errorId}
          role="alert"
          aria-live="assertive"
          className="flex items-center gap-1 text-xs text-destructive"
        >
          <AlertCircle size={12} aria-hidden="true" />
          {error}
        </p>
      ) : helperText && !constraintHint ? (
        <p id={helperId} className="text-xs text-foreground-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildConstraintHint(opts: NumericValidationOptions): string {
  const parts: string[] = [];

  const effectiveMin = opts.min ?? (opts.isPercent ? 0 : undefined);
  const effectiveMax = opts.max ?? (opts.isPercent ? 100 : undefined);

  if (effectiveMin !== undefined && effectiveMax !== undefined) {
    parts.push(`Range: ${effectiveMin}–${effectiveMax}${opts.isPercent ? "%" : ""}`);
  } else if (effectiveMin !== undefined) {
    parts.push(`Min: ${effectiveMin}${opts.isPercent ? "%" : ""}`);
  } else if (effectiveMax !== undefined) {
    parts.push(`Max: ${effectiveMax}${opts.isPercent ? "%" : ""}`);
  }

  if (opts.precision !== undefined) {
    parts.push(
      opts.precision === 0
        ? "Whole numbers only"
        : `Up to ${opts.precision} decimal place${opts.precision !== 1 ? "s" : ""}`
    );
  }

  return parts.join(" · ");
}
