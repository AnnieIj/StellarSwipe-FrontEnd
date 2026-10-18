import { create } from "zustand";
import type { ExpiredSignalMap, ExpiryEvent } from "@/lib/signalExpiry";

export interface ExpiryWorkerStats {
  /** Epoch ms of the last successful pass start. */
  lastRunAt: number | null;
  lastDurationMs: number | null;
  lastBatches: number;
  /** Failed attempts since the last successful pass. */
  consecutiveFailures: number;
  totalFailures: number;
  /** Epoch ms when the next pass is scheduled. */
  nextRunAt: number | null;
}

interface SignalExpiryState {
  expired: ExpiredSignalMap;
  stats: ExpiryWorkerStats;
  /**
   * Records transitions not seen before. Events for an already-recorded
   * expiry instant are ignored, so repeated runs never duplicate transitions.
   */
  recordExpired: (events: ExpiryEvent[]) => void;
  setStats: (patch: Partial<ExpiryWorkerStats>) => void;
}

export const useSignalExpiryStore = create<SignalExpiryState>()((set) => ({
  expired: {},
  stats: {
    lastRunAt: null,
    lastDurationMs: null,
    lastBatches: 0,
    consecutiveFailures: 0,
    totalFailures: 0,
    nextRunAt: null,
  },

  recordExpired: (events) =>
    set((state) => {
      const next = { ...state.expired };
      let changed = false;
      for (const { signalId, expiresAt } of events) {
        if (next[signalId] === expiresAt) continue;
        next[signalId] = expiresAt;
        changed = true;
      }
      return changed ? { expired: next } : state;
    }),

  setStats: (patch) =>
    set((state) => ({ stats: { ...state.stats, ...patch } })),
}));
