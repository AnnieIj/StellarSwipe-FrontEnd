/**
 * sessionUtils.ts
 *
 * Types and pure utility functions for active sessions / device management.
 *
 * All network calls are kept in a separate module (sessionApi.ts) so this
 * file stays fully unit-testable without any fetch/mock setup. `t()` from
 * lib/i18n is safe to call here for the same reason: its English strings are
 * bundled statically, not fetched, so it resolves synchronously with no
 * network or DOM dependency.
 */
import { t } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Session {
  /** Opaque server-issued session identifier */
  id: string;
  /** Human-readable device / browser label, e.g. "Chrome on macOS" */
  deviceLabel: string;
  /** Approximate geographic label, e.g. "London, UK" */
  location: string;
  /** ISO-8601 timestamp of last recorded activity */
  lastActiveAt: string;
  /** True for the session that is executing this page */
  isCurrent: boolean;
  /** Device / OS reported by the service, e.g. "macOS" (optional) */
  device?: string;
  /** Browser reported by the service, e.g. "Chrome 128" (optional) */
  browser?: string;
}

/** Recent sign-in / session event shown beside active sessions (#833). */
export interface AccountActivity {
  id: string;
  /** Human-readable description, e.g. "Signed in" */
  description: string;
  /** ISO-8601 timestamp of the event */
  occurredAt: string;
  /** Only present when the service reports it — never inferred */
  device?: string;
  location?: string;
}

/** Formats an ISO timestamp in the user's locale, or null if invalid. */
export function formatTimestamp(iso: string): string | null {
  const date = new Date(iso);
  return isNaN(date.getTime())
    ? null
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export type SessionsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; sessions: Session[] }
  | { status: "error"; message: string };

// ---------------------------------------------------------------------------
// Optimistic-update helpers
// ---------------------------------------------------------------------------

/**
 * Returns a new session list with the given session removed.
 * Used to apply an optimistic revocation before the API call resolves.
 */
export function optimisticRevoke(sessions: Session[], id: string): Session[] {
  return sessions.filter((s) => s.id !== id);
}

/**
 * Returns a new session list with all non-current sessions removed.
 * Used to apply an optimistic bulk revoke.
 */
export function optimisticRevokeAll(sessions: Session[]): Session[] {
  return sessions.filter((s) => s.isCurrent);
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/**
 * Formats a lastActiveAt ISO string into a readable relative label.
 *
 * Returns strings like "Just now", "5 minutes ago", "3 hours ago",
 * "2 days ago", or a locale date string for older sessions.
 */
export function formatLastActive(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "Unknown";

  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1_000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 60) return t("sessions.just_now");
  if (diffMin < 60) return t("sessions.minutes_ago", { count: diffMin });
  if (diffHrs < 24) return t("sessions.hours_ago", { count: diffHrs });
  if (diffDays < 30) return t("sessions.days_ago", { count: diffDays });

  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Returns true if the session can be revoked (i.e. it is not the current one).
 */
export function canRevoke(session: Session): boolean {
  return !session.isCurrent;
}

/**
 * Returns the count of non-current sessions — the number that would be
 * affected by "Revoke all other sessions".
 */
export function otherSessionCount(sessions: Session[]): number {
  return sessions.filter((s) => !s.isCurrent).length;
}
