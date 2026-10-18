/**
 * Shared timestamp formatting utilities for #562.
 *
 * Provides locale-aware absolute and relative timestamp formatting with:
 * - User timezone respect via Intl.DateTimeFormat
 * - Relative time (e.g. "2 hours ago") for recent dates
 * - Absolute ISO-like tooltip label for full context
 * - Graceful fallback for invalid/missing dates
 */

export const TIMESTAMP_FALLBACK = "—";

/**
 * Returns true when the value can be turned into a valid Date.
 */
export function isValidDate(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  const d = new Date(value as string | number | Date);
  return !isNaN(d.getTime());
}

/**
 * Coerce a raw value to a Date, or return null when it is invalid/missing.
 */
export function toDate(value: unknown): Date | null {
  if (!isValidDate(value)) return null;
  return new Date(value as string | number | Date);
}

/**
 * Resolve the user's IANA timezone string.
 * Falls back to "UTC" on environments that don't expose it.
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Resolve the user's BCP-47 locale string.
 * Falls back to "en-US" in non-browser environments.
 */
export function getUserLocale(): string {
  if (typeof navigator === "undefined") return "en-US";
  return navigator.language || "en-US";
}

/**
 * Format an unambiguous absolute timestamp suitable for tooltips.
 *
 * Example: "27 Aug 2026, 14:19 UTC+0"
 */
export function formatAbsoluteTimestamp(
  date: Date,
  locale: string = getUserLocale(),
  timeZone: string = getUserTimezone()
): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "shortOffset",
      timeZone,
    }).format(date);
  } catch {
    // Fallback when the timeZone string is invalid
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(date);
  }
}

/**
 * Format a human-readable relative time string (e.g. "2 hours ago").
 * Switches to an absolute date string when older than 7 days.
 */
export function formatRelativeTimestamp(
  date: Date,
  locale: string = getUserLocale(),
  timeZone: string = getUserTimezone(),
  now: Date = new Date()
): string {
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  // Very recent — show "just now"
  if (diffSeconds < 10) {
    try {
      return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
        0,
        "second"
      );
    } catch {
      return "just now";
    }
  }

  let value: number;
  let unit: Intl.RelativeTimeFormatUnit;

  if (diffSeconds < 60) {
    value = -diffSeconds;
    unit = "second";
  } else {
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      value = -diffMinutes;
      unit = "minute";
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) {
        value = -diffHours;
        unit = "hour";
      } else {
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) {
          value = -diffDays;
          unit = "day";
        } else if (diffDays < 30) {
          value = -Math.floor(diffDays / 7);
          unit = "week";
        } else if (diffDays < 365) {
          value = -Math.floor(diffDays / 30);
          unit = "month";
        } else {
          // Older than a year — show absolute date
          return formatAbsoluteTimestamp(date, locale, timeZone);
        }
      }
    }
  }

  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      value,
      unit
    );
  } catch {
    // Fallback when locale is unsupported
    return formatAbsoluteTimestamp(date, locale, timeZone);
  }
}

/**
 * Format a short date for compact views (e.g. "Aug 27").
 * Returns TIMESTAMP_FALLBACK for invalid inputs.
 */
export function formatShortDate(
  value: unknown,
  locale: string = getUserLocale(),
  timeZone: string = getUserTimezone()
): string {
  const date = toDate(value);
  if (!date) return TIMESTAMP_FALLBACK;
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      timeZone,
    }).format(date);
  } catch {
    return TIMESTAMP_FALLBACK;
  }
}
