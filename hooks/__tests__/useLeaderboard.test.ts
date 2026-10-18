import type { SignalProvider } from "@/lib/types";

function computeTopRanked(providers: SignalProvider[]): SignalProvider[] {
  return [...providers].sort((a, b) => a.rank - b.rank).slice(0, 10);
}

function computeWinRateAverage(providers: SignalProvider[]): number {
  if (providers.length === 0) return 0;
  const sum = providers.reduce((acc, p) => acc + p.winRate, 0);
  return sum / providers.length;
}

function computeTotalSignals(providers: SignalProvider[]): number {
  return providers.reduce((acc, p) => acc + p.totalSignals, 0);
}

function findProviderById(
  providers: SignalProvider[],
  id: string
): SignalProvider | undefined {
  return providers.find((p) => p.id === id);
}

const MOCK_LEADERBOARD: SignalProvider[] = [
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
    address: "GDVDJKBVJKBVJBVJKBVJKBVJKBVJKBVJKBV",
    overallScore: 78,
    winRate: 72,
    totalSignals: 189,
    recentPerformance: 3.8,
    rank: 5,
  },
];

describe("useLeaderboard – pure logic functions", () => {
  describe("computeTopRanked", () => {
    it("returns top 10 ranked providers sorted by rank", () => {
      const result = computeTopRanked(MOCK_LEADERBOARD);
      expect(result.length).toBeLessThanOrEqual(10);
      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
    });

    it("returns all providers when fewer than 10", () => {
      const result = computeTopRanked(MOCK_LEADERBOARD);
      expect(result.length).toBe(5);
    });
  });

  describe("computeWinRateAverage", () => {
    it("calculates average win rate correctly", () => {
      const result = computeWinRateAverage(MOCK_LEADERBOARD);
      const expected = (87 + 82 + 78 + 75 + 72) / 5;
      expect(result).toBeCloseTo(expected);
    });

    it("returns 0 for empty providers array", () => {
      const result = computeWinRateAverage([]);
      expect(result).toBe(0);
    });
  });

  describe("computeTotalSignals", () => {
    it("sums total signals across all providers", () => {
      const result = computeTotalSignals(MOCK_LEADERBOARD);
      expect(result).toBe(256 + 198 + 312 + 145 + 189);
    });

    it("returns 0 for empty providers array", () => {
      const result = computeTotalSignals([]);
      expect(result).toBe(0);
    });
  });

  describe("findProviderById", () => {
    it("finds provider by id", () => {
      const result = findProviderById(MOCK_LEADERBOARD, "provider-1");
      expect(result).toBeDefined();
      expect(result?.name).toBe("AlphaTrader");
    });

    it("returns undefined for non-existent id", () => {
      const result = findProviderById(MOCK_LEADERBOARD, "nonexistent");
      expect(result).toBeUndefined();
    });
  });
});
