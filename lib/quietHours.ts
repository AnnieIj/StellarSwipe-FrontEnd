/**
 * Notification quiet hours.
 *
 * A user-chosen daily window (start → end in a given IANA time zone) during
 * which non-critical notifications are deferred instead of shown. Critical
 * notifications (e.g. trade results) bypass the window entirely. Windows may
 * cross midnight (e.g. 22:00 → 07:00).
 */

export const QUIET_HOURS_KEY = "stellarswipe:quiet-hours";
export const DEFERRED_NOTIFICATIONS_KEY = "stellarswipe:deferred-notifications";

const MAX_DEFERRED = 20;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface QuietHoursSettings {
  enabled: boolean;
  /** 24-hour "HH:MM" */
  start: string;
  /** 24-hour "HH:MM" */
  end: string;
  /** IANA time zone, e.g. "Europe/London" */
  timeZone: string;
}

export interface DeferredNotification {
  title: string;
  options?: NotificationOptions;
  deferredAt: number;
}

export function getDefaultTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function getDefaultQuietHours(): QuietHoursSettings {
  return {
    enabled: false,
    start: "22:00",
    end: "07:00",
    timeZone: getDefaultTimeZone(),
  };
}

export function getQuietHoursSettings(): QuietHoursSettings {
  const defaults = getDefaultQuietHours();
  if (typeof window === "undefined") return defaults;
  const stored = localStorage.getItem(QUIET_HOURS_KEY);
  if (!stored) return defaults;
  try {
    return { ...defaults, ...JSON.parse(stored) };
  } catch {
    return defaults;
  }
}

export function saveQuietHoursSettings(settings: QuietHoursSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUIET_HOURS_KEY, JSON.stringify(settings));
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Returns a human-readable error for an invalid window, or null when the
 * settings are usable. Disabled settings are never invalid, so the user can
 * always switch quiet hours off.
 */
export function validateQuietHours(settings: QuietHoursSettings): string | null {
  if (!settings.enabled) return null;
  if (!TIME_PATTERN.test(settings.start) || !TIME_PATTERN.test(settings.end)) {
    return "Enter both times in 24-hour HH:MM format, for example 22:00.";
  }
  if (settings.start === settings.end) {
    return "Start and end can't be the same time. Choose different times to set a window.";
  }
  if (!isValidTimeZone(settings.timeZone)) {
    return "Choose a valid time zone.";
  }
  return null;
}

/** Current wall-clock minutes since midnight in the given time zone. */
function currentMinutesIn(timeZone: string, now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hours = Number(parts.find((p) => p.type === "hour")?.value);
  const minutes = Number(parts.find((p) => p.type === "minute")?.value);
  return hours * 60 + minutes;
}

export function isWithinQuietHours(
  settings: QuietHoursSettings,
  now: Date = new Date()
): boolean {
  if (!settings.enabled || validateQuietHours(settings)) return false;

  const current = currentMinutesIn(settings.timeZone, now);
  const start = toMinutes(settings.start);
  const end = toMinutes(settings.end);

  // Overnight windows (start after end) wrap past midnight.
  return start < end
    ? current >= start && current < end
    : current >= start || current < end;
}

export function getDeferredNotifications(): DeferredNotification[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(DEFERRED_NOTIFICATIONS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function deferNotification(
  title: string,
  options?: NotificationOptions
) {
  if (typeof window === "undefined") return;
  const queue = [
    ...getDeferredNotifications(),
    { title, options, deferredAt: Date.now() },
  ].slice(-MAX_DEFERRED);
  localStorage.setItem(DEFERRED_NOTIFICATIONS_KEY, JSON.stringify(queue));
}

export function clearDeferredNotifications() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEFERRED_NOTIFICATIONS_KEY);
}
