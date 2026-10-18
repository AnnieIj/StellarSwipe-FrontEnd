"use client";

import { useState } from "react";
import { DollarSign, ChevronDown } from "lucide-react";
import {
  useCurrencyStore,
  CURRENCY_SYMBOLS,
  CURRENCY_LABELS,
  type DisplayCurrency,
} from "@/store/useCurrencyStore";

const CURRENCIES: DisplayCurrency[] = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "BTC",
  "ETH",
];

interface CurrencySelectorProps {
  className?: string;
}

export function CurrencySelector({ className }: CurrencySelectorProps) {
  const { currency, setCurrency } = useCurrencyStore();
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        aria-label={`Display currency: ${currency}. Click to change.`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground/5 px-3 py-1 text-xs font-medium text-foreground-muted transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <DollarSign size={12} aria-hidden="true" />
        <span>{currency}</span>
        <ChevronDown
          size={10}
          aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            aria-label="Select display currency"
            className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-border bg-card p-1 shadow-lg"
          >
            {CURRENCIES.map((c) => (
              <button
                key={c}
                role="option"
                aria-selected={currency === c}
                onClick={() => {
                  setCurrency(c);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded px-3 py-2 text-sm transition-colors ${
                  currency === c
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span className="font-medium">
                  {CURRENCY_SYMBOLS[c]} {c}
                </span>
                <span className="text-xs text-muted-foreground">
                  {CURRENCY_LABELS[c]}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
