"use client";

import { useCallback, useEffect, useState } from "react";

export type ConnectionQuality = "online" | "slow" | "offline";

interface NavigatorConnection {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
}

function getConnection(): NavigatorConnection | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: NavigatorConnection })
    .connection;
}

function detectSlowConnection(): boolean {
  const conn = getConnection();
  if (!conn) return false;
  return conn.effectiveType === "slow-2g" || conn.effectiveType === "2g";
}

/**
 * Shared network-awareness hook for data views (dashboard, signals,
 * performance). Distinguishes "fully offline" from "technically connected
 * but slow" so callers can show accurate messaging instead of a generic
 * spinner or a silently empty view.
 */
export function useNetworkStatus() {
  const [quality, setQuality] = useState<ConnectionQuality>("online");
  const [retryToken, setRetryToken] = useState(0);

  const evaluate = useCallback(() => {
    if (typeof navigator === "undefined") return;
    if (!navigator.onLine) {
      setQuality("offline");
      return;
    }
    setQuality(detectSlowConnection() ? "slow" : "online");
  }, []);

  useEffect(() => {
    evaluate();
    const conn = getConnection();
    window.addEventListener("online", evaluate);
    window.addEventListener("offline", evaluate);
    conn?.addEventListener?.("change", evaluate);
    return () => {
      window.removeEventListener("online", evaluate);
      window.removeEventListener("offline", evaluate);
      conn?.removeEventListener?.("change", evaluate);
    };
  }, [evaluate]);

  /** Re-checks connectivity and bumps a token callers can key retries off of. */
  const recheck = useCallback(() => {
    evaluate();
    setRetryToken((t) => t + 1);
  }, [evaluate]);

  return {
    quality,
    isOnline: quality !== "offline",
    isOffline: quality === "offline",
    isSlow: quality === "slow",
    recheck,
    retryToken,
  };
}
