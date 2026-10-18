import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_TRADE_PRESETS,
  sanitizeTradePresets,
  validateTradePresets,
} from "@/lib/tradePresets";

interface TradePresetsState {
  presets: number[];
  /** Saves the list if valid. Returns the validation error, or `null` on success. */
  setPresets: (presets: number[]) => string | null;
  restoreDefaults: () => void;
}

export const useTradePresetsStore = create<TradePresetsState>()(
  persist(
    (set) => ({
      presets: [...DEFAULT_TRADE_PRESETS],
      setPresets: (presets) => {
        const error = validateTradePresets(presets);
        if (error) return error;
        set({ presets: [...presets] });
        return null;
      },
      restoreDefaults: () => set({ presets: [...DEFAULT_TRADE_PRESETS] }),
    }),
    {
      name: "trade-presets-store",
      // Sanitise on hydrate so invalid legacy values never reach the form.
      merge: (persisted, current) => ({
        ...current,
        presets: sanitizeTradePresets((persisted as { presets?: unknown })?.presets),
      }),
    }
  )
);
