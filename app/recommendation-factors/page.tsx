import { Suspense } from "react";
import { RecommendationFactorsPage } from "@/components/RecommendationFactorsPage";

export const metadata = {
  title: "Why Am I Seeing This? — StellarSwipe",
  description:
    "The factors and weights the recommendation engine uses to personalise your signal feed.",
};

function FactorsLoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-3 rounded-lg border border-dashed border-gray-300 p-6"
    >
      <span className="sr-only">Loading recommendation factors…</span>
      <div className="h-5 w-1/3 animate-pulse rounded bg-gray-200" aria-hidden="true" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" aria-hidden="true" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" aria-hidden="true" />
    </div>
  );
}

export default function RecommendationFactorsRoute() {
  return (
    <main className="p-4">
      <Suspense fallback={<FactorsLoadingState />}>
        <RecommendationFactorsPage />
      </Suspense>
    </main>
  );
}
