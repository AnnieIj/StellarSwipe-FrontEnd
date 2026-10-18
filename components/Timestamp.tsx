"use client";

import { useState, useEffect } from "react";
import {
  toDate,
  formatRelativeTimestamp,
  formatAbsoluteTimestamp,
  getUserLocale,
  getUserTimezone,
  TIMESTAMP_FALLBACK,
} from "@/lib/timestampUtils";

interface TimestampProps {
  /** Raw date value: Date, ISO string, unix ms number, or null/undefined for fallback. */
  value: unknown;
  /**
   * Display mode:
   * - "relative"  — "2 hours ago" (default, updates every minute)
   * - "absolute"  — "27 Aug 2026, 14:19 UTC+0"
   * - "auto"      — relative for recent (<7 days), absolute for older
   */
  mode?: "relative" | "absolute" | "auto";
  /** CSS class forwarded to the wrapping <time> element. */
  className?: string;
  /**
   * Shown when value is missing or unparseable.
   * Defaults to TIMESTAMP_FALLBACK ("—").
   */
  fallback?: string;
}

/**
 * Timestamp — #562 shared date/timezone component.
 *
 * Renders a <time> element with:
 *  - Locale-aware relative or absolute display text
 *  - An unambiguous full timestamp in the title tooltip
 *  - Correct dateTime attribute for screen readers and parsers
 *  - Graceful "—" fallback for invalid/missing dates
 *
 * @example
 * <Timestamp value={signal.updatedAt} mode="relative" />
 * <Timestamp value={entry.createdAt} mode="absolute" />
 * <Timestamp value={null} />  {/* renders "—" *\/}
 */
export function Timestamp({
  value,
  mode = "relative",
  className,
  fallback = TIMESTAMP_FALLBACK,
}: TimestampProps) {
  const date = toDate(value);

  // Resolve locale/timezone once on mount (client-only)
  const [locale, setLocale] = useState("en-US");
  const [timeZone, setTimeZone] = useState("UTC");
  const [displayText, setDisplayText] = useState<string>(() => {
    if (!date) return fallback;
    return formatAbsoluteTimestamp(date, "en-US", "UTC");
  });

  useEffect(() => {
    const l = getUserLocale();
    const tz = getUserTimezone();
    setLocale(l);
    setTimeZone(tz);

    if (!date) {
      setDisplayText(fallback);
      return;
    }

    function update() {
      if (!date) return;
      if (mode === "absolute") {
        setDisplayText(formatAbsoluteTimestamp(date, l, tz));
      } else {
        // "relative" and "auto" both use relative for recent dates
        setDisplayText(formatRelativeTimestamp(date, l, tz));
      }
    }

    update();

    // Refresh relative display every minute
    if (mode !== "absolute") {
      const id = setInterval(update, 60_000);
      return () => clearInterval(id);
    }
  }, [date, mode, fallback]);

  if (!date) {
    return (
      <span className={className} aria-label={fallback}>
        {fallback}
      </span>
    );
  }

  const isoString = date.toISOString();
  const tooltip = formatAbsoluteTimestamp(date, locale, timeZone);

  return (
    <time
      dateTime={isoString}
      title={tooltip}
      className={className}
    >
      {displayText}
    </time>
  );
}
