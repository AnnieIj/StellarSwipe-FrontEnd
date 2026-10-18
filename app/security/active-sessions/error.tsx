"use client";

import { RouteErrorFallback } from "@/components/RouteErrorFallback";

export default function ActiveSessionsError({
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
      areaName="Active sessions"
      parentHref="/security"
      parentLabel="Back to Account Security"
    />
  );
}
