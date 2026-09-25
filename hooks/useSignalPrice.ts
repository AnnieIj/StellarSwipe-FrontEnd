import { useEffect, useRef, useState } from "react";
import { traceWorker } from "@/src/tracing/worker-tracing.service";
import { PollerRepo, realClock } from "@/src/poller";
import type { Clock, ScanResult } from "@/src/poller";

export interface SignalPrice {
  executionPrice: number;
  roi: number;
  confidence: number;
  updatedAt: Date;
}

type FlashColor = "up" | "down" | null;

// Mock price fetch — replace with real WebSocket / Horizon API call
function mockFetchPrice(current: SignalPrice): SignalPrice {
  const delta = (Math.random() - 0.48) * 0.002;
  const newPrice = parseFloat((current.executionPrice + delta).toFixed(4));
  const roiDelta = (Math.random() - 0.48) * 0.5;
  const newRoi = parseFloat((current.roi + roiDelta).toFixed(2));
  const confDelta = Math.floor((Math.random() - 0.5) * 3);
  const newConf = Math.min(100, Math.max(0, current.confidence + confDelta));
  return { executionPrice: newPrice, roi: newRoi, confidence: newConf, updatedAt: new Date() };
}

export interface UseSignalPriceOptions {
  intervalMs?: number;
  /**
   * Injected clock.  Defaults to the real wall-clock.
   * Pass a `FakeClock` in tests to control time deterministically.
   */
  clock?: Clock;
}

export function useSignalPrice(
  intervalMsOrOptions: number | UseSignalPriceOptions = 3000
) {
  const options: UseSignalPriceOptions =
    typeof intervalMsOrOptions === "number"
      ? { intervalMs: intervalMsOrOptions }
      : intervalMsOrOptions;

  const intervalMs = options.intervalMs ?? 3000;
  const clock = options.clock ?? realClock;

  const [price, setPrice] = useState<SignalPrice>({
    executionPrice: 0.4821,
    roi: 12.4,
    confidence: 78,
    updatedAt: new Date(clock.now()),
  });
  const [flash, setFlash] = useState<FlashColor>(null);
  const [relativeTime, setRelativeTime] = useState("just now");
  const prevRef = useRef(price);
  const pollerRef = useRef<PollerRepo | null>(null);

  // Price polling via PollerRepo (clock-injectable)
  useEffect(() => {
    const poller = new PollerRepo(
      async (_cursor, _clock): Promise<ScanResult> => {
        await traceWorker("worker:signalPrice:poll", async () => {
          setPrice((prev) => {
            const next = mockFetchPrice(prev);
            const dir =
              next.executionPrice > prev.executionPrice
                ? "up"
                : next.executionPrice < prev.executionPrice
                ? "down"
                : null;
            if (dir) {
              setFlash(dir);
              globalThis.setTimeout(() => setFlash(null), 900);
            }
            prevRef.current = next;
            return next;
          });
        });
        return {
          summary: "price polled",
          latestEventAt: new Date(clock.now()).toISOString(),
          rpcOk: true,
          notifyOk: true,
        };
      },
      { intervalMs, clock }
    );

    pollerRef.current = poller;
    poller.start();

    return () => {
      poller.stop();
      pollerRef.current = null;
    };
    // clock is intentionally stable across renders; intervalMs drives re-creation
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return { price, flash, relativeTime };
}
