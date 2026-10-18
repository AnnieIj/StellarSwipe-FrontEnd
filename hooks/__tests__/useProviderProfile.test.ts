import type { SignalProvider, ProviderSignal } from "@/lib/types";

function computeAverageConfidence(signals: ProviderSignal[]): number {
  if (signals.length === 0) return 0;
  const sum = signals.reduce((acc, s) => acc + s.confidence, 0);
  return sum / signals.length;
}

function computeWinRate(signals: ProviderSignal[]): number {
  if (signals.length === 0) return 0;
  const wins = signals.filter((s) => s.outcome === "WIN").length;
  return (wins / signals.length) * 100;
}

function computePendingSignals(signals: ProviderSignal[]): ProviderSignal[] {
  return signals.filter((s) => s.outcome === "PENDING");
}

function getSignalStats(signals: ProviderSignal[]): {
  total: number;
  wins: number;
  losses: number;
  pending: number;
} {
  return {
    total: signals.length,
    wins: signals.filter((s) => s.outcome === "WIN").length,
    losses: signals.filter((s) => s.outcome === "LOSS").length,
    pending: signals.filter((s) => s.outcome === "PENDING").length,
  };
}

const MOCK_PROVIDER: SignalProvider = {
  id: "provider-1",
  address: "GA7VIQKEA7HQNGYAUTALPC3D4GBTUFJGD2U7YKWXY7HXHPAWGP7XVFUA",
  name: "AlphaTrader",
  overallScore: 94,
  winRate: 87,
  totalSignals: 256,
  recentPerformance: 12.5,
  rank: 1,
  bio: "Professional trader with 10+ years of experience.",
  reputation: 95,
  staked: 50000,
  trustScore: 92,
};

const MOCK_SIGNALS: ProviderSignal[] = [
  {
    id: "sig-1",
    asset: "XLM",
    direction: "BUY",
    confidence: 87,
    timestamp: "2024-01-15T10:00:00Z",
    outcome: "WIN",
    targetPrice: 0.531,
    actualPrice: 0.542,
  },
  {
    id: "sig-2",
    asset: "AQUA",
    direction: "SELL",
    confidence: 72,
    timestamp: "2024-01-15T09:00:00Z",
    outcome: "WIN",
    targetPrice: 0.35,
    actualPrice: 0.34,
  },
  {
    id: "sig-3",
    asset: "XLM",
    direction: "BUY",
    confidence: 65,
    timestamp: "2024-01-15T08:00:00Z",
    outcome: "LOSS",
    targetPrice: 0.52,
    actualPrice: 0.48,
  },
  {
    id: "sig-4",
    asset: "USDC",
    direction: "BUY",
    confidence: 81,
    timestamp: "2024-01-14T10:00:00Z",
    outcome: "PENDING",
    targetPrice: 1.02,
  },
];

describe("useProviderProfile – pure logic functions", () => {
  describe("computeAverageConfidence", () => {
    it("calculates average confidence correctly", () => {
      const result = computeAverageConfidence(MOCK_SIGNALS);
      const expected = (87 + 72 + 65 + 81) / 4;
      expect(result).toBeCloseTo(expected);
    });

    it("returns 0 for empty signals array", () => {
      const result = computeAverageConfidence([]);
      expect(result).toBe(0);
    });

    it("handles single signal", () => {
      const singleSignal = [{ ...MOCK_SIGNALS[0] }];
      const result = computeAverageConfidence(singleSignal);
      expect(result).toBe(87);
    });
  });

  describe("computeWinRate", () => {
    it("calculates win rate correctly", () => {
      const result = computeWinRate(MOCK_SIGNALS);
      const expectedWins = 2;
      const expectedRate = (expectedWins / 4) * 100;
      expect(result).toBeCloseTo(expectedRate);
    });

    it("returns 0 for empty signals array", () => {
      const result = computeWinRate([]);
      expect(result).toBe(0);
    });

    it("returns 100 for all wins", () => {
      const allWins = MOCK_SIGNALS.filter((s) => s.outcome === "WIN");
      const result = computeWinRate(allWins);
      expect(result).toBe(100);
    });

    it("returns 0 for all losses", () => {
      const allLosses = MOCK_SIGNALS.filter((s) => s.outcome === "LOSS");
      const result = computeWinRate(allLosses);
      expect(result).toBe(0);
    });
  });

  describe("computePendingSignals", () => {
    it("filters pending signals correctly", () => {
      const result = computePendingSignals(MOCK_SIGNALS);
      expect(result.length).toBe(1);
      expect(result[0].outcome).toBe("PENDING");
    });

    it("returns empty array when no pending signals", () => {
      const completedSignals = MOCK_SIGNALS.filter(
        (s) => s.outcome !== "PENDING"
      );
      const result = computePendingSignals(completedSignals);
      expect(result).toEqual([]);
    });
  });

  describe("getSignalStats", () => {
    it("returns correct signal statistics", () => {
      const result = getSignalStats(MOCK_SIGNALS);
      expect(result).toEqual({
        total: 4,
        wins: 2,
        losses: 1,
        pending: 1,
      });
    });

    it("handles empty signals", () => {
      const result = getSignalStats([]);
      expect(result).toEqual({
        total: 0,
        wins: 0,
        losses: 0,
        pending: 0,
      });
    });

    it("handles signals with only wins", () => {
      const winsOnly = MOCK_SIGNALS.filter((s) => s.outcome === "WIN");
      const result = getSignalStats(winsOnly);
      expect(result.wins).toBe(2);
      expect(result.losses).toBe(0);
      expect(result.pending).toBe(0);
    });
  });
});
