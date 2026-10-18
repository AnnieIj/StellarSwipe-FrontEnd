"use client";

import { Timestamp } from "@/components/Timestamp";

interface SignalTimestampProps {
  updatedAt: Date;
}

/**
 * Displays a localized "Updated <relative time>" label for signals.
 * Delegates to the shared <Timestamp> component (#562).
 */
export function SignalTimestamp({ updatedAt }: SignalTimestampProps) {
  return (
    <span className="text-xs text-muted-foreground">
      Updated{" "}
      <Timestamp value={updatedAt} mode="relative" />
    </span>
  );
}
