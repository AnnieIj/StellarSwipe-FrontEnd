"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SWIPE_THRESHOLD, VELOCITY_THRESHOLD } from "@/lib/signalGestures";

/**
 * Sensitivity scale values map to a multiplier applied to the default swipe
 * thresholds.  A lower multiplier means a shorter drag is required to commit.
 *
 * 1 = default (unchanged), < 1 = more sensitive, > 1 = less sensitive.
 */
export const SENSITIVITY_MULTIPLIERS = {
  low: 1.5, // requires 50 % more drag — less sensitive / harder to trigger
  default: 1, // unchanged from original hard-coded constants
  high: 0.6, // requires 40 % less drag — more sensitive / easier to trigger
} as const;

export type SensitivityLevel = keyof typeof SENSITIVITY_MULTIPLIERS;

export interface SwipeSettings {
  /**
   * Sensitivity level for swipe gestures.
   * Affects both the drag-distance threshold and the velocity threshold.
   * Defaults to "default" which preserves the original behaviour.
   */
  sensitivity: SensitivityLevel;

  /**
   * When true, the left/right action mapping is reversed:
   *   right → pass, left → trade
   * When false (default), right → trade, left → pass.
   */
  swapDirections: boolean;

  /** Has Zustand finished rehydrating from localStorage? */
  _hasHydrated: boolean;
}

interface SwipeSettingsActions {
  setSensitivity: (level: SensitivityLevel) => void;
  setSwapDirections: (swap: boolean) => void;
  resetToDefaults: () => void;
  setHasHydrated: (hydrated: boolean) => void;
}

const DEFAULT_STATE: Omit<SwipeSettings, "_hasHydrated"> = {
  sensitivity: "default",
  swapDirections: false,
};

export const useSwipeSettingsStore = create<
  SwipeSettings & SwipeSettingsActions
>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      _hasHydrated: false,
      setSensitivity: (level) => set({ sensitivity: level }),
      setSwapDirections: (swap) => set({ swapDirections: swap }),
      resetToDefaults: () => set(DEFAULT_STATE),
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
    }),
    {
      name: "stellar-swipe-settings",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/**
 * Returns the effective swipe threshold (px) for the current sensitivity level.
 * Multiply the base constant by the sensitivity multiplier.
 */
export function getEffectiveSwipeThreshold(
  sensitivity: SensitivityLevel
): number {
  return Math.round(SWIPE_THRESHOLD * SENSITIVITY_MULTIPLIERS[sensitivity]);
}

/**
 * Returns the effective velocity threshold (px/s) for the current sensitivity level.
 */
export function getEffectiveVelocityThreshold(
  sensitivity: SensitivityLevel
): number {
  return Math.round(VELOCITY_THRESHOLD * SENSITIVITY_MULTIPLIERS[sensitivity]);
}
