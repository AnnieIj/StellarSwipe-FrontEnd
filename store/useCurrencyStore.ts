"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DisplayCurrency = "USD" | "EUR" | "GBP" | "JPY" | "BTC" | "ETH";

/** Static exchange rates relative to USD */
export const EXCHANGE_RATES: Record<DisplayCurrency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  BTC: 0.0000159,
  ETH: 0.000385,
};

export const CURRENCY_SYMBOLS: Record<DisplayCurrency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  BTC: "₿",
  ETH: "Ξ",
};

export const CURRENCY_LABELS: Record<DisplayCurrency, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  BTC: "Bitcoin",
  ETH: "Ethereum",
};

interface CurrencyState {
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: "USD",
      setCurrency: (currency) => set({ currency }),
    }),
    { name: "stellar-currency" }
  )
);
