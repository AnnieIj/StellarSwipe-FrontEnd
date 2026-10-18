"use client";

import { useEffect, useRef, useState } from "react";

export type SyncState = "synced" | "syncing" | "stale" | "offline";

export interface SyncStatus {
  state: SyncState;
  lastSyncedAt: Date | null;
}

const STALE_THRESHOLD_MS = 5 * 60 * 1000;

export function useSyncStatus(isFetching: boolean): SyncStatus {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const prevFetchingRef = useRef(isFetching);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (prevFetchingRef.current && !isFetching) {
      setLastSyncedAt(new Date());
    }
    prevFetchingRef.current = isFetching;
  }, [isFetching]);

  const state: SyncState = !online
    ? "offline"
    : isFetching
    ? "syncing"
    : lastSyncedAt !== null &&
      Date.now() - lastSyncedAt.getTime() > STALE_THRESHOLD_MS
    ? "stale"
    : "synced";

  return { state, lastSyncedAt };
}
