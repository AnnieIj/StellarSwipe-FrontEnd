import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FeedDensity = "comfortable" | "compact";

interface FeedDensityState {
  density: FeedDensity;
  setDensity: (d: FeedDensity) => void;
}

export const useFeedDensityStore = create<FeedDensityState>()(
  persist(
    (set) => ({
      density: "comfortable",
      setDensity: (density) => set({ density }),
    }),
    { name: "signal-feed-density" }
  )
);
