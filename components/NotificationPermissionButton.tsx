"use client";

import { useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestNotificationPermission } from "@/lib/notifications";
import { useNotificationPreference } from "@/hooks/useNotificationPreference";
import { usePushSubscription } from "@/hooks/usePushSubscription";

export function NotificationPermissionButton() {
  const [isRequesting, setIsRequesting] = useState(false);
  const {
    permissionStatus,
    setPermissionStatus,
    deniedMessage,
    showDeniedMessage,
  } = useNotificationPreference();
  const { pushState, loading, subscribe, unsubscribe } = usePushSubscription();

  // Permission denied banner
  if (permissionStatus === "denied" && deniedMessage) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-600">
        <Bell size={14} />
        <span>
          Notifications are disabled. Check your browser settings to enable.
        </span>
        <button
          onClick={() => showDeniedMessage()}
          className="ml-auto"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  // Already subscribed to push — show opt-out button
  if (permissionStatus === "granted" && pushState === "subscribed") {
    return (
      <Button
        onClick={unsubscribe}
        disabled={loading}
        variant="outline"
        size="sm"
        aria-label="Disable push notifications"
      >
        <BellOff size={16} className="mr-1" />
        {loading ? "Unsubscribing…" : "Disable Push Alerts"}
      </Button>
    );
  }

  // Permission granted but not yet subscribed to push
  if (permissionStatus === "granted" && pushState === "idle") {
    return (
      <Button
        onClick={subscribe}
        disabled={loading}
        variant="outline"
        size="sm"
        aria-label="Enable push notifications"
      >
        <Bell size={16} className="mr-1" />
        {loading ? "Subscribing…" : "Enable Push Alerts"}
      </Button>
    );
  }

  // Default: request browser permission then subscribe
  if (permissionStatus === "default") {
    const handleEnable = async () => {
      setIsRequesting(true);
      try {
        const permission = await requestNotificationPermission();
        setPermissionStatus(permission);
        if (permission === "granted") {
          await subscribe();
        } else if (permission === "denied") {
          showDeniedMessage();
        }
      } finally {
        setIsRequesting(false);
      }
    };

    return (
      <Button
        onClick={handleEnable}
        disabled={isRequesting || pushState === "unsupported"}
        variant="outline"
        size="sm"
        aria-label="Enable notifications"
      >
        <Bell size={16} className="mr-1" />
        {isRequesting ? "Requesting…" : "Enable Notifications"}
      </Button>
    );
  }

  return null;
}
