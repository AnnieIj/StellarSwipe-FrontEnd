/**
 * Settings change history (#900) — types and pure helpers.
 *
 * Store wiring lives in `lib/settingsRegistry.ts`; persistence in
 * `store/useSettingsHistoryStore.ts`.
 */

export type SettingValue = string | number | boolean;

/** Shown in place of a sensitive value. Raw sensitive values are never stored. */
export const REDACTED_VALUE = "Hidden";

/** Keep history bounded so localStorage doesn't grow without limit. */
export const MAX_HISTORY_ENTRIES = 50;

export interface SettingDefinition<T extends SettingValue = SettingValue> {
  /** Stable id persisted with each history entry. */
  id: string;
  /** User-facing setting name. */
  label: string;
  /** Reads the current value. */
  read: () => T;
  /**
   * Calls `onChange(next, prev)` whenever the value changes. Returns an
   * unsubscribe function.
   */
  subscribe: (onChange: (next: T, prev: T) => void) => () => void;
  // Method syntax (not arrow properties) keeps definitions for narrower value
  // types assignable to SettingDefinition<SettingValue> in the registry.
  /** Formats a value for display. Defaults to `String(value)`. */
  format?(value: T): string;
  /** Applies a previous value. Omit when the setting can't be restored. */
  restore?(value: T): void;
  /** Checks that a stored value is still valid before restoring it. */
  isValid?: (value: unknown) => value is T;
  /**
   * Sensitive values (URLs, secrets, account data) are redacted in history
   * and are never written to storage, so they can't be restored either.
   */
  sensitive?: boolean;
}

export interface SettingsHistoryEntry {
  id: string;
  settingId: string;
  /** Label at the time of the change, so entries stay readable if a setting is removed. */
  label: string;
  /** `null` when redacted. */
  previous: SettingValue | null;
  /** `null` when redacted. */
  current: SettingValue | null;
  /** ISO timestamp. */
  changedAt: string;
  redacted: boolean;
  /** Set when this change was made by restoring an earlier entry. */
  restoredFromId?: string;
}

export function createHistoryEntry(
  def: Pick<SettingDefinition, "id" | "label" | "sensitive">,
  previous: SettingValue,
  current: SettingValue,
  now: Date = new Date(),
  restoredFromId?: string
): SettingsHistoryEntry {
  const redacted = Boolean(def.sensitive);
  return {
    id: `${def.id}-${now.getTime().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    settingId: def.id,
    label: def.label,
    previous: redacted ? null : previous,
    current: redacted ? null : current,
    changedAt: now.toISOString(),
    redacted,
    ...(restoredFromId ? { restoredFromId } : {}),
  };
}

/** Display string for one side of an entry, honouring redaction. */
export function formatHistoryValue(
  def: SettingDefinition | undefined,
  value: SettingValue | null,
  redacted: boolean
): string {
  if (redacted || value === null) return REDACTED_VALUE;
  if (def?.format) {
    try {
      return def.format(value as never);
    } catch {
      // fall through to the raw value
    }
  }
  if (typeof value === "boolean") return value ? "On" : "Off";
  return String(value);
}

export type RestoreAvailability =
  | { restorable: true }
  | {
      restorable: false;
      reason: "unsupported" | "sensitive" | "invalid" | "current";
      message: string;
    };

/** Whether `entry.previous` can be restored right now, and if not, why. */
export function getRestoreAvailability(
  def: SettingDefinition | undefined,
  entry: SettingsHistoryEntry
): RestoreAvailability {
  if (entry.redacted || def?.sensitive) {
    return {
      restorable: false,
      reason: "sensitive",
      message: "Sensitive values can't be restored from history.",
    };
  }
  if (!def?.restore) {
    return {
      restorable: false,
      reason: "unsupported",
      message: "Restore isn't supported for this setting.",
    };
  }
  if (
    entry.previous === null ||
    (def.isValid && !def.isValid(entry.previous))
  ) {
    return {
      restorable: false,
      reason: "invalid",
      message: "This earlier value is no longer available.",
    };
  }
  let current: SettingValue | undefined;
  try {
    current = def.read();
  } catch {
    current = undefined;
  }
  if (current === entry.previous) {
    return {
      restorable: false,
      reason: "current",
      message: "Already the current value.",
    };
  }
  return { restorable: true };
}

/** True when the browser lets us persist history (not private/blocked/full). */
export function isHistoryStorageAvailable(): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const key = "__settings_history_probe__";
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
