import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SignalProvider } from "@/lib/types";
import { queryOptions } from "@/lib/queryOptions";

export type LeaderboardTimeRange = "daily" | "weekly" | "monthly" | "all-time";

const TIME_RANGE_STORAGE_KEY = "stellarswipe:leaderboard-time-range";

const VALID_TIME_RANGES: LeaderboardTimeRange[] = [
  "daily",
  "weekly",
  "monthly",
  "all-time",
];

function getPersistedTimeRange(): LeaderboardTimeRange {
  if (typeof window === "undefined") return "all-time";
  const stored = localStorage.getItem(
    TIME_RANGE_STORAGE_KEY
  ) as LeaderboardTimeRange | null;
  return stored && VALID_TIME_RANGES.includes(stored) ? stored : "all-time";
}

const mockProviders: SignalProvider[] = [
  {
    id: "provider-1",
    address: "GA7VIQKEA7HQNGYAUTALPC3D4GBTUFJGD2U7YKWXY7HXHPAWGP7XVFUA",
    name: "AlphaTrader",
    overallScore: 94,
    winRate: 87,
    totalSignals: 256,
    recentPerformance: 12.5,
    rank: 1,
  },
  {
    id: "provider-2",
    address: "GAJQHJDHFVJDHBFJNHFDJHF7HXHPAWGP7XVFUA1234567890AB",
    name: "SignalMaster",
    overallScore: 89,
    winRate: 82,
    totalSignals: 198,
    recentPerformance: 8.3,
    rank: 2,
  },
  {
    id: "provider-3",
    address: "GBVDJKBVJKBVJBVJKBVJKBVJKBVJKBVJKBVJKBV",
    name: "TrendFollower",
    overallScore: 85,
    winRate: 78,
    totalSignals: 312,
    recentPerformance: 5.2,
    rank: 3,
  },
  {
    id: "provider-4",
    address: "GCVDJKBVJKBVJBVJKBVJKBVJKBVJKBVJKBVJKBV",
    name: "ProSignals",
    overallScore: 81,
    winRate: 75,
    totalSignals: 145,
    recentPerformance: -2.1,
    rank: 4,
  },
  {
    id: "provider-5",
    address: "GDVDJKBVJKBVJBVJKBVJKBVJKBVJKBVJKBVJKBV",
    overallScore: 78,
    winRate: 72,
    totalSignals: 189,
    recentPerformance: 3.8,
    rank: 5,
  },
];

export function useLeaderboard() {
  const [timeRange, setTimeRangeState] = useState<LeaderboardTimeRange>(
    getPersistedTimeRange
  );

  const setTimeRange = (range: LeaderboardTimeRange) => {
    setTimeRangeState(range);
    if (typeof window !== "undefined") {
      localStorage.setItem(TIME_RANGE_STORAGE_KEY, range);
    }
  };

  const query = useQuery({
    queryKey: ["leaderboard", timeRange],
    queryFn: async (): Promise<SignalProvider[]> => {
      // In real app, fetch from API with timeRange param
      return mockProviders;
    },
    ...queryOptions.leaderboard,
    // Keep the current rows (and pagination) in place while a new range loads.
    placeholderData: keepPreviousData,
  });

  return { ...query, timeRange, setTimeRange };
}
