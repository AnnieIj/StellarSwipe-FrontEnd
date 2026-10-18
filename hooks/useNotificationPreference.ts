import { useState, useEffect } from "react";

const NOTIFICATION_ALERTS_KEY = "stellarswipe:notification-alerts-enabled";
const NOTIFICATION_CATEGORIES_KEY = "stellarswipe:notification-categories";

export type NotificationCategory =
  | "priceAlerts"
  | "newSignals"
  | "systemUpdates";

export interface CategoryPreferences {
  priceAlerts: boolean;
  newSignals: boolean;
  systemUpdates: boolean;
}

const DEFAULT_CATEGORIES: CategoryPreferences = {
  priceAlerts: true,
  newSignals: true,
  systemUpdates: true,
};

const updateCache = (alertsEnabled: boolean, prefs: CategoryPreferences) => {
  if (typeof window !== "undefined" && "caches" in window) {
    caches
      .open("notification-preferences")
      .then((cache) => {
        cache.put(
          "/preferences",
          new Response(
            JSON.stringify({
              alertsEnabled,
              ...prefs,
            })
          )
        );
      })
      .catch(() => {});
  }
};

export function useNotificationPreference() {
  const [alertsEnabled, setAlertsEnabled] = useState<boolean | null>(null);
  const [categoryPreferences, setCategoryPreferences] =
    useState<CategoryPreferences>(DEFAULT_CATEGORIES);
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermission>("default");
  const [deniedMessage, setDeniedMessage] = useState(false);

  useEffect(() => {
    // Load stored preference
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(NOTIFICATION_ALERTS_KEY);
      const alerts = stored ? JSON.parse(stored) : true;
      setAlertsEnabled(alerts);

      const storedCategories = localStorage.getItem(
        NOTIFICATION_CATEGORIES_KEY
      );
      let prefs = DEFAULT_CATEGORIES;
      if (storedCategories) {
        try {
          prefs = {
            ...DEFAULT_CATEGORIES,
            ...JSON.parse(storedCategories),
          };
        } catch {}
      }
      setCategoryPreferences(prefs);
      updateCache(alerts, prefs);

      // Check current permission status
      if ("Notification" in window) {
        setPermissionStatus(Notification.permission);
      }
    }
  }, []);

  const toggleAlerts = (enabled: boolean) => {
    setAlertsEnabled(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem(NOTIFICATION_ALERTS_KEY, JSON.stringify(enabled));
    }
    updateCache(enabled, categoryPreferences);
  };

  const toggleCategory = (category: NotificationCategory, enabled: boolean) => {
    const updated = {
      ...categoryPreferences,
      [category]: enabled,
    };
    setCategoryPreferences(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        NOTIFICATION_CATEGORIES_KEY,
        JSON.stringify(updated)
      );
    }
    updateCache(alertsEnabled ?? true, updated);
  };

  const showDeniedMessage = () => {
    setDeniedMessage(true);
    setTimeout(() => setDeniedMessage(false), 5000);
  };

  return {
    alertsEnabled: alertsEnabled ?? true,
    toggleAlerts,
    categoryPreferences,
    toggleCategory,
    permissionStatus,
    setPermissionStatus,
    deniedMessage,
    showDeniedMessage,
  };
}
