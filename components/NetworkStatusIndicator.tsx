"use client";

import { useEffect, useState } from "react";
import { WifiOff, AlertTriangle, Wifi } from "lucide-react";

type NetworkStatus = "online" | "offline" | "slow" | "reconnected";

// How long the "back online" confirmation stays visible after recovery.
const RECOVERY_MESSAGE_MS = 4000;

function detectSlowConnection(): boolean {
  const conn =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { connection?: { effectiveType?: string } })
          .connection
      : undefined;
  if (!conn) return false;
  return conn.effectiveType === "slow-2g" || conn.effectiveType === "2g";
}

export function NetworkStatusIndicator() {
  const [status, setStatus] = useState<NetworkStatus>("online");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      if (!navigator.onLine) {
        wasOffline = true;
        setStatus("offline");
        setVisible(true);
      } else if (detectSlowConnection()) {
        setStatus("slow");
        setVisible(true);
      } else {
        setStatus("online");
      }
    };

    let recoveryTimer: number | undefined;
    let wasOffline = false;

    const onOnline = () => {
      window.clearTimeout(recoveryTimer);
      if (!wasOffline) {
        setStatus("online");
        setVisible(false);
        return;
      }
      wasOffline = false;
      setStatus("reconnected");
      setVisible(true);
      recoveryTimer = window.setTimeout(() => {
        setStatus("online");
        setVisible(false);
      }, RECOVERY_MESSAGE_MS);
    };
    const onOffline = () => {
      window.clearTimeout(recoveryTimer);
      wasOffline = true;
      setStatus("offline");
      setVisible(true);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const conn = (navigator as Navigator & { connection?: EventTarget })
      .connection;
    if (conn) {
      conn.addEventListener("change", updateStatus);
    }

    updateStatus();

    return () => {
      window.clearTimeout(recoveryTimer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (conn) {
        conn.removeEventListener("change", updateStatus);
      }
    };
  }, []);

  if (!visible || status === "online") return null;

  const isOffline = status === "offline";
  const isReconnected = status === "reconnected";

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="network-status-banner"
      data-network-status={status}
      className={`print:hidden flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium ${
        isOffline
          ? "bg-destructive/90 text-destructive-foreground"
          : isReconnected
            ? "bg-green-600/90 text-white"
            : "bg-yellow-500/90 text-yellow-950"
      }`}
    >
      {isOffline ? (
        <WifiOff size={16} aria-hidden="true" className="shrink-0" />
      ) : isReconnected ? (
        <Wifi size={16} aria-hidden="true" className="shrink-0" />
      ) : (
        <AlertTriangle size={16} aria-hidden="true" className="shrink-0" />
      )}
      <span>
        {isOffline
          ? "You are offline. Your edits stay on this device and will sync when you reconnect."
          : isReconnected
            ? "Back online. Pending changes will sync now; retry any save that failed."
            : "Slow connection detected. Loading may take longer."}
      </span>
    </div>
  );
}
