/**
 * Market-data client with availability policies (#965)
 * - Bounded timeout on every request
 * - Retry with exponential backoff, only for eligible errors
 *   (timeouts, network failures, 429 and 5xx)
 * - Circuit breaker: opens after consecutive failed requests, admits a
 *   single probe after the cooldown, and closes again on success
 */
import { NetworkError, ServerError, TimeoutError } from "@/lib/api";

export class CircuitOpenError extends Error {
  constructor() {
    super("Market data is temporarily unavailable — retrying shortly.");
    this.name = "CircuitOpenError";
  }
}

export type CircuitState = "closed" | "open" | "half-open";

export interface MarketDataClientOptions {
  /** Per-attempt timeout in ms (default 5s). */
  timeoutMs?: number;
  /** Total attempts per request, including the first (default 3). */
  maxAttempts?: number;
  /** Backoff before the first retry in ms; doubles each retry (default 500ms). */
  baseBackoffMs?: number;
  /** Consecutive failed requests before the circuit opens (default 5). */
  failureThreshold?: number;
  /** Time the circuit stays open before admitting a probe in ms (default 30s). */
  cooldownMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULTS = {
  timeoutMs: 5_000,
  maxAttempts: 3,
  baseBackoffMs: 500,
  failureThreshold: 5,
  cooldownMs: 30_000,
} as const;

/** Only transient failures are worth retrying; 4xx (other than 429) is not. */
function isRetryable(error: unknown): boolean {
  if (error instanceof TimeoutError || error instanceof NetworkError) {
    return true;
  }
  return (
    error instanceof ServerError &&
    (error.status === 429 || error.status >= 500)
  );
}

export function createMarketDataClient(options: MarketDataClientOptions = {}) {
  const config = { ...DEFAULTS, ...options };
  const fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const now = options.now ?? Date.now;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));

  let state: CircuitState = "closed";
  let consecutiveFailures = 0;
  let openedAt = 0;
  let probeInFlight = false;

  /** Throws if the circuit rejects the call; otherwise reserves a probe slot when half-open. */
  const admit = () => {
    if (state === "open") {
      if (now() - openedAt < config.cooldownMs) throw new CircuitOpenError();
      state = "half-open";
    }
    if (state === "half-open") {
      if (probeInFlight) throw new CircuitOpenError();
      probeInFlight = true;
    }
  };

  const recordSuccess = () => {
    probeInFlight = false;
    consecutiveFailures = 0;
    state = "closed";
  };

  const recordFailure = () => {
    probeInFlight = false;
    consecutiveFailures++;
    if (
      state !== "open" &&
      (state === "half-open" || consecutiveFailures >= config.failureThreshold)
    ) {
      state = "open";
      openedAt = now();
    }
  };

  /** A non-retryable outcome says nothing about source health; just free the probe slot. */
  const releaseProbe = () => {
    probeInFlight = false;
  };

  const fetchOnce = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    const forwardAbort = () => controller.abort();
    signal?.addEventListener("abort", forwardAbort);
    try {
      const res = await fetchImpl(url, { signal: controller.signal });
      if (!res.ok) throw new ServerError(res.status);
      return (await res.json()) as T;
    } catch (error) {
      // Caller-initiated aborts pass through untouched (see lib/api.ts).
      if (signal?.aborted) throw error;
      if (controller.signal.aborted) throw new TimeoutError(config.timeoutMs);
      if (error instanceof ServerError || error instanceof SyntaxError) {
        throw error;
      }
      throw new NetworkError();
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", forwardAbort);
    }
  };

  /** GET a JSON resource through the timeout, retry and circuit-breaker policies. */
  const get = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
    admit();
    for (let attempt = 1; ; attempt++) {
      try {
        signal?.throwIfAborted();
        const data = await fetchOnce<T>(url, signal);
        recordSuccess();
        return data;
      } catch (error) {
        const retryable = isRetryable(error);
        if (!retryable || attempt >= config.maxAttempts) {
          if (retryable) recordFailure();
          else releaseProbe();
          throw error;
        }
        await sleep(config.baseBackoffMs * 2 ** (attempt - 1));
      }
    }
  };

  return { get, getState: () => state };
}

export const marketDataClient = createMarketDataClient();
