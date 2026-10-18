"use client";

import { RouteErrorFallback } from "@/components/RouteErrorFallback";

export default function LeaderboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorFallback
      error={error}
      reset={reset}
      areaName="Leaderboard"
      parentHref="/app"
      parentLabel="Back to dashboard"
    />
  );
}
