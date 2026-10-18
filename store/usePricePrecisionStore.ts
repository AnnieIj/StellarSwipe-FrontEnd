import { create } from "zustand";

/**
 * "compact"  — 4 decimal places, e.g. $0.4821
 * "precise"  — 8 decimal places, e.g. $0.48210000
 */
export type PriceDisplayMode = "compact" | "precise";

interface PricePrecisionState {
  mode: PriceDisplayMode;
  toggle: () => void;
  setMode: (mode: PriceDisplayMode) => void;
}

/**
 * Session-scoped store (no persistence middleware) so the toggle resets on
 * page reload, matching the requirement: "persist the toggle state for the
 * session."  Zustand's in-memory store is naturally session-scoped.
 */
export const usePricePrecisionStore = create<PricePrecisionState>()((set) => ({
  mode: "compact",
  toggle: () =>
    set((state) => ({
      mode: state.mode === "compact" ? "precise" : "compact",
    })),
  setMode: (mode) => set({ mode }),
}));
