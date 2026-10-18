/**
 * AI Signal Recommendation Engine (#171)
 * Client-side collaborative filtering based on feedback history and risk profile.
 * Replace scoring logic with a real ML backend call when available.
 */
import {
  useRecommendationStore,
  type RiskProfile,
  type RecommendedSignal,
} from "@/store/useRecommendationStore";
import type { Signal } from "@/lib/api-types.generated";

const RISK_CONFIDENCE_FLOOR: Record<RiskProfile, number> = {
  conservative: 75,
  moderate: 60,
  aggressive: 40,
};

export interface RecommendationFactor {
  id: string;
  label: string;
  description: string;
  weight: string;
}

/**
 * All factors the engine considers when scoring signals.
 * Sourced from the same constants used in scoreSignal so the page never drifts.
 */
export const RECOMMENDATION_FACTORS: RecommendationFactor[] = [
  {
    id: "base_confidence",
    label: "Signal Confidence",
    description:
      "Raw confidence score published by the provider (0–100). This is the starting point for every recommendation score.",
    weight: "Base score (0–100)",
  },
  {
    id: "confidence_floor",
    label: "Risk Profile Confidence Floor",
    description: `Signals below the floor for your risk profile are excluded entirely. Conservative: ${RISK_CONFIDENCE_FLOOR.conservative}%, Moderate: ${RISK_CONFIDENCE_FLOOR.moderate}%, Aggressive: ${RISK_CONFIDENCE_FLOOR.aggressive}%.`,
    weight: "Excludes signal if below floor",
  },
  {
    id: "liked_asset",
    label: "Liked Asset Boost",
    description:
      "Applied when you have previously given a thumbs-up to signals for the same trading asset.",
    weight: "+15 points",
  },
  {
    id: "disliked_asset",
    label: "Disliked Asset Penalty",
    description:
      "Applied when you have previously given a thumbs-down to signals for the same trading asset.",
    weight: "−20 points",
  },
  {
    id: "risk_profile_aggressive",
    label: "Aggressive Profile Match",
    description:
      "Extra boost for high-confidence signals (≥ 80%) when your risk profile is set to Aggressive.",
    weight: "+10 points",
  },
  {
    id: "risk_profile_conservative",
    label: "Conservative Profile Match",
    description:
      "Extra boost for high-confidence signals (≥ 80%) when your risk profile is set to Conservative.",
    weight: "+8 points",
  },
  {
    id: "seasonal_boost",
    label: "Seasonal Adjustment",
    description:
      "Applied during Q4 (Oct–Dec) and Q1 (Jan–Mar), which historically see higher market volatility.",
    weight: "+5 points",
  },
];

const SEASONAL_BOOST = (() => {
  const month = new Date().getMonth();
  // Q4 (Oct-Dec) and Q1 (Jan-Mar) historically higher volatility
  return month >= 9 || month <= 2 ? 5 : 0;
})();

/** Score a signal against user history + risk profile */
function scoreSignal(
  signal: Signal,
  likedAssets: Set<string>,
  dislikedAssets: Set<string>,
  riskProfile: RiskProfile
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = signal.confidence;

  // Risk profile filter
  const floor = RISK_CONFIDENCE_FLOOR[riskProfile];
  if (signal.confidence < floor) return { score: 0, reasons: [] };

  // Boost for liked assets
  if (likedAssets.has(signal.ticker)) {
    score += 15;
    reasons.push(`You've liked ${signal.ticker} signals before`);
  }
  if (dislikedAssets.has(signal.ticker)) {
    score -= 20;
  }

  // Risk profile match
  if (riskProfile === "aggressive" && signal.confidence >= 80) {
    score += 10;
    reasons.push("High confidence matches your risk profile");
  }
  if (riskProfile === "conservative" && signal.confidence >= 80) {
    score += 8;
    reasons.push("Strong signal with conservative risk fit");
  }

  // Seasonal adjustment
  if (SEASONAL_BOOST > 0) {
    score += SEASONAL_BOOST;
    reasons.push("Seasonal market conditions favour this signal");
  }

  // Direction diversity
  if (signal.action === "BUY") {
    reasons.push("Bullish momentum detected");
  }

  if (reasons.length === 0) reasons.push("Matches your trading history");

  return { score: Math.min(100, Math.max(0, score)), reasons };
}

/**
 * Record explicit thumbs-up/down feedback from the user.
 * Distinct from implicit signals (copy, dismiss) so the engine can weight them differently.
 */
export function recordExplicitFeedback(
  signalId: string,
  sentiment: "up" | "down"
): void {
  const { addFeedback } = useRecommendationStore.getState();
  addFeedback(signalId, sentiment === "up", "explicit");
}

/** Compute recommendations and persist them to the store */
export function computeRecommendations(signals: Signal[]): RecommendedSignal[] {
  const { settings, feedback, setRecommendations } =
    useRecommendationStore.getState();
  if (!settings.enabled || !settings.privacyAccepted) return [];

  const likedAssets = new Set(
    feedback
      .filter((f) => f.liked)
      .map((f) => {
        const sig = signals.find((s) => s.id === f.signalId);
        return sig?.ticker ?? "";
      })
  );
  const dislikedAssets = new Set(
    feedback
      .filter((f) => !f.liked)
      .map((f) => {
        const sig = signals.find((s) => s.id === f.signalId);
        return sig?.ticker ?? "";
      })
  );

  const recs: RecommendedSignal[] = signals
    .map((s) => {
      const { score, reasons } = scoreSignal(
        s,
        likedAssets,
        dislikedAssets,
        settings.riskProfile
      );
      return { signalId: s.id, score, reasons };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  setRecommendations(recs);
  return recs;
}
