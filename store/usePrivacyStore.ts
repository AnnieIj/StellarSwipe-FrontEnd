import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * usePrivacyStore
 * ───────────────
 * Controls whether sensitive portfolio values (balances, P&L, position values)
 * are masked across all portfolio routes (#795).
 *
 * The preference persists across reloads via localStorage.
 *
 * Usage:
 *   const { privacyMode, togglePrivacy } = usePrivacyStore();
 *   const displayValue = privacyMode ? PRIVACY_MASK : formatCurrency(value);
 */

/** Consistent placeholder shown instead of masked numeric values. */
export const PRIVACY_MASK = "••••••";

interface PrivacyState {
  /** When true, monetary totals and P&L should be hidden. */
  privacyMode: boolean;
  /** Toggle the masked state. */
  togglePrivacy: () => void;
  /** Explicitly set the masked state. */
  setPrivacyMode: (enabled: boolean) => void;
}

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set, get) => ({
      privacyMode: false,
      togglePrivacy: () => set({ privacyMode: !get().privacyMode }),
      setPrivacyMode: (enabled) => set({ privacyMode: enabled }),
    }),
    { name: "privacy-mode" }
  )
);
