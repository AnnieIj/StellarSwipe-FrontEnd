import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RiskProfile = "conservative" | "moderate" | "aggressive";

export interface RecommendationFeedback {
  signalId: string;
  liked: boolean;
  timestamp: string;
  /** 'explicit' = thumbs up/down; 'implicit' = copy, dismiss, or other behavioral signal */
  source: "explicit" | "implicit";
}

export interface RecommendationSettings {
  enabled: boolean;
  riskProfile: RiskProfile;
  privacyAccepted: boolean;
}

export interface RecommendedSignal {
  signalId: string;
  score: number;
  reasons: string[];
}

interface RecommendationStore {
  settings: RecommendationSettings;
  feedback: RecommendationFeedback[];
  recommendations: RecommendedSignal[];
  accuracyMetrics: { total: number; correct: number };
  updateSettings: (patch: Partial<RecommendationSettings>) => void;
  addFeedback: (
    signalId: string,
    liked: boolean,
    source?: "explicit" | "implicit"
  ) => void;
  setRecommendations: (recs: RecommendedSignal[]) => void;
  recordAccuracy: (wasCorrect: boolean) => void;
}

export const useRecommendationStore = create<RecommendationStore>()(
  persist(
    (set) => ({
      settings: {
        enabled: true,
        riskProfile: "moderate",
        privacyAccepted: false,
      },
      feedback: [],
      recommendations: [],
      accuracyMetrics: { total: 0, correct: 0 },

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      addFeedback: (signalId, liked, source = "implicit") =>
        set((s) => ({
          feedback: [
            { signalId, liked, timestamp: new Date().toISOString(), source },
            ...s.feedback.filter((f) => f.signalId !== signalId),
          ].slice(0, 200),
        })),

      setRecommendations: (recs) => set({ recommendations: recs }),

      recordAccuracy: (wasCorrect) =>
        set((s) => ({
          accuracyMetrics: {
            total: s.accuracyMetrics.total + 1,
            correct: s.accuracyMetrics.correct + (wasCorrect ? 1 : 0),
          },
        })),
    }),
    { name: "stellarswipe:recommendations" }
  )
);
