"use client";

import {
  useRecommendationStore,
  type RiskProfile,
} from "@/store/useRecommendationStore";

const RISK_OPTIONS: { value: RiskProfile; label: string; desc: string }[] = [
  {
    value: "conservative",
    label: "Conservative",
    desc: "High-confidence signals only (75%+)",
  },
  { value: "moderate", label: "Moderate", desc: "Balanced risk/reward (60%+)" },
  {
    value: "aggressive",
    label: "Aggressive",
    desc: "All signals including speculative (40%+)",
  },
];

/**
 * Settings panel for AI recommendations (#171)
 */
export function RecommendationSettings() {
  const { settings, updateSettings, feedback, accuracyMetrics } =
    useRecommendationStore();
  const accuracyPct =
    accuracyMetrics.total > 0
      ? Math.round((accuracyMetrics.correct / accuracyMetrics.total) * 100)
      : null;

  return (
    <section className="space-y-4">
      <h3 className="font-semibold text-sm">AI Recommendations</h3>

      {/* Enable toggle */}
      <label className="flex items-center justify-between cursor-pointer">
        <span className="text-sm">Enable personalised recommendations</span>
        <button
          role="switch"
          aria-checked={settings.enabled}
          onClick={() => updateSettings({ enabled: !settings.enabled })}
          className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
            settings.enabled ? "bg-blue-500" : "bg-muted"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              settings.enabled ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
      </label>

      {settings.enabled && (
        <>
          {/* Risk profile */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Risk Profile</span>
            {RISK_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-start gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="riskProfile"
                  value={opt.value}
                  checked={settings.riskProfile === opt.value}
                  onChange={() => updateSettings({ riskProfile: opt.value })}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {opt.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {/* Accuracy metrics */}
          {accuracyMetrics.total > 0 && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <div className="font-medium">Recommendation accuracy</div>
              <div className="text-muted-foreground text-xs">
                {accuracyPct}% ({accuracyMetrics.correct}/
                {accuracyMetrics.total} signals)
              </div>
              <div className="text-xs text-muted-foreground">
                Based on {feedback.length} feedback interactions
              </div>
            </div>
          )}

          {/* Privacy notice */}
          {!settings.privacyAccepted && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs space-y-2">
              <p className="font-medium text-yellow-600 dark:text-yellow-400">
                Privacy Policy
              </p>
              <p className="text-muted-foreground">
                Recommendations are computed locally using your trading
                feedback. No personal data is sent to external servers. Your
                feedback is stored in browser localStorage only.
              </p>
              <button
                onClick={() => updateSettings({ privacyAccepted: true })}
                className="mt-1 rounded bg-yellow-500 px-3 py-1 text-xs font-medium text-white hover:bg-yellow-600"
              >
                Accept &amp; Enable
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
