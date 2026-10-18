import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Supported chart time intervals.
 *
 * Each chart surface declares which intervals it supports; the store holds the
 * globally-selected preference and each chart falls back to its own nearest
 * supported interval when the global one is incompatible.
 */
export type ChartInterval = "1H" | "4H" | "1D" | "1W" | "1M" | "3M" | "1Y";

export interface ChartIntervalMeta {
  label: string;
  description: string;
  /** Matching `usePriceHistory` interval bucket */
  historyInterval: "hour" | "day" | "week";
  /** Approximate number of data points to request */
  points: number;
}

export const CHART_INTERVALS: Record<ChartInterval, ChartIntervalMeta> = {
  "1H":  { label: "1H",  description: "1 hour",    historyInterval: "hour",  points: 60  },
  "4H":  { label: "4H",  description: "4 hours",   historyInterval: "hour",  points: 240 },
  "1D":  { label: "1D",  description: "1 day",     historyInterval: "day",   points: 24  },
  "1W":  { label: "1W",  description: "1 week",    historyInterval: "day",   points: 7   },
  "1M":  { label: "1M",  description: "1 month",   historyInterval: "day",   points: 30  },
  "3M":  { label: "3M",  description: "3 months",  historyInterval: "week",  points: 13  },
  "1Y":  { label: "1Y",  description: "1 year",    historyInterval: "week",  points: 52  },
};

export const DEFAULT_INTERVAL: ChartInterval = "1M";

interface ChartIntervalState {
  /** The user's globally-preferred interval. */
  interval: ChartInterval;
  setInterval: (interval: ChartInterval) => void;
}

/**
 * Persisted chart interval store.
 *
 * Using `persist` so the selection survives a page refresh.  Each chart can
 * additionally sync to a URL search param via `useChartIntervalFromUrl`.
 */
export const useChartIntervalStore = create<ChartIntervalState>()(
  persist(
    (set) => ({
      interval: DEFAULT_INTERVAL,
      setInterval: (interval) => set({ interval }),
    }),
    { name: "chart-interval-store" }
  )
);
