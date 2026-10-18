/**
 * @jest-environment jsdom
 *
 * Fake-timer tests for useSignalPrice exponential backoff and stale flag.
 */

import { renderHook, act } from "@testing-library/react";
import {
  useSignalPrice,
  computePollDelayMs,
  SIGNAL_PRICE_MAX_BACKOFF_MS,
  type SignalPrice,
} from "@/hooks/useSignalPrice";

const BASE_PRICE: SignalPrice = {
  executionPrice: 0.4821,
  roi: 12.4,
  confidence: 78,
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

/** Advance fake timers and flush pending promise reactions from the poll. */
async function advance(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

describe("computePollDelayMs", () => {
  it("returns the base interval when there are no failures", () => {
    expect(computePollDelayMs(3000, 0)).toBe(3000);
  });

  it("doubles the interval per consecutive failure", () => {
    expect(computePollDelayMs(1000, 1)).toBe(2000);
    expect(computePollDelayMs(1000, 2)).toBe(4000);
    expect(computePollDelayMs(1000, 3)).toBe(8000);
  });

  it("caps delay at SIGNAL_PRICE_MAX_BACKOFF_MS", () => {
    expect(computePollDelayMs(3000, 20)).toBe(SIGNAL_PRICE_MAX_BACKOFF_MS);
  });

  it("never returns a delay shorter than the base interval, even above the cap", () => {
    expect(computePollDelayMs(90_000, 1)).toBe(90_000);
    expect(computePollDelayMs(90_000, 5)).toBe(90_000);
  });

  it("handles a zero base interval without going negative", () => {
    expect(computePollDelayMs(0, 3)).toBe(0);
  });
});

describe("useSignalPrice – exponential backoff and stale flag", () => {
  const INTERVAL = 1000;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("starts with stale=false", () => {
    const fetchPrice = jest.fn().mockResolvedValue({
      ...BASE_PRICE,
      updatedAt: new Date(),
    });
    const { result } = renderHook(() =>
      useSignalPrice(INTERVAL, { fetchPrice })
    );
    expect(result.current.stale).toBe(false);
  });

  it("marks stale and backs off the interval after repeated poll failures, then resets on success", async () => {
    const fetchPrice = jest.fn();

    const { result } = renderHook(() =>
      useSignalPrice(INTERVAL, { fetchPrice })
    );

    // ── Failure 1 → next delay 2× base ─────────────────────────────────────
    fetchPrice.mockRejectedValueOnce(new Error("poll failed"));
    await advance(INTERVAL);

    expect(result.current.stale).toBe(true);
    expect(fetchPrice).toHaveBeenCalledTimes(1);

    // Just under 2s backoff — must not poll yet
    fetchPrice.mockRejectedValueOnce(new Error("poll failed"));
    await advance(INTERVAL * 2 - 1);
    expect(fetchPrice).toHaveBeenCalledTimes(1);

    // ── Failure 2 at 2× base → next delay 4× base ──────────────────────────
    await advance(1);
    expect(fetchPrice).toHaveBeenCalledTimes(2);
    expect(result.current.stale).toBe(true);

    // Just under 4s — must not poll yet
    fetchPrice.mockRejectedValueOnce(new Error("poll failed"));
    await advance(INTERVAL * 4 - 1);
    expect(fetchPrice).toHaveBeenCalledTimes(2);

    // ── Failure 3 at 4× base → next delay 8× base ──────────────────────────
    await advance(1);
    expect(fetchPrice).toHaveBeenCalledTimes(3);
    expect(result.current.stale).toBe(true);

    // ── Success after 8× backoff → stale clears, interval resets to base ───
    const successPrice: SignalPrice = {
      ...BASE_PRICE,
      executionPrice: 0.5,
      updatedAt: new Date(),
    };
    fetchPrice.mockResolvedValueOnce(successPrice);
    await advance(INTERVAL * 8);

    expect(fetchPrice).toHaveBeenCalledTimes(4);
    expect(result.current.stale).toBe(false);
    expect(result.current.price.executionPrice).toBe(0.5);

    // Next poll uses the base interval again (not 8× / 16×)
    fetchPrice.mockResolvedValueOnce({
      ...successPrice,
      executionPrice: 0.51,
      updatedAt: new Date(),
    });

    await advance(INTERVAL - 1);
    expect(fetchPrice).toHaveBeenCalledTimes(4);

    await advance(1);
    expect(fetchPrice).toHaveBeenCalledTimes(5);
    expect(result.current.stale).toBe(false);
    expect(result.current.price.executionPrice).toBe(0.51);
  });

  it("caps backoff at SIGNAL_PRICE_MAX_BACKOFF_MS", async () => {
    const fetchPrice = jest
      .fn()
      .mockRejectedValue(new Error("persistent outage"));

    const { result } = renderHook(() =>
      useSignalPrice(INTERVAL, { fetchPrice })
    );

    // First poll at base interval, then each subsequent delay uses failure count.
    await advance(INTERVAL); // failure 1
    for (let failures = 1; failures < 10; failures++) {
      await advance(computePollDelayMs(INTERVAL, failures));
    }

    expect(result.current.stale).toBe(true);
    expect(computePollDelayMs(INTERVAL, 10)).toBe(SIGNAL_PRICE_MAX_BACKOFF_MS);
    expect(fetchPrice.mock.calls.length).toBe(10);
  });
});
