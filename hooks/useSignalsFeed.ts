"use client";

import { useQuery } from "@tanstack/react-query";
import { useDemoModeStore } from "@/store/useDemoModeStore";
import { buildSignalPage, Signal, SignalFeedPage } from "@/lib/signals";
import { NetworkError, ServerError, TimeoutError } from "@/lib/api";
import { queryOptions } from "@/lib/queryOptions";

// Consistent with webhookService's timeoutMs convention (10s), with a small
// margin since this is a user-facing feed fetch rather than a webhook POST.
const SIGNALS_FETCH_TIMEOUT_MS = 12_000;

export function useSignalsFeed() {
  const { isDemoMode } = useDemoModeStore();

  const fetchLiveSignals = async (
    outerSignal?: AbortSignal
  ): Promise<Signal[]> => {
    let response: Response;
    // Own a timeout abort independent of the caller's signal, but honor the
    // caller's signal too (React Query aborts it when this query is
    // superseded or its owning view unmounts) so the network request is
    // actually cancelled either way.
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, SIGNALS_FETCH_TIMEOUT_MS);
    const onOuterAbort = () => controller.abort();
    outerSignal?.addEventListener("abort", onOuterAbort);

    try {
      response = await fetch("/api/signals", {
        headers: {
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Caller-initiated cancellation (route/view abandoned) is not a
        // failure — let React Query treat it as a no-op instead of
        // surfacing a timeout/network error to the user.
        if (outerSignal?.aborted && !timedOut) throw err;
        throw new TimeoutError(SIGNALS_FETCH_TIMEOUT_MS);
      }
      // Network error
      const networkError = new NetworkError();
      throw networkError;
    } finally {
      clearTimeout(timeout);
      outerSignal?.removeEventListener("abort", onOuterAbort);
    }

    if (!response.ok) {
      // Server error
      const errorData = await response.text();
      const serverError = new ServerError(response.status);
      // Enhance error message with status
      serverError.message = `Server error (${response.status}): ${
        errorData || "Unable to load signals"
      }. Please try again later.`;
      throw serverError;
    }

    try {
      const page: SignalFeedPage = await response.json();
      return page.items;
    } catch (err) {
      // JSON parsing error
      const parseError = new Error(
        "Failed to parse signal data. This might indicate a service issue."
      );
      throw parseError;
    }
  };

  const fetchDemoSignals = async (): Promise<Signal[]> => {
    const page = buildSignalPage(1, 5);
    return page.items;
  };

  const {
    data: signals,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["signals", isDemoMode ? "demo" : "live"],
    queryFn: isDemoMode
      ? fetchDemoSignals
      : ({ signal }) => fetchLiveSignals(signal),
    ...queryOptions.signal,
    retry: 2,
    retryDelay: (attemptIndex) =>
      Math.min(1000 * Math.pow(2, attemptIndex), 10000),
  });

  return {
    signals: signals || [],
    isLoading,
    error,
    refetch,
    isRefetching,
    isDemoMode,
  };
}
