"use client";

import { WifiOff, RefreshCw, Clock } from "lucide-react";
import type { SyncStatus } from "@/hooks/useSyncStatus";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { cn } from "@/lib/utils";

interface Props {
  status: SyncStatus;
  className?: string;
}

export function SyncStatusIndicator({ status, className }: Props) {
  const { state, lastSyncedAt } = status;
  const relativeTime = useRelativeTime(lastSyncedAt ?? new Date());

  if (state === "offline") {
    return (
      <span
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-1 text-xs text-accent-danger",
          className
        )}
      >
        <WifiOff size={11} aria-hidden="true" />
        Offline
      </span>
    );
  }

  if (state === "syncing") {
    return (
      <span
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-1 text-xs text-accent-sky",
          className
        )}
      >
        <RefreshCw size={11} className="animate-spin" aria-hidden="true" />
        Syncing…
      </span>
    );
  }

  if (state === "stale") {
    return (
      <span
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-1 text-xs text-accent-warning",
          className
        )}
      >
        <Clock size={11} aria-hidden="true" />
        Stale · {lastSyncedAt ? relativeTime : "unknown"}
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-label={lastSyncedAt ? `Last synced ${relativeTime}` : "Live"}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-foreground-subtle",
        className
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-accent-success"
        aria-hidden="true"
      />
      {lastSyncedAt ? relativeTime : "Live"}
    </span>
  );
}
