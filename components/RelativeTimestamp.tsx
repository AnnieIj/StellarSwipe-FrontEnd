"use client";

import { Timestamp } from "@/components/Timestamp";

interface RelativeTimestampProps {
  timestamp: Date;
  className?: string;
}

/**
 * Displays a localized relative timestamp (e.g. "2 minutes ago", "3 hours ago").
 *
 * Delegates to the shared <Timestamp> component (#562) which handles
 * locale/timezone resolution, tooltip, and invalid-date fallback.
 */
export function RelativeTimestamp({
  timestamp,
  className,
}: RelativeTimestampProps) {
  return <Timestamp value={timestamp} mode="relative" className={className} />;
}
