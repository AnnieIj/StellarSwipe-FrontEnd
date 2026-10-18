"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FormDraftOptions<T extends Record<string, unknown>> {
  /**
   * Unique storage key for this form's draft, e.g. `"draft:journal-entry"`.
   * Must be stable across renders (i.e. not derived from user input).
   */
  storageKey: string;
  /**
   * How often (ms) the draft is written to storage while the user is typing.
   * Defaults to 5 000 ms (5 seconds).
   */
  saveIntervalMs?: number;
  /**
   * Set of field names that must never be written to storage.
   * Common sensitive fields — password, secret, pin, cvv, ssn — are always
   * excluded regardless of this list (#767 requirement).
   */
  sensitiveFields?: readonly (keyof T & string)[];
  /**
   * Called with a human-readable error message when localStorage is
   * unavailable (quota exceeded, private browsing, etc.).
   * Defaults to a `console.warn`.
   */
  onStorageError?: (message: string) => void;
}

export interface UseFormDraftReturn<T extends Record<string, unknown>> {
  /** The restored draft values, or `null` if no draft exists. */
  draft: Partial<T> | null;
  /** True when a draft was found in storage on mount (before the user decides). */
  hasDraft: boolean;
  /**
   * Write the current form values to storage immediately.
   * Sensitive fields are stripped before writing.
   */
  saveDraft: (values: T) => void;
  /** Delete the stored draft (call after successful submission or discard). */
  clearDraft: () => void;
  /**
   * Register `values` for periodic auto-save. Call this whenever your form
   * values change (e.g. pass the watch result from react-hook-form).
   * Auto-save runs every `saveIntervalMs` while values are registered.
   */
  setLiveValues: (values: T) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Field names that are always stripped from drafts, case-insensitive. */
const ALWAYS_SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /\bpin\b/i,
  /cvv/i,
  /\bssn\b/i,
  /private[_\s]?key/i,
  /mnemonic/i,
  /seed[_\s]?phrase/i,
];

function isSensitiveField(
  fieldName: string,
  extraSensitiveFields: readonly string[]
): boolean {
  if (extraSensitiveFields.includes(fieldName)) return true;
  return ALWAYS_SENSITIVE_PATTERNS.some((re) => re.test(fieldName));
}

function stripSensitiveFields<T extends Record<string, unknown>>(
  values: T,
  sensitiveFields: readonly string[]
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(values) as (keyof T & string)[]) {
    if (!isSensitiveField(key, sensitiveFields)) {
      result[key] = values[key];
    }
  }
  return result;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * useFormDraft (#767)
 * ────────────────────
 * Persists unfinished form entries to `localStorage` so users never lose
 * long form work on tab close or unexpected navigation.
 *
 * Features:
 * - Auto-saves at a configurable interval (default 5 s) via `setLiveValues`.
 * - Exposes `hasDraft` so the form can offer a restore/discard choice on mount.
 * - Strips sensitive fields (password, secret, pin, cvv, ssn, mnemonic, seed
 *   phrase, private key) and any caller-specified fields before writing.
 * - Handles storage failures gracefully (quota exceeded, incognito) by calling
 *   `onStorageError` rather than throwing.
 *
 * @example
 * // In a form component:
 * const { hasDraft, draft, saveDraft, clearDraft, setLiveValues } =
 *   useFormDraft<JournalFormValues>({
 *     storageKey: "draft:journal-entry",
 *     sensitiveFields: ["privateNote"],
 *   });
 *
 * // Auto-save on every change:
 * const values = watch();
 * useEffect(() => setLiveValues(values), [values, setLiveValues]);
 *
 * // On successful submit:
 * clearDraft();
 *
 * // Offer restore UI when hasDraft is true.
 */
export function useFormDraft<T extends Record<string, unknown>>(
  options: FormDraftOptions<T>
): UseFormDraftReturn<T> {
  const {
    storageKey,
    saveIntervalMs = 5_000,
    sensitiveFields = [],
    onStorageError,
  } = options;

  const [draft, setDraft] = useState<Partial<T> | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const liveValuesRef = useRef<T | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleStorageError = useCallback(
    (err: unknown) => {
      const message =
        err instanceof Error
          ? `Form draft could not be saved: ${err.message}`
          : "Form draft could not be saved due to a storage error.";
      if (onStorageError) {
        onStorageError(message);
      } else {
        console.warn("[useFormDraft]", message);
      }
    },
    [onStorageError]
  );

  // On mount: read existing draft from storage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<T>;
        setDraft(parsed);
        setHasDraft(true);
      }
    } catch (err) {
      handleStorageError(err);
    }
  }, [storageKey, handleStorageError]);

  const saveDraft = useCallback(
    (values: T) => {
      const safe = stripSensitiveFields(values, sensitiveFields as string[]);
      try {
        localStorage.setItem(storageKey, JSON.stringify(safe));
      } catch (err) {
        handleStorageError(err);
      }
    },
    [storageKey, sensitiveFields, handleStorageError]
  );

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Removal failures are non-critical; swallow silently.
    }
    setDraft(null);
    setHasDraft(false);
  }, [storageKey]);

  const setLiveValues = useCallback((values: T) => {
    liveValuesRef.current = values;
  }, []);

  // Auto-save interval.
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const vals = liveValuesRef.current;
      if (vals !== null) saveDraft(vals);
    }, saveIntervalMs);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [saveDraft, saveIntervalMs]);

  return { draft, hasDraft, saveDraft, clearDraft, setLiveValues };
}
