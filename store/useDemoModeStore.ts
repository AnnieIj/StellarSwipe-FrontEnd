import { create } from "zustand";
import { persist } from "zustand/middleware";

export const DEMO_SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes
export const DEMO_WARNING_THRESHOLD_MS = 5 * 60 * 1000; // warn at 5 minutes left

export interface SimulatedTrade {
  id: string;
  pair: string;
  amount: number;
  pnl: number;
  timestamp: number;
}

const DEFAULT_DEMO_TRADES: SimulatedTrade[] = [
  { id: "demo-1", pair: "XLM/USDC", amount: 100, pnl: 4.2, timestamp: 0 },
  { id: "demo-2", pair: "BTC/XLM", amount: 50, pnl: -1.8, timestamp: 0 },
];

export interface DemoState {
  isDemoMode: boolean;
  _hasHydrated: boolean;
  sessionStartedAt: number | null;
  demoTrades: SimulatedTrade[];
  setHasHydrated: (hydrated: boolean) => void;
  toggleDemoMode: () => void;
  setDemoMode: (enabled: boolean) => void;
  resetDemoData: () => void;
}

export const useDemoModeStore = create<DemoState>()(
  persist(
    (set) => ({
      isDemoMode: false,
      _hasHydrated: false,
      sessionStartedAt: null,
      demoTrades: [...DEFAULT_DEMO_TRADES],
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
      toggleDemoMode: () =>
        set((state) => {
          const enabling = !state.isDemoMode;
          return {
            isDemoMode: enabling,
            sessionStartedAt: enabling ? Date.now() : null,
          };
        }),
      setDemoMode: (enabled) =>
        set((state) => ({
          isDemoMode: enabled,
          sessionStartedAt:
            enabled && !state.isDemoMode
              ? Date.now()
              : enabled
              ? state.sessionStartedAt
              : null,
        })),
      resetDemoData: () =>
        set({
          demoTrades: [...DEFAULT_DEMO_TRADES],
          sessionStartedAt: Date.now(),
        }),
    }),
    {
      name: "demo-mode-store",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/** Returns `true` once localStorage has been read and state is stable. */
export const useDemoModeHydrated = () =>
  useDemoModeStore((s) => s._hasHydrated);
