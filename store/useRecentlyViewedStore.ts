import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RecentlyViewedState {
  recentlyViewedIds: string[];
  addView: (id: string) => void;
  clearHistory: () => void;
}

const MAX_RECENT_COUNT = 10;

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      recentlyViewedIds: [],
      addView: (id: string) =>
        set((state) => {
          // Remove existing instance if any
          const filtered = state.recentlyViewedIds.filter(
            (existingId) => existingId !== id
          );
          // Add to front and cap at limit
          return {
            recentlyViewedIds: [id, ...filtered].slice(0, MAX_RECENT_COUNT),
          };
        }),
      clearHistory: () => set({ recentlyViewedIds: [] }),
    }),
    {
      name: "recently-viewed-signals",
    }
  )
);
