import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ChartStyle = "line" | "candlestick";

interface ChartStyleState {
  chartStyle: ChartStyle;
  setChartStyle: (style: ChartStyle) => void;
}

export const useChartStyleStore = create<ChartStyleState>()(
  persist(
    (set) => ({
      chartStyle: "line",
      setChartStyle: (chartStyle) => set({ chartStyle }),
    }),
    { name: "chart-style-store" }
  )
);
