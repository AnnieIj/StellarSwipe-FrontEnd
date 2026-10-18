"use client";

import { RouteErrorFallback } from "@/components/RouteErrorFallback";

export default function ProviderProfileError({
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
      areaName="Provider profile"
      parentHref="/leaderboard"
      parentLabel="Back to leaderboard"
    />
  );
}
