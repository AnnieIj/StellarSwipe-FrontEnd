/**
 * useTargetAllocationStore — #798
 *
 * Manages per-symbol target allocation percentages. Targets must total 100 %
 * before they are considered valid. Persisted to localStorage so the user's
 * planned mix survives page reloads.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TargetAllocationEntry {
  symbol: string;
  /** Target weight expressed as a percentage, e.g. 40 for 40 %. */
  targetPct: number;
}

export interface TargetAllocationState {
  /** Map of symbol → target percentage. */
  targets: Record<string, number>;
  /** Whether the target band overlay is shown on the chart. */
  overlayVisible: boolean;

  /** Set (or update) a single target. */
  setTarget: (symbol: string, pct: number) => void;
  /** Remove a symbol from targets. */
  removeTarget: (symbol: string) => void;
  /** Replace all targets at once. */
  setTargets: (entries: TargetAllocationEntry[]) => void;
  /** Clear all targets. */
  clearTargets: () => void;
  /** Toggle the overlay visibility. */
  toggleOverlay: () => void;
  /** Set overlay visibility directly. */
  setOverlayVisible: (visible: boolean) => void;

  /**
   * Returns true when the sum of all target percentages equals 100 (±0.01 to
   * account for floating-point rounding).
   */
  isValid: () => boolean;
  /**
   * Returns the current deviation from 100 %, rounded to two decimal places.
   * A positive value means the targets are over-allocated; negative means
   * under-allocated.
   */
  totalPct: () => number;
}

export const useTargetAllocationStore = create<TargetAllocationState>()(
  persist(
    (set, get) => ({
      targets: {},
      overlayVisible: false,

      setTarget: (symbol, pct) =>
        set((state) => ({
          targets: { ...state.targets, [symbol]: pct },
        })),

      removeTarget: (symbol) =>
        set((state) => {
          const next = { ...state.targets };
          delete next[symbol];
          return { targets: next };
        }),

      setTargets: (entries) =>
        set({
          targets: Object.fromEntries(entries.map((e) => [e.symbol, e.targetPct])),
        }),

      clearTargets: () => set({ targets: {} }),

      toggleOverlay: () =>
        set((state) => ({ overlayVisible: !state.overlayVisible })),

      setOverlayVisible: (visible) => set({ overlayVisible: visible }),

      isValid: () => {
        const sum = Object.values(get().targets).reduce((a, b) => a + b, 0);
        return Math.abs(sum - 100) < 0.01;
      },

      totalPct: () => {
        const sum = Object.values(get().targets).reduce((a, b) => a + b, 0);
        return Math.round(sum * 100) / 100;
      },
    }),
    { name: "target-allocation-store" }
  )
);
