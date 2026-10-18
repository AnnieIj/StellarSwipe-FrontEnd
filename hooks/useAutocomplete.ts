import { useEffect, useRef, useState, useCallback } from "react";

export type AutocompleteStatus = "idle" | "loading" | "success" | "empty" | "error";

interface UseAutocompleteOptions<T> {
  /** Fetches suggestions for a query. Receives an AbortSignal tied to that request. */
  fetcher: (query: string, signal: AbortSignal) => Promise<T[]>;
  /** Debounce before firing a request, in ms. */
  debounceMs?: number;
  /** Minimum query length before searching. */
  minLength?: number;
}

interface UseAutocompleteResult<T> {
  query: string;
  setQuery: (query: string) => void;
  results: T[];
  status: AutocompleteStatus;
  /** The query string that produced the current `results`. */
  resultsQuery: string;
}

/**
 * Debounced autocomplete with stale-response protection.
 *
 * Fast typing + slow/out-of-order network responses can otherwise let an
 * older request overwrite newer suggestions. This hook guards against that
 * two ways: it aborts the in-flight request whenever the query changes, and
 * it tags every request with a monotonically increasing id so a response
 * can only ever update state if it's still the most recent request —
 * regardless of resolution order.
 */
export function useAutocomplete<T>({
  fetcher,
  debounceMs = 250,
  minLength = 1,
}: UseAutocompleteOptions<T>): UseAutocompleteResult<T> {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [resultsQuery, setResultsQuery] = useState("");
  const [status, setStatus] = useState<AutocompleteStatus>("idle");

  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const trimmed = query.trim();

    // Cancel whatever request is in flight — it's now stale by definition.
    abortRef.current?.abort();

    if (trimmed.length < minLength) {
      requestIdRef.current += 1;
      setResults([]);
      setResultsQuery(trimmed);
      setStatus("idle");
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");

    const timer = setTimeout(() => {
      fetcherRef
        .current(trimmed, controller.signal)
        .then((data) => {
          // Only the most recent request may commit its results.
          if (requestIdRef.current !== requestId || controller.signal.aborted) {
            return;
          }
          setResults(data);
          setResultsQuery(trimmed);
          setStatus(data.length === 0 ? "empty" : "success");
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          if (requestIdRef.current !== requestId) return;
          if (err?.name === "AbortError") return;
          setStatus("error");
        });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, minLength, debounceMs]);

  return {
    query,
    setQuery: useCallback((q: string) => setQuery(q), []),
    results,
    status,
    resultsQuery,
  };
}
