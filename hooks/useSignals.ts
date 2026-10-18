import { useQuery } from "@tanstack/react-query";
import { fetchSignals, NetworkError, ServerError } from "@/lib/api";
import { queryOptions } from "@/lib/queryOptions";

export function useSignals() {
  return useQuery({
    queryKey: ["signals"],
    // Forward React Query's per-call AbortSignal so an abandoned/superseded
    // request is actually cancelled at the network layer, not just ignored.
    queryFn: ({ signal }) => fetchSignals({ signal }),
    ...queryOptions.signal,
    retry: (failureCount, error) => {
      if (error instanceof NetworkError && failureCount < 2) return true;
      if (
        error instanceof ServerError &&
        error.status >= 500 &&
        failureCount < 2
      )
        return true;
      return false;
    },
    retryDelay: (attemptIndex) =>
      Math.min(1000 * Math.pow(2, attemptIndex), 10000),
  });
}

/**
 * @deprecated Use `useSignals` instead. This shim exists for backwards
 * compatibility and will be removed in a future release.
 */
export function useSignalFeed() {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      '[StellarSwipe] "useSignalFeed" is deprecated. Use "useSignals" instead.'
    );
  }
  return useSignals();
}
