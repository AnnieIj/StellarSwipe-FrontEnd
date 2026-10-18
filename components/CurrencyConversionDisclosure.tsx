"use client";

import { useState, useCallback } from "react";
import { Info, AlertTriangle, RefreshCw, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CURRENCY_SYMBOLS,
  CURRENCY_LABELS,
  EXCHANGE_RATES,
  type DisplayCurrency,
} from "@/store/useCurrencyStore";

export interface CurrencyConversionDisclosureProps {
  /** The display currency currently in use (e.g. "EUR"). */
  displayCurrency: DisplayCurrency;
  /**
   * The original base currency the underlying data is denominated in (e.g. "USD").
   * If not provided, assumes USD.
   */
  baseCurrency?: DisplayCurrency;
  /**
   * ISO 8601 timestamp of when the conversion rates were last refreshed.
   * Pass null or undefined to render a "data unavailable" fallback.
   */
  rateTimestamp?: string | null;
  /** Extra Tailwind classes on the outer wrapper. */
  className?: string;
}

const BASE_RATE_CURRENCY: DisplayCurrency = "USD";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function isStalerThan(iso: string, minutes: number): boolean {
  return Date.now() - new Date(iso).getTime() > minutes * 60_000;
}

/**
 * CurrencyConversionDisclosure
 *
 * Renders a compact, inline disclosure panel on performance cards that explains:
 * - Which display currency is in use.
 * - The conversion basis (rate relative to USD).
 * - Data freshness (how old the conversion rate is).
 *
 * Users can toggle expanded details without leaving the page.
 * Missing / stale conversion data renders a distinct fallback state.
 *
 * Accessible labels include the currency context, not only the number.
 */
export function CurrencyConversionDisclosure({
  displayCurrency,
  baseCurrency = BASE_RATE_CURRENCY,
  rateTimestamp,
  className,
}: CurrencyConversionDisclosureProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => setExpanded((v) => !v), []);

  // Derive conversion rate: always relative to USD internally.
  const rate = EXCHANGE_RATES[displayCurrency];
  const baseRate = EXCHANGE_RATES[baseCurrency];
  // Effective rate from baseCurrency → displayCurrency
  const effectiveRate = rate / baseRate;

  const hasMissingData = !rateTimestamp;
  const isStale = rateTimestamp ? isStalerThan(rateTimestamp, 60) : false;

  const displaySymbol = CURRENCY_SYMBOLS[displayCurrency];
  const displayLabel = CURRENCY_LABELS[displayCurrency];
  const baseSymbol = CURRENCY_SYMBOLS[baseCurrency];

  // ── Missing data fallback ─────────────────────────────────────────────────
  if (hasMissingData) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-xs text-amber-600 dark:text-amber-400",
          className
        )}
        role="note"
        aria-label="Currency conversion data unavailable"
      >
        <AlertTriangle size={12} className="shrink-0" aria-hidden="true" />
        <span>
          Conversion rates unavailable — values shown in{" "}
          <span className="font-medium">{baseCurrency}</span>.
        </span>
      </div>
    );
  }

  const freshness = relativeTime(rateTimestamp);

  return (
    <div className={cn("text-xs", className)}>
      {/* ── Collapsed trigger row ─────────────────────────────────────── */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls="currency-disclosure-panel"
        aria-label={`Currency context: values in ${displayLabel}. ${expanded ? "Hide" : "Show"} details.`}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left transition-colors",
          "text-muted-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          expanded && "bg-muted/40"
        )}
      >
        <Info size={12} className="shrink-0" aria-hidden="true" />
        <span>
          Shown in{" "}
          <span className="font-medium text-foreground">
            {displaySymbol} {displayCurrency}
          </span>
        </span>
        {isStale && (
          <span
            aria-label="Rate data may be stale"
            className="ml-auto flex items-center gap-0.5 text-amber-500"
          >
            <RefreshCw size={10} aria-hidden="true" />
            <span className="text-[10px]">Stale</span>
          </span>
        )}
        {!isStale && (
          <span className="ml-auto text-[10px] text-muted-foreground/70">
            {freshness}
          </span>
        )}
        <ChevronDown
          size={12}
          aria-hidden="true"
          className={cn(
            "shrink-0 transition-transform duration-150",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* ── Expanded detail panel ─────────────────────────────────────── */}
      {expanded && (
        <div
          id="currency-disclosure-panel"
          role="region"
          aria-label="Currency conversion details"
          className="mt-1 rounded-lg border border-border bg-card px-3 py-3 space-y-3"
        >
          {/* Display currency */}
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              Display currency
            </p>
            <p className="text-foreground font-medium">
              {displaySymbol} {displayCurrency}{" "}
              <span className="font-normal text-muted-foreground">
                — {displayLabel}
              </span>
            </p>
          </div>

          {/* Conversion basis */}
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              Conversion basis
            </p>
            {displayCurrency === baseCurrency ? (
              <p className="text-muted-foreground">
                No conversion — values are already in {baseCurrency}.
              </p>
            ) : (
              <p className="tabular-nums text-foreground">
                1 {baseSymbol} {baseCurrency} ={" "}
                <span className="font-semibold">
                  {effectiveRate < 0.001
                    ? effectiveRate.toExponential(4)
                    : effectiveRate.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}{" "}
                  {displaySymbol} {displayCurrency}
                </span>
              </p>
            )}
          </div>

          {/* Data freshness */}
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              Rate freshness
            </p>
            <div className="flex items-center gap-1.5">
              {isStale ? (
                <>
                  <RefreshCw
                    size={11}
                    className="text-amber-500"
                    aria-hidden="true"
                  />
                  <span className="text-amber-600 dark:text-amber-400">
                    Updated {freshness} — may not reflect the latest market rates
                  </span>
                </>
              ) : (
                <>
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground">
                    Updated {freshness}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Accessible disclosure note */}
          <p className="border-t border-border pt-2.5 text-[11px] leading-relaxed text-muted-foreground">
            All performance figures on this card include the currency context
            above in their accessible labels. Exchange rates are indicative and
            for display purposes only.
          </p>
        </div>
      )}
    </div>
  );
}
