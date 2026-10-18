import { useEffect, useRef, useState } from "react";
import { traceWorker } from "@/src/tracing/worker-tracing.service";
import * as Sentry from "@sentry/nextjs";

export interface SignalPrice {
  executionPrice: number;
  roi: number;
  confidence: number;
  updatedAt: Date;
}

export type FetchSignalPrice = (
  current: SignalPrice
) => SignalPrice | Promise<SignalPrice>;

type FlashColor = "up" | "down" | null;

/** Cap for exponential backoff after repeated poll failures (1 minute). */
export const SIGNAL_PRICE_MAX_BACKOFF_MS = 60_000;

/**
 * Next polling delay after `consecutiveFailures` failed polls.
 * failures=0 → base; failures=1 → 2×base; failures=2 → 4×base; … capped at max.
 */
export function computePollDelayMs(
  intervalMs: number,
  consecutiveFailures: number,
  maxBackoffMs = SIGNAL_PRICE_MAX_BACKOFF_MS
): number {
  if (consecutiveFailures <= 0) return intervalMs;
  const delay = intervalMs * 2 ** consecutiveFailures;
  // Never back off to something shorter than the base interval, even when
  // the base interval already exceeds the cap.
  return Math.max(intervalMs, Math.min(maxBackoffMs, delay));
}

// Mock polling — replace with real WebSocket/API call
function mockFetchPrice(current: SignalPrice): SignalPrice {
  const delta = (Math.random() - 0.48) * 0.002;
  const newPrice = parseFloat((current.executionPrice + delta).toFixed(4));
  const roiDelta = (Math.random() - 0.48) * 0.5;
  const newRoi = parseFloat((current.roi + roiDelta).toFixed(2));
  const confDelta = Math.floor((Math.random() - 0.5) * 3);
  const newConf = Math.min(100, Math.max(0, current.confidence + confDelta));
  return {
    executionPrice: newPrice,
    roi: newRoi,
    confidence: newConf,
    updatedAt: new Date(),
  };
}

export interface UseSignalPriceOptions {
  /** Override the price source (used by tests / real feed wiring). */
  fetchPrice?: FetchSignalPrice;
}

export function useSignalPrice(
  intervalMs = 3000,
  options: UseSignalPriceOptions = {}
) {
  const { fetchPrice = mockFetchPrice } = options;
  const [price, setPrice] = useState<SignalPrice>({
    executionPrice: 0.4821,
    roi: 12.4,
    confidence: 78,
    updatedAt: new Date(),
  });
  const [flash, setFlash] = useState<FlashColor>(null);
  const [relativeTime, setRelativeTime] = useState("just now");
  const [stale, setStale] = useState(false);
  const prevRef = useRef(price);
  const fetchPriceRef = useRef(fetchPrice);
  fetchPriceRef.current = fetchPrice;

  // Price polling with exponential backoff on consecutive failures
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let consecutiveFailures = 0;

    const schedule = (delayMs: number) => {
      timeoutId = setTimeout(runPoll, delayMs);
    };

    const runPoll = () => {
      if (cancelled) return;

      traceWorker("worker:signalPrice:poll", async () => {
        const prev = prevRef.current;
        const next = await fetchPriceRef.current(prev);

        if (cancelled) return;

        consecutiveFailures = 0;
        setStale(false);
        setPrice(next);

        const dir =
          next.executionPrice > prev.executionPrice
            ? "up"
            : next.executionPrice < prev.executionPrice
            ? "down"
            : null;
        if (dir) {
          setFlash(dir);
          setTimeout(() => setFlash(null), 900);
        }
        prevRef.current = next;
      })
        .catch((err) => {
          Sentry.captureException(err);
          consecutiveFailures++;
          setStale(true);
        })
        .finally(() => {
          if (!cancelled) {
            const nextDelay = computePollDelayMs(
              intervalMs,
              consecutiveFailures
            );
            schedule(nextDelay);
          }
        });
    };

    schedule(intervalMs);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [intervalMs]);

  // Relative timestamp — refreshes every 60 s (always uses realClock for display)
  useEffect(() => {
    const fmt = () => {
      const secs = Math.floor((Date.now() - price.updatedAt.getTime()) / 1000);
      if (secs < 5) return "just now";
      if (secs < 60) return `updated ${secs}s ago`;
      return `updated ${Math.floor(secs / 60)}m ago`;
    };
    setRelativeTime(fmt());
    const id = setInterval(() => setRelativeTime(fmt()), 60_000);
    return () => clearInterval(id);
  }, [price.updatedAt]);

  return { price, flash, relativeTime, stale };
}
