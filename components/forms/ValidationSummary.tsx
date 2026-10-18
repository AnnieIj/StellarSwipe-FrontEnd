"use client";

import { AlertCircle } from "lucide-react";
import type { ValidationError } from "@/hooks/useValidationSummary";

interface ValidationSummaryProps {
  errors: ValidationError[];
  /** Optional heading override, e.g. "3 fields need attention" */
  title?: string;
}

/**
 * Summary of failed form validation, shown after a submit attempt.
 * Each item links to (and focuses) its field so keyboard and screen
 * reader users can jump straight to the problem.
 */
export function ValidationSummary({ errors, title }: ValidationSummaryProps) {
  if (errors.length === 0) return null;

  const focusField = (field: string) => {
    document.getElementById(field)?.focus();
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
    >
      <p className="mb-1 flex items-center gap-1.5 font-medium">
        <AlertCircle size={14} aria-hidden="true" />
        {title ??
          `${errors.length} field${errors.length !== 1 ? "s" : ""} need${
            errors.length === 1 ? "s" : ""
          } attention`}
      </p>
      <ul className="ml-5 list-disc space-y-0.5">
        {errors.map((error) => (
          <li key={error.field}>
            <a
              href={`#${error.field}`}
              onClick={(e) => {
                e.preventDefault();
                focusField(error.field);
              }}
              className="rounded underline hover:text-red-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
            >
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
