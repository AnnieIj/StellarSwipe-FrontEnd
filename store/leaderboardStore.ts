// store/leaderboardStore.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type LeaderboardEntry = {
  id: string;
  username: string;
  avatarUrl: string;
  marketType: string; // "crypto" | "forex" | "commodities"
  returnPct: number;
  winRate?: number;
  portfolioGrowth?: number;
  anonymous: boolean;
  badges?: string[];
  followed?: boolean;
};

type LeaderboardState = {
  rankings: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  period: "daily" | "weekly" | "monthly" | "yearly";
  filterMarket: string | null;
  currentUserId: string | null;
  fetchRankings: () => Promise<void>;
  setPeriod: (p: LeaderboardState["period"]) => void;
  setFilterMarket: (m: string | null) => void;
  toggleFollow: (id: string) => void;
  setCurrentUserId: (id: string | null) => void;
};

export const useLeaderboardStore = create<LeaderboardState>()(
  devtools((set, get) => ({
    rankings: [],
    loading: false,
    error: null,
    period: "weekly",
    filterMarket: null,
    currentUserId: null,
    async fetchRankings() {
      set({ loading: true, error: null });
      try {
        const params = new URLSearchParams({
          period: get().period,
          market: get().filterMarket ?? "",
        });
        const resp = await fetch(`/api/leaderboard?${params.toString()}`);
        if (!resp.ok) throw new Error("Network response was not ok");
        const data: LeaderboardEntry[] = await resp.json();
        // Simple safeguard: ensure returns are numbers and sorted descending
        const sorted = data
          .filter((e) => typeof e.returnPct === "number")
          .sort((a, b) => b.returnPct - a.returnPct);
        set({ rankings: sorted, loading: false });
      } catch (e: any) {
        set({ error: e.message, loading: false });
      }
    },
    setPeriod(p) {
      set({ period: p }, false, "setPeriod");
      get().fetchRankings();
    },
    setFilterMarket(m) {
      set({ filterMarket: m }, false, "setFilterMarket");
      get().fetchRankings();
    },
    toggleFollow(id) {
      set((state) => ({
        rankings: state.rankings.map((e) =>
          e.id === id ? { ...e, followed: !e.followed } : e
        ),
      }));
    },
    setCurrentUserId(id) {
      set({ currentUserId: id }, false, "setCurrentUserId");
    },
  }))
);
