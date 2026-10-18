# Issue #171 - AI-Powered Signal Recommendation Engine

Maps implemented features to acceptance criteria.

## Implemented

- **Recommendation algorithm** – `recommendationEngine.ts`: client-side collaborative filtering; scores signals using feedback history (liked assets +15, disliked −20), risk profile confidence floors, seasonal adjustments, and direction bias.
- **Personalised signal suggestions in feed header** – `SignalRecommendations` component; top 5 scored signals shown as horizontal scroll cards above the feed.
- **Reasons shown to user** – Each recommendation card displays up to 2 human-readable reason strings generated during scoring.
- **User feedback (like/dislike)** – ThumbsUp/ThumbsDown buttons on each card; stored in `useRecommendationStore.feedback`.
- **Learning from feedback** – `computeRecommendations` reads feedback to build liked/disliked asset sets; runs on every signal list or settings change.
- **Risk profile matching** – `RecommendationSettings` exposes Conservative / Moderate / Aggressive profiles mapped to confidence floors (75 / 60 / 40).
- **Seasonal/market condition adjustments** – Q4 and Q1 get +5 score boost in `SEASONAL_BOOST`.
- **Accuracy metrics tracking** – `accuracyMetrics` counter in store; `recordAccuracy()` called after trade outcome; displayed in settings panel.
- **Enable/disable toggle** – Toggle in `RecommendationSettings`; component returns `null` when disabled.
- **Privacy policy** – Prominent privacy notice gate; recommendations only compute after `privacyAccepted = true`; all data stays in localStorage.

## Files

| File                                    | Role                                                           |
| --------------------------------------- | -------------------------------------------------------------- |
| `store/useRecommendationStore.ts`       | Persisted state: settings, feedback, recommendations, accuracy |
| `services/recommendationEngine.ts`      | Scoring algorithm                                              |
| `components/SignalRecommendations.tsx`  | Feed-header recommendations UI                                 |
| `components/RecommendationSettings.tsx` | Settings + privacy + accuracy panel                            |
