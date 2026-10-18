"use client";

import {
  ChangeEvent,
  FocusEvent,
  useCallback,
  useId,
  useMemo,
  useState,
} from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type ValidateFn = (value: string) => string | null;

interface UseFormValidationOptions {
  initialValues?: Record<string, string>;
  validate?: Record<string, ValidateFn>;
}

export function useFormValidation({
  initialValues = {},
  validate = {},
}: UseFormValidationOptions = {}) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const setValue = useCallback(
    (name: string, value: string) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      if (touched[name] && validate[name]) {
        const error = validate[name](value);
        setErrors((prev) => ({ ...prev, [name]: error ?? "" }));
      }
    },
    [touched, validate]
  );

  const setFieldTouched = useCallback(
    (name: string) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      if (validate[name]) {
        const error = validate[name](values[name] ?? "");
        setErrors((prev) => ({ ...prev, [name]: error ?? "" }));
      }
    },
    [validate, values]
  );

  const validateAll = useCallback(() => {
    const nextErrors: Record<string, string> = {};
    let valid = true;
    for (const [name, fn] of Object.entries(validate)) {
      const error = fn(values[name] ?? "");
      if (error) {
        nextErrors[name] = error;
        valid = false;
      }
    }
    setErrors(nextErrors);
    setTouched(
      Object.keys(validate).reduce(
        (acc, k) => ({ ...acc, [k]: true }),
        {} as Record<string, boolean>
      )
    );
    return valid;
  }, [validate, values]);

  const isValid = useMemo(
    () => Object.values(errors).every((e) => !e),
    [errors]
  );

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateAll,
    isValid,
  };
}

interface SelectOption {
  label: string;
  value: string;
}

interface FormFieldProps {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "number" | "select" | "date";
  required?: boolean;
  validate?: ValidateFn;
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Guidance shown below the field when there is no error. */
  helperText?: string;
  /** Show a success indicator once the field is touched, has a value, and passes validation. */
  showSuccess?: boolean;
}

export function FormField({
  label,
  name,
  type = "text",
  required = false,
  validate: validateFn,
  error: externalError,
  value = "",
  onChange,
  onBlur,
  options = [],
  placeholder,
  disabled = false,
  className = "",
  helperText,
  showSuccess = true,
}: FormFieldProps) {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;

  const error = externalError ?? internalError;
  const isValid = showSuccess && touched && !!value && !error;

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const newValue = e.target.value;
      onChange?.(newValue);
      if (touched && validateFn) {
        const err = validateFn(newValue);
        setInternalError(err);
      }
    },
    [onChange, validateFn, touched]
  );

  const handleBlur = useCallback(
    (_e: FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      setTouched(true);
      if (validateFn) {
        const err = validateFn(value);
        setInternalError(err);
      }
      onBlur?.();
    },
    [value, validateFn, onBlur]
  );

  const inputClasses = `w-full rounded-lg border bg-transparent px-3 py-2 pr-8 text-sm outline-none transition-colors ${
    error
      ? "border-destructive focus:ring-1 focus:ring-destructive"
      : isValid
      ? "border-emerald-500/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
      : "border-border focus:border-foreground focus:ring-1 focus:ring-foreground/20"
  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

  return (
    <div className={`space-y-1.5 ${className}`}>
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
        {type === "select" ? (
          <select
            id={fieldId}
            name={name}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={inputClasses}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={fieldId}
            name={name}
            type={type}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            required={required}
            placeholder={placeholder}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={inputClasses}
          />
        )}

        {isValid && (
          <CheckCircle2
            size={14}
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500"
          />
        )}
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1 text-xs text-destructive"
        >
          <AlertCircle size={12} aria-hidden="true" />
          {error}
        </p>
      ) : (
        helperText && (
          <p id={helperId} className="text-xs text-foreground-muted">
            {helperText}
          </p>
        )
      )}
    </div>
  );
}
