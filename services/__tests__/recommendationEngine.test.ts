import { computeRecommendations } from "../recommendationEngine";
import { useRecommendationStore } from "@/store/useRecommendationStore";
import type { Signal } from "@/lib/api-types.generated";

// SEASONAL_BOOST mirrors the IIFE in recommendationEngine.ts so test
// assertions stay correct regardless of when tests run.
const _month = new Date().getMonth();
const SEASONAL_BOOST = _month >= 9 || _month <= 2 ? 5 : 0;

function sig(overrides: Partial<Signal> = {}): Signal {
  return {
    id: "sig-default",
    ticker: "XLM",
    action: "BUY",
    confidence: 80,
    timestamp: new Date().toISOString(),
    details: "Test signal",
    ...overrides,
  };
}

function setupStore(
  partial: Partial<{
    enabled: boolean;
    riskProfile: "conservative" | "moderate" | "aggressive";
    privacyAccepted: boolean;
    feedback: {
      signalId: string;
      liked: boolean;
      timestamp: string;
      source: "explicit" | "implicit";
    }[];
  }> = {}
) {
  useRecommendationStore.setState({
    settings: {
      enabled: partial.enabled ?? true,
      riskProfile: partial.riskProfile ?? "moderate",
      privacyAccepted: partial.privacyAccepted ?? true,
    },
    feedback: partial.feedback ?? [],
    recommendations: [],
    accuracyMetrics: { total: 0, correct: 0 },
  });
}

describe("computeRecommendations", () => {
  beforeEach(() => setupStore());

  // ── Guard conditions ──────────────────────────────────────────────────────

  describe("guard conditions", () => {
    it("returns [] when the engine is disabled", () => {
      setupStore({ enabled: false });
      expect(computeRecommendations([sig()])).toEqual([]);
    });

    it("returns [] when privacy has not been accepted", () => {
      setupStore({ privacyAccepted: false });
      expect(computeRecommendations([sig()])).toEqual([]);
    });

    it("returns [] for an empty signal list", () => {
      expect(computeRecommendations([])).toEqual([]);
    });
  });

  // ── Confidence floor filtering ─────────────────────────────────────────────

  describe("confidence floor by risk profile", () => {
    it.each([
      ["conservative", 74, 0] as const,
      ["conservative", 75, 1] as const,
      ["moderate", 59, 0] as const,
      ["moderate", 60, 1] as const,
      ["aggressive", 39, 0] as const,
      ["aggressive", 40, 1] as const,
    ])(
      "%s profile: confidence %d → %d result(s)",
      (riskProfile, confidence, expected) => {
        setupStore({ riskProfile });
        expect(computeRecommendations([sig({ confidence })])).toHaveLength(
          expected
        );
      }
    );
  });

  // ── Asset preference scoring ──────────────────────────────────────────────

  describe("asset preference scoring", () => {
    it("adds +15 to score for a previously liked asset", () => {
      setupStore({
        feedback: [
          { signalId: "sig-A", liked: true, timestamp: "", source: "explicit" },
        ],
      });
      const signal = sig({ id: "sig-A", ticker: "XLM", confidence: 65 });
      const [rec] = computeRecommendations([signal]);

      expect(rec.score).toBe(Math.min(100, 65 + 15 + SEASONAL_BOOST));
    });

    it("subtracts 20 from score for a previously disliked asset", () => {
      setupStore({
        feedback: [
          {
            signalId: "sig-B",
            liked: false,
            timestamp: "",
            source: "explicit",
          },
        ],
      });
      const signal = sig({ id: "sig-B", ticker: "XLM", confidence: 65 });
      const recs = computeRecommendations([signal]);

      const expectedScore = Math.min(
        100,
        Math.max(0, 65 - 20 + SEASONAL_BOOST)
      );
      if (expectedScore > 0) {
        expect(recs[0].score).toBe(expectedScore);
      } else {
        expect(recs).toHaveLength(0);
      }
    });

    it("mentions the liked asset in the recommendation reasons", () => {
      setupStore({
        feedback: [
          { signalId: "sig-A", liked: true, timestamp: "", source: "explicit" },
        ],
      });
      const signal = sig({ id: "sig-A", ticker: "XLM", confidence: 65 });
      const [rec] = computeRecommendations([signal]);

      expect(rec.reasons.some((r) => r.includes("XLM"))).toBe(true);
    });

    it("does not boost an asset that was only disliked in another signal", () => {
      setupStore({
        feedback: [
          {
            signalId: "sig-other",
            liked: false,
            timestamp: "",
            source: "explicit",
          },
        ],
      });
      // 'sig-other' doesn't appear in the signals array, so disliked asset is ''
      // The signal under test uses asset 'XLM' — no penalty expected
      const signal = sig({ id: "sig-A", ticker: "XLM", confidence: 65 });
      const [rec] = computeRecommendations([signal]);

      expect(rec.score).toBe(Math.min(100, 65 + SEASONAL_BOOST));
    });
  });

  // ── Risk profile bonuses ──────────────────────────────────────────────────

  describe("risk profile bonuses", () => {
    it("adds +10 for aggressive profile when confidence >= 80", () => {
      setupStore({ riskProfile: "aggressive" });
      const [rec] = computeRecommendations([sig({ confidence: 80 })]);

      expect(rec.score).toBe(Math.min(100, 80 + 10 + SEASONAL_BOOST));
    });

    it("does not apply aggressive bonus when confidence is 79", () => {
      setupStore({ riskProfile: "aggressive" });
      const [rec] = computeRecommendations([sig({ confidence: 79 })]);

      expect(rec.score).toBe(Math.min(100, 79 + SEASONAL_BOOST));
    });

    it("adds +8 for conservative profile when confidence >= 80", () => {
      setupStore({ riskProfile: "conservative" });
      const [rec] = computeRecommendations([sig({ confidence: 80 })]);

      expect(rec.score).toBe(Math.min(100, 80 + 8 + SEASONAL_BOOST));
    });

    it("adds a reason for high-confidence aggressive match", () => {
      setupStore({ riskProfile: "aggressive" });
      const [rec] = computeRecommendations([sig({ confidence: 85 })]);

      expect(rec.reasons.some((r) => /risk profile/i.test(r))).toBe(true);
    });

    it("adds a reason for bullish direction", () => {
      const [rec] = computeRecommendations([sig({ action: "BUY" })]);

      expect(rec.reasons.some((r) => /bullish/i.test(r))).toBe(true);
    });
  });

  // ── Sorting and top-N limiting ────────────────────────────────────────────

  describe("sorting and top-5 cap", () => {
    it("returns results sorted by score descending", () => {
      const signals = [
        sig({ id: "low", confidence: 65 }),
        sig({ id: "high", confidence: 90 }),
        sig({ id: "mid", confidence: 75 }),
      ];
      const recs = computeRecommendations(signals);

      expect(recs[0].signalId).toBe("high");
      expect(recs[recs.length - 1].signalId).toBe("low");
    });

    it("returns at most 5 recommendations regardless of input size", () => {
      setupStore({ riskProfile: "aggressive" });
      const signals = Array.from({ length: 8 }, (_, i) =>
        sig({ id: `sig-${i}`, confidence: 50 + i })
      );
      expect(computeRecommendations(signals).length).toBeLessThanOrEqual(5);
    });

    it("persists computed recommendations to the store", () => {
      computeRecommendations([sig({ id: "sig-persist", confidence: 70 })]);

      const stored = useRecommendationStore.getState().recommendations;
      expect(stored).toHaveLength(1);
      expect(stored[0].signalId).toBe("sig-persist");
    });

    it("overwrites any previously stored recommendations", () => {
      computeRecommendations([sig({ id: "first-run", confidence: 70 })]);
      computeRecommendations([sig({ id: "second-run", confidence: 70 })]);

      const stored = useRecommendationStore.getState().recommendations;
      expect(stored).toHaveLength(1);
      expect(stored[0].signalId).toBe("second-run");
    });
  });

  // ── Score clamping ────────────────────────────────────────────────────────

  describe("score clamping", () => {
    it("never produces a score above 100", () => {
      setupStore({
        riskProfile: "aggressive",
        feedback: [
          {
            signalId: "sig-cap",
            liked: true,
            timestamp: "",
            source: "explicit",
          },
        ],
      });
      // confidence 95 + liked +15 + aggressive +10 + seasonal — well over 100
      const [rec] = computeRecommendations([
        sig({ id: "sig-cap", ticker: "XLM", confidence: 95 }),
      ]);

      expect(rec.score).toBeLessThanOrEqual(100);
    });

    it("excludes signals whose final score is 0 or below", () => {
      // confidence 40 (moderate floor is 60) → score 0, filtered out
      setupStore({ riskProfile: "moderate" });
      expect(computeRecommendations([sig({ confidence: 40 })])).toHaveLength(0);
    });
  });

  // ── Fallback reason ───────────────────────────────────────────────────────

  describe("fallback reason", () => {
    it("includes a fallback reason when no specific reason applies", () => {
      // SELL signal, moderate profile, no liked/disliked assets, score < 80
      // so no profile bonus, no BUY reason, no liked reason
      // Only seasonal reason might apply; if it doesn't, fallback is added
      const signal = sig({ action: "SELL", confidence: 62, ticker: "BTC" });
      const [rec] = computeRecommendations([signal]);

      if (rec.reasons.length === 1 && SEASONAL_BOOST === 0) {
        expect(rec.reasons[0]).toBe("Matches your trading history");
      } else {
        expect(rec.reasons.length).toBeGreaterThan(0);
      }
    });
  });
});
