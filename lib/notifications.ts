import {
  clearDeferredNotifications,
  deferNotification,
  getDeferredNotifications,
  getQuietHoursSettings,
  isWithinQuietHours,
} from "@/lib/quietHours";

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return await Notification.requestPermission();
}

export type NotificationCategory =
  | "priceAlerts"
  | "newSignals"
  | "systemUpdates";

export function canShowNotification(): boolean {
  return "Notification" in window && Notification.permission === "granted";
}

/**
 * Shows a notification unless it's blocked by preferences. Non-critical
 * notifications received during quiet hours are deferred and shown on the
 * next call made outside the window; `critical: true` bypasses quiet hours.
 */
export function showNotification(
  title: string,
  options?: NotificationOptions & {
    category?: NotificationCategory;
    critical?: boolean;
  }
) {
  if (!canShowNotification()) return;

  if (options?.category && typeof window !== "undefined") {
    const stored = localStorage.getItem("stellarswipe:notification-categories");
    if (stored) {
      try {
        const prefs = JSON.parse(stored);
        if (prefs[options.category] === false) {
          return;
        }
      } catch (e) {
        // ignore
      }
    }
  }

  if (typeof window !== "undefined") {
    const storedAlerts = localStorage.getItem(
      "stellarswipe:notification-alerts-enabled"
    );
    if (storedAlerts && JSON.parse(storedAlerts) === false) {
      return;
    }
  }

  const { critical, ...notificationOptions } = options ?? {};

  if (!critical && isWithinQuietHours(getQuietHoursSettings())) {
    deferNotification(title, notificationOptions);
    return;
  }

  flushDeferredNotifications();
  new Notification(title, notificationOptions);
}

function flushDeferredNotifications() {
  const deferred = getDeferredNotifications();
  if (deferred.length === 0) return;
  clearDeferredNotifications();
  deferred.forEach((item) => new Notification(item.title, item.options));
}

// Web Push helpers

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js");
}

export async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return null;
  const applicationServerKey = urlBase64ToUint8Array(vapidKey);
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as BufferSource,
  });
}

export async function unsubscribeFromPush(
  registration: ServiceWorkerRegistration
): Promise<boolean> {
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return true;
  return sub.unsubscribe();
}

export async function getExistingSubscription(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  return registration.pushManager.getSubscription();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Human-readable copy for the three native `NotificationPermission` states,
 * used by the permission prompt and preferences hub so status messaging
 * stays consistent wherever it's surfaced.
 */
export function getPermissionStatusCopy(status: NotificationPermission): {
  label: string;
  description: string;
} {
  switch (status) {
    case "granted":
      return {
        label: "Enabled",
        description: "This device can receive push notifications.",
      };
    case "denied":
      return {
        label: "Blocked",
        description:
          "Notifications are blocked in your browser's site settings for this device.",
      };
    default:
      return {
        label: "Not enabled",
        description: "Notifications haven't been requested on this device yet.",
      };
  }
}
