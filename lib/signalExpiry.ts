import type { Signal } from "@/lib/signals";

/** Signals examined per batch, so a large feed never blocks one pass. */
export const EXPIRY_BATCH_SIZE = 25;
/** Attempts per pass before the worker gives up until its next scheduled run. */
export const EXPIRY_MAX_ATTEMPTS = 3;
export const EXPIRY_RETRY_BASE_MS = 1000;
/** Longest sleep between passes, so newly-due signals are caught promptly. */
export const EXPIRY_IDLE_INTERVAL_MS = 30_000;

/**
 * Map of signal id → the `expiresAt` that was transitioned out of the feed.
 * Keyed on the expiry instant (not just the id) so a refetched signal with a
 * new expiry is treated as a fresh, active signal.
 */
export type ExpiredSignalMap = Record<string, string>;

export interface ExpiryEvent {
  signalId: string;
  expiresAt: string;
}

export interface ExpiryPassResult {
  events: ExpiryEvent[];
  batches: number;
  /** Earliest future expiry (epoch ms) among active signals, or null if none. */
  nextExpiryAt: number | null;
}

/** True when this exact expiry instant has already been transitioned. */
export function isRecordedExpired(
  signal: Pick<Signal, "id" | "expiresAt">,
  expired: ExpiredSignalMap
): boolean {
  return !!signal.expiresAt && expired[signal.id] === signal.expiresAt;
}

/** Signals that have not been moved out of the active feed. */
export function selectActiveSignals<T extends Pick<Signal, "id" | "expiresAt">>(
  signals: T[],
  expired: ExpiredSignalMap
): T[] {
  return signals.filter((signal) => !isRecordedExpired(signal, expired));
}

/**
 * Scans `signals` in bounded batches and returns events for signals that are
 * due but not yet recorded. Pure and non-mutating: re-running over the same
 * input after the events are committed yields no new events.
 */
export function runExpiryPass(
  signals: Signal[],
  expired: ExpiredSignalMap,
  now: number = Date.now(),
  batchSize: number = EXPIRY_BATCH_SIZE
): ExpiryPassResult {
  const events: ExpiryEvent[] = [];
  let batches = 0;
  let nextExpiryAt: number | null = null;

  for (let start = 0; start < signals.length; start += batchSize) {
    batches += 1;
    for (const signal of signals.slice(start, start + batchSize)) {
      if (!signal.expiresAt || isRecordedExpired(signal, expired)) continue;

      const expiresAt = new Date(signal.expiresAt).getTime();
      if (Number.isNaN(expiresAt)) continue;

      if (expiresAt <= now) {
        events.push({ signalId: signal.id, expiresAt: signal.expiresAt });
      } else if (nextExpiryAt === null || expiresAt < nextExpiryAt) {
        nextExpiryAt = expiresAt;
      }
    }
  }

  return { events, batches, nextExpiryAt };
}

/** Wake at the next expiry, but never sleep longer than the idle interval. */
export function nextPassDelayMs(
  nextExpiryAt: number | null,
  now: number = Date.now()
): number {
  if (nextExpiryAt === null) return EXPIRY_IDLE_INTERVAL_MS;
  return Math.min(Math.max(nextExpiryAt - now, 0), EXPIRY_IDLE_INTERVAL_MS);
}

/** Exponential backoff for the nth failed attempt (1-based). */
export function retryDelayMs(failedAttempts: number): number {
  return EXPIRY_RETRY_BASE_MS * 2 ** (failedAttempts - 1);
}
