import { useState, useEffect } from "react";
import {
  formatRelativeTimestamp,
  getUserLocale,
  getUserTimezone,
  TIMESTAMP_FALLBACK,
} from "@/lib/timestampUtils";

/**
 * Returns a live-updating relative time string (e.g. "2 hours ago").
 *
 * Delegates to the shared timestamp utility (#562) for consistent
 * locale/timezone handling across the app.
 *
 * @param date - The date to display relative to now. Invalid values return TIMESTAMP_FALLBACK.
 */
export function useRelativeTime(date: Date | null | undefined): string {
  const [label, setLabel] = useState<string>(() => {
    if (!date || isNaN(date.getTime())) return TIMESTAMP_FALLBACK;
    return formatRelativeTimestamp(date, "en-US", "UTC");
  });

  useEffect(() => {
    if (!date || isNaN(date.getTime())) {
      setLabel(TIMESTAMP_FALLBACK);
      return;
    }

    const locale = getUserLocale();
    const timeZone = getUserTimezone();

    function update() {
      if (!date || isNaN(date.getTime())) return;
      setLabel(formatRelativeTimestamp(date, locale, timeZone));
    }

    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [date]);

  return label;
}
