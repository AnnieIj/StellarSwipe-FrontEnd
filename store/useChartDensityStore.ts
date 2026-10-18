import { create } from "zustand";

/**
 * Controls how many x-axis ticks dense time-series charts (e.g. MiniChart)
 * render at once:
 *  - "compact"  — fewest labels, best for small screens / many data points
 *  - "standard" — balanced default
 *  - "expanded" — most labels, for larger viewports with fewer points
 *
 * Session-scoped store (no persistence middleware), matching
 * usePricePrecisionStore's pattern.
 */
export type ChartAxisDensity = "compact" | "standard" | "expanded";

interface ChartDensityState {
  density: ChartAxisDensity;
  setDensity: (density: ChartAxisDensity) => void;
}

export const useChartDensityStore = create<ChartDensityState>()((set) => ({
  density: "standard",
  setDensity: (density) => set({ density }),
}));
