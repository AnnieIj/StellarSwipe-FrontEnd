/**
 * Analytics service for tracking user flows
 * Fire-and-forget, non-blocking event tracking
 *
 * In development builds, all tracked events are also forwarded to any registered
 * dev listeners so they can be surfaced in the AnalyticsDebugConsole overlay
 * (see @/components/AnalyticsDebugConsole).
 *
 * Respects the user's analytics consent preference (stored in localStorage via
 * useAnalyticsConsentStore). When consent is revoked, track() is a no-op.
 */
import { isAnalyticsEnabled } from "@/store/useAnalyticsConsentStore";

export interface AnalyticsProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export interface AnalyticsService {
  track(event: string, properties?: AnalyticsProperties): void;
}

/* ── Dev-mode event bus ──────────────────────── */

export interface AnalyticsEventEntry {
  id: string;
  name: string;
  properties: AnalyticsProperties | undefined;
  timestamp: number;
}

type DevListener = (entry: AnalyticsEventEntry) => void;

let devListeners: DevListener[] = [];
let eventCounter = 0;

/**
 * Subscribe to all analytics events in dev mode.
 * Returns an unsubscribe function.
 */
export function subscribeToAnalyticsEvents(listener: DevListener): () => void {
  devListeners.push(listener);
  return () => {
    devListeners = devListeners.filter((l) => l !== listener);
  };
}

function notifyDevListeners(entry: AnalyticsEventEntry): void {
  // Synchronously notify all dev listeners (only registered in dev builds)
  for (const listener of devListeners) {
    try {
      listener(entry);
    } catch {
      // Silently ignore listener errors
    }
  }
}

/* ── End dev-mode event bus ──────────────────── */

/**
 * Schedule a callback to run without blocking the current execution
 * Uses requestIdleCallback if available, falls back to setTimeout
 */
function scheduleNonBlocking(callback: () => void): void {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as any).requestIdleCallback(callback, { timeout: 1000 });
  } else {
    setTimeout(callback, 0);
  }
}

/**
 * Stub analytics service that logs to console.debug
 * Can be swapped for Segment, Mixpanel, or other providers
 */
const analyticsService: AnalyticsService = {
  track(event: string, properties?: AnalyticsProperties) {
    if (!isAnalyticsEnabled()) return;

    const entry: AnalyticsEventEntry = {
      id: `evt_${++eventCounter}_${Date.now()}`,
      name: event,
      properties,
      timestamp: Date.now(),
    };

    scheduleNonBlocking(() => {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.debug("Analytics Event:", event, properties);
      }
      // Integration point: Replace with actual analytics provider
      // Example: segment.track(event, properties);
      // Or: mixpanel.track(event, properties);
    });

    // Forward to dev listeners (noop when none registered)
    notifyDevListeners(entry);
  },
};

export default analyticsService;
