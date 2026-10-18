"use client";

import { WifiOff } from "lucide-react";

/**
 * Shown at the top of the signal feed when the user is offline and viewing
 * cached data. Trade actions (swipe-to-execute) must be disabled by the
 * parent while this banner is visible.
 */
export function OfflineBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 rounded-xl border border-accent-warning/40 bg-accent-warning/10 px-4 py-2.5 text-sm text-accent-warning"
    >
      <WifiOff size={15} aria-hidden="true" className="shrink-0" />
      <span>
        <strong>You&apos;re offline</strong> — showing cached signals. Trade actions are
        unavailable until you reconnect.
      </span>
    </div>
  );
}
