"use client";

import { useState, useCallback } from "react";

export type StopLossMode = "fixed" | "trailing";

interface UseStopLossOptions {
  /** Initial stop-loss percentage. Default: 5 */
  initialValue?: number;
  /** Entry price of the asset being traded */
  entryPrice?: number;
  /** Whether to start in fixed or trailing mode. Default: "fixed" */
  initialMode?: StopLossMode;
}

interface UseStopLossReturn {
  /** Current stop-loss percentage (0–100) */
  stopLossPercent: number;
  /**
   * Derived stop-loss price:
   * - fixed mode:    entryPrice × (1 − stopLossPercent / 100)
   * - trailing mode: highWaterMark × (1 − stopLossPercent / 100)
   *   The stop level rises as the high-water mark increases, but never falls.
   */
  stopLossPrice: number | null;
  /** Active stop-loss mode */
  stopLossMode: StopLossMode;
  /**
   * The highest price seen since tracking began (trailing mode only).
   * Equals entryPrice initially; only moves upward.
   */
  highWaterMark: number | null;
  /** Update the stop-loss percentage */
  setStopLossPercent: (value: number) => void;
  /** Switch between fixed and trailing modes */
  setStopLossMode: (mode: StopLossMode) => void;
  /**
   * Call with the latest market price to update the high-water mark.
   * Only relevant in trailing mode; safe to call in either mode.
   * The high-water mark only moves upward — it never decreases.
   */
  updateCurrentPrice: (price: number) => void;
  /** Reset percentage and high-water mark to initial values */
  reset: () => void;
}

/**
 * useStopLoss — manages stop-loss state in either fixed or trailing mode.
 *
 * Fixed mode: stop price is anchored to the entry price and does not move
 * as the market price changes.
 *
 * Trailing mode: the stop price is anchored to a high-water mark that rises
 * with the market price (last-write-wins upward). If the price falls, the
 * high-water mark — and therefore the stop level — remains at its peak.
 * This lets profits run while protecting against reversals.
 */
export function useStopLoss(
  options: UseStopLossOptions = {}
): UseStopLossReturn {
  const { initialValue = 5, entryPrice, initialMode = "fixed" } = options;

  const [stopLossPercent, setStopLossPercent] = useState<number>(initialValue);
  const [stopLossMode, setStopLossMode] = useState<StopLossMode>(initialMode);
  // High-water mark starts at entryPrice; null when no entryPrice is provided.
  const [highWaterMark, setHighWaterMark] = useState<number | null>(
    entryPrice != null ? entryPrice : null
  );

  const stopLossPrice = (() => {
    if (stopLossMode === "trailing") {
      return highWaterMark != null
        ? highWaterMark * (1 - stopLossPercent / 100)
        : null;
    }
    // fixed mode
    return entryPrice != null ? entryPrice * (1 - stopLossPercent / 100) : null;
  })();

  // Update the high-water mark only upward so the trailing stop never retreats.
  const updateCurrentPrice = useCallback((price: number) => {
    setHighWaterMark((prev) => (prev === null || price > prev ? price : prev));
  }, []);

  const reset = useCallback(() => {
    setStopLossPercent(initialValue);
    setHighWaterMark(entryPrice != null ? entryPrice : null);
  }, [initialValue, entryPrice]);

  return {
    stopLossPercent,
    stopLossPrice,
    stopLossMode,
    highWaterMark,
    setStopLossPercent,
    setStopLossMode,
    updateCurrentPrice,
    reset,
  };
}
