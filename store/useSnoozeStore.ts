import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Default snooze duration: temporarily hide a signal for one hour. */
export const DEFAULT_SNOOZE_DURATION_MS = 60 * 60 * 1000;

interface SnoozeState {
  /** Map of signal id → expiry timestamp (epoch ms). */
  snoozed: Record<string, number>;
  /** Snooze a signal until `now + durationMs`. */
  snoozeSignal: (id: string, durationMs?: number, now?: number) => void;
  /** Manually return a snoozed signal to the feed. */
  unsnoozeSignal: (id: string) => void;
  /** True while the signal is snoozed and its expiry is still in the future. */
  isSnoozed: (id: string, now?: number) => boolean;
  /** Ids whose snooze has not yet elapsed. */
  getActiveSnoozes: (now?: number) => string[];
  /** Drop any snoozes whose expiry has passed (returns to the feed). */
  pruneExpired: (now?: number) => void;
  /** Remove every snooze. */
  clearSnoozes: () => void;
}

export const useSnoozeStore = create<SnoozeState>()(
  persist(
    (set, get) => ({
      snoozed: {},

      snoozeSignal: (
        id,
        durationMs = DEFAULT_SNOOZE_DURATION_MS,
        now = Date.now()
      ) =>
        set((state) => ({
          snoozed: { ...state.snoozed, [id]: now + Math.max(0, durationMs) },
        })),

      unsnoozeSignal: (id) =>
        set((state) => {
          if (!(id in state.snoozed)) return state;
          const next = { ...state.snoozed };
          delete next[id];
          return { snoozed: next };
        }),

      isSnoozed: (id, now = Date.now()) => {
        const expiresAt = get().snoozed[id];
        return expiresAt !== undefined && expiresAt > now;
      },

      getActiveSnoozes: (now = Date.now()) =>
        Object.entries(get().snoozed)
          .filter(([, expiresAt]) => expiresAt > now)
          .map(([id]) => id),

      pruneExpired: (now = Date.now()) =>
        set((state) => {
          const next: Record<string, number> = {};
          let changed = false;
          for (const [id, expiresAt] of Object.entries(state.snoozed)) {
            if (expiresAt > now) next[id] = expiresAt;
            else changed = true;
          }
          return changed ? { snoozed: next } : state;
        }),

      clearSnoozes: () => set({ snoozed: {} }),
    }),
    { name: "signal-snoozes" }
  )
);

/**
 * Returns the subset of `signals` that are not currently snoozed.
 *
 * Pure so the feed-filtering / re-insertion behaviour can be unit tested
 * without rendering the feed: once a signal's snooze expiry (`<= now`) passes,
 * it is no longer filtered out and is automatically re-inserted into the feed.
 */
export function selectVisibleSignals<T extends { id: string }>(
  signals: T[],
  snoozed: Record<string, number>,
  now: number = Date.now()
): T[] {
  return signals.filter((signal) => {
    const expiresAt = snoozed[signal.id];
    return expiresAt === undefined || expiresAt <= now;
  });
}
