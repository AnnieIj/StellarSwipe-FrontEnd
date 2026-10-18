/**
 * Unit tests for the signal feed fetch timeout/abort handling (Issue #440),
 * plus stale-request cancellation when the owning view/query is superseded.
 *
 * Mirrors `fetchLiveSignals`'s abort logic without needing a full
 * QueryClientProvider render, consistent with the pure-logic test style
 * used elsewhere in `hooks/__tests__`.
 */

import { TimeoutError, NetworkError } from "@/lib/api";

const SIGNALS_FETCH_TIMEOUT_MS = 12_000;

/** Mirrors the fetch/AbortController wiring in useSignalsFeed's fetchLiveSignals. */
async function fetchWithTimeout(
  fetchImpl: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  timeoutMs: number = SIGNALS_FETCH_TIMEOUT_MS,
  outerSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onOuterAbort = () => controller.abort();
  outerSignal?.addEventListener("abort", onOuterAbort);

  try {
    return await fetchImpl("/api/signals", { signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      if (outerSignal?.aborted && !timedOut) throw err;
      throw new TimeoutError(timeoutMs);
    }
    throw new NetworkError();
  } finally {
    clearTimeout(timeout);
    outerSignal?.removeEventListener("abort", onOuterAbort);
  }
}

describe("useSignalsFeed – fetch timeout handling", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("throws a TimeoutError when the fetch hangs past the configured window", async () => {
    const hungFetch = jest.fn(
      (_input: RequestInfo, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new DOMException("Aborted", "AbortError");
            reject(err);
          });
        })
    );

    const pending = fetchWithTimeout(hungFetch, SIGNALS_FETCH_TIMEOUT_MS);
    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError);

    await jest.advanceTimersByTimeAsync(SIGNALS_FETCH_TIMEOUT_MS);
    await assertion;
  });

  it("does not time out a fetch that resolves before the window elapses", async () => {
    const okResponse = { ok: true } as Response;
    const fastFetch = jest.fn(() => Promise.resolve(okResponse));

    const result = await fetchWithTimeout(fastFetch, SIGNALS_FETCH_TIMEOUT_MS);

    expect(result).toBe(okResponse);
  });

  it("surfaces a NetworkError (not TimeoutError) for non-abort fetch failures", async () => {
    const failingFetch = jest.fn(() => Promise.reject(new TypeError("Failed to fetch")));

    await expect(fetchWithTimeout(failingFetch, SIGNALS_FETCH_TIMEOUT_MS)).rejects.toBeInstanceOf(
      NetworkError
    );
  });
});

describe("useSignalsFeed – stale-request cancellation", () => {
  it("aborts the in-flight request when the owning view/query is superseded", async () => {
    const outerController = new AbortController();
    let requestSignal: AbortSignal | undefined;

    const hangingFetch = jest.fn(
      (_input: RequestInfo, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          requestSignal = init?.signal ?? undefined;
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    );

    const pending = fetchWithTimeout(
      hangingFetch,
      SIGNALS_FETCH_TIMEOUT_MS,
      outerController.signal
    );

    // Simulate the caller navigating away before the response resolves —
    // React Query aborts the queryFn's signal when the query is cancelled.
    outerController.abort();

    // The abort error is rethrown as-is (not wrapped as a TimeoutError or
    // NetworkError) so it is never shown as a user-facing failure.
    await expect(pending).rejects.toBeInstanceOf(DOMException);
    await expect(pending).rejects.not.toBeInstanceOf(TimeoutError);
    await expect(pending).rejects.not.toBeInstanceOf(NetworkError);
    // The actual network-level fetch was aborted too, not merely ignored.
    expect(requestSignal?.aborted).toBe(true);
  });

  it("still times out normally when only the internal timeout fires (no outer cancellation)", async () => {
    jest.useFakeTimers();
    const outerController = new AbortController();

    const hungFetch = jest.fn(
      (_input: RequestInfo, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    );

    const pending = fetchWithTimeout(
      hungFetch,
      SIGNALS_FETCH_TIMEOUT_MS,
      outerController.signal
    );
    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError);

    await jest.advanceTimersByTimeAsync(SIGNALS_FETCH_TIMEOUT_MS);
    await assertion;
    jest.useRealTimers();
  });
});
