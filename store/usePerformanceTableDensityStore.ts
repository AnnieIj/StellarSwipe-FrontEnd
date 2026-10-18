import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useWalletStore } from "@/store/useWalletStore";
import {
  DEFAULT_TABLE_DENSITY,
  isTableDensity,
  type TableDensity,
} from "@/lib/tableDensity";

/** Key used for visitors without a connected wallet. */
export const ANONYMOUS_DENSITY_KEY = "anonymous";

interface PerformanceTableDensityState {
  /** Density preference per user, keyed by wallet public key. */
  densityByUser: Record<string, TableDensity>;
  setDensity: (userKey: string, density: TableDensity) => void;
}

export const usePerformanceTableDensityStore = create<PerformanceTableDensityState>()(
  persist(
    (set) => ({
      densityByUser: {},
      setDensity: (userKey, density) =>
        set((state) => ({
          densityByUser: { ...state.densityByUser, [userKey]: density },
        })),
    }),
    { name: "performance-table-density" }
  )
);

/**
 * The current user's performance table density and a setter for it.
 * The preference is stored per connected wallet so each user keeps their own.
 */
export function usePerformanceTableDensity(): [TableDensity, (density: TableDensity) => void] {
  const userKey = useWalletStore((s) => s.activePublicKey ?? s.publicKey) ?? ANONYMOUS_DENSITY_KEY;
  const stored = usePerformanceTableDensityStore((s) => s.densityByUser[userKey]);
  const setDensity = usePerformanceTableDensityStore((s) => s.setDensity);

  const density = isTableDensity(stored) ? stored : DEFAULT_TABLE_DENSITY;
  return [density, (next) => setDensity(userKey, next)];
}
