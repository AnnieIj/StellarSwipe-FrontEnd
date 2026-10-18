"use client";

import { useMemo } from "react";

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface PriceHistoryOptions {
  interval?: "hour" | "day" | "week";
  points?: number;
}

function generateMockPriceHistory(
  currentPrice: number,
  points: number,
  intervalMs: number
): PricePoint[] {
  const history: PricePoint[] = [];
  let price = currentPrice;
  const now = Date.now();

  for (let i = points - 1; i >= 0; i--) {
    const delta = (Math.random() - 0.48) * 0.05;
    price = Math.max(0.01, price + delta);
    history.push({
      timestamp: now - i * intervalMs,
      price: parseFloat(price.toFixed(6)),
    });
  }

  return history;
}

export function usePriceHistory(
  asset: string,
  options: PriceHistoryOptions = {}
): PricePoint[] {
  const { points = 30, interval = "day" } = options;

  return useMemo(() => {
    const currentPrice = getCurrentPrice(asset);
    const intervalMs =
      interval === "hour" ? 3600000 : interval === "day" ? 86400000 : 604800000;

    return generateMockPriceHistory(currentPrice, points, intervalMs);
  }, [asset, points, interval]);
}

function getCurrentPrice(asset: string): number {
  const basePrices: Record<string, number> = {
    XLM: 0.4821,
    USDC: 1.0,
    AQUA: 0.0085,
    yXLM: 0.51,
  };
  return basePrices[asset] ?? 0.5;
}

export function useXLMPriceHistory(
  options: PriceHistoryOptions = {}
): PricePoint[] {
  return usePriceHistory("XLM", options);
}
