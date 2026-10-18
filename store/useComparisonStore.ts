import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Signal } from "@/lib/api-types.generated";

export const MAX_SIGNALS = 3;
/** Alias used by the ComparisonTray component and its tests. */
export const MAX_COMPARISON = MAX_SIGNALS;

export interface SnapshotNameResult {
  ok: boolean;
  error?: string;
}

interface ComparisonState {
  signals: Signal[];
  hiddenMetrics: string[];
  snapshotName: string;
  // Names already claimed by a previous snapshot, used for duplicate checks.
  snapshotNameHistory: string[];
  limitReached: boolean;
  addSignal: (signal: Signal) => boolean;
  removeSignal: (id: string) => void;
  clearSignals: () => void;
  /** Alias for clearSignals — used by ComparisonTray. */
  clearAll: () => void;
  toggleMetric: (key: string) => void;
  isSelected: (id: string) => boolean;
  canAdd: () => boolean;
  setSnapshotName: (name: string) => SnapshotNameResult;
  dismissLimitMessage: () => void;
}

export const useComparisonStore = create<ComparisonState>()(
  persist(
    (set, get) => ({
      signals: [],
      hiddenMetrics: [],
      snapshotName: "",
      snapshotNameHistory: [],
      limitReached: false,

      addSignal: (signal) => {
        const { signals } = get();
        if (signals.length >= MAX_SIGNALS) {
          set({ limitReached: true });
          return false;
        }
        if (signals.find((s) => s.id === signal.id)) return false;
        set({ signals: [...signals, signal], limitReached: false });
        return true;
      },

      removeSignal: (id) =>
        set((state) => ({
          signals: state.signals.filter((s) => s.id !== id),
          // Clear the limit banner whenever a slot opens up
          limitReached: false,
        })),

      clearSignals: () => set({ signals: [], snapshotName: "" }),

      setSnapshotName: (name) => {
        const trimmed = name.trim();
        const { snapshotName, snapshotNameHistory } = get();

        if (!trimmed) {
          return { ok: false, error: "Snapshot name cannot be empty." };
        }

        const isDuplicate =
          trimmed.toLowerCase() !== snapshotName.toLowerCase() &&
          snapshotNameHistory.some((n) => n.toLowerCase() === trimmed.toLowerCase());
        if (isDuplicate) {
          return { ok: false, error: "That name is already in use. Choose a different one." };
        }

        set({
          snapshotName: trimmed,
          snapshotNameHistory: snapshotNameHistory.some((n) => n.toLowerCase() === trimmed.toLowerCase())
            ? snapshotNameHistory
            : [...snapshotNameHistory, trimmed],
        });
        return { ok: true };
      },
      clearSignals: () => set({ signals: [], limitReached: false }),
      clearAll: () => set({ signals: [], limitReached: false }),

      toggleMetric: (key) =>
        set((state) => ({
          hiddenMetrics: state.hiddenMetrics.includes(key)
            ? state.hiddenMetrics.filter((k) => k !== key)
            : [...state.hiddenMetrics, key],
        })),

      isSelected: (id) => get().signals.some((s) => s.id === id),
      canAdd: () => get().signals.length < MAX_SIGNALS,
      dismissLimitMessage: () => set({ limitReached: false }),
    }),
    { name: "signal-comparison" }
  )
);
