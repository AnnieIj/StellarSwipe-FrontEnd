"use client";

import { useState, useMemo } from "react";
import { Eye, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOCALE_BCP47, type Locale } from "@/lib/i18n";
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatCompactNumber,
} from "@/lib/localeFormatter";

/** Representative product values used across all preview rows. */
const PREVIEW_VALUES = {
  price: 1234567.89,
  pct: 0.04213,      // 4.213%
  pctNeg: -0.00852,  // −0.852%
  count: 1_500_000,
  decimal: 9876.54321,
} as const;

const LOCALE_LABELS: Record<Locale, { label: string; native: string }> = {
  en: { label: "English (US)", native: "English" },
  ng: { label: "Yoruba (Nigeria)", native: "Yorùbá" },
  es: { label: "Spanish (Spain)", native: "Español" },
  fr: { label: "French (France)", native: "Français" },
  de: { label: "German (Germany)", native: "Deutsch" },
  zh: { label: "Chinese (Simplified)", native: "中文" },
  ar: { label: "Arabic (Saudi Arabia)", native: "العربية" },
};

const UNSUPPORTED_LOCALES_INFO: Partial<Record<Locale, string>> = {
  ng: "Yoruba (yo-NG) has limited Intl support in some environments. Currency symbols may fall back to ISO codes.",
};

export interface LocaleNumberFormatPreviewProps {
  /** Currently selected locale — the row for this locale is highlighted. */
  selectedLocale: Locale;
  /** Called when the user picks a different locale from the preview list. */
  onSelectLocale?: (locale: Locale) => void;
  /** Extra Tailwind classes on the outer wrapper. */
  className?: string;
}

/**
 * LocaleNumberFormatPreview
 *
 * Shows how numbers, percentages, and large values are formatted for each
 * supported locale. Lets the user pick a locale from the preview list and see
 * real separator, decimal, and negative-value rendering before committing.
 *
 * - All preview rows use representative product values (not hard-coded strings).
 * - Unsupported locales receive a clear fallback explanation below the table.
 * - The selected locale row is highlighted and accessible via aria-selected.
 */
export function LocaleNumberFormatPreview({
  selectedLocale,
  onSelectLocale,
  className,
}: LocaleNumberFormatPreviewProps) {
  const locales = Object.keys(LOCALE_LABELS) as Locale[];

  /** Attempt to format using the locale; return a fallback on error. */
  const safeFmt = useMemo(
    () =>
      (fn: () => string, fallback = "—"): string => {
        try {
          const result = fn();
          return result === "-" ? fallback : result;
        } catch {
          return fallback;
        }
      },
    []
  );

  const rows = useMemo(
    () =>
      locales.map((locale) => {
        const bcp47 = LOCALE_BCP47[locale];
        return {
          locale,
          currency: safeFmt(() =>
            formatCurrency(PREVIEW_VALUES.price, "USD", bcp47)
          ),
          pctPos: safeFmt(() => formatPercent(PREVIEW_VALUES.pct, 2, bcp47)),
          pctNeg: safeFmt(() => formatPercent(PREVIEW_VALUES.pctNeg, 3, bcp47)),
          compact: safeFmt(() => formatCompactNumber(PREVIEW_VALUES.count, bcp47)),
          number: safeFmt(() =>
            formatNumber(PREVIEW_VALUES.decimal, { decimals: 2 })
          ),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const unsupportedNote = UNSUPPORTED_LOCALES_INFO[selectedLocale];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Eye size={14} aria-hidden="true" />
        <span>Number format preview</span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        How values appear in the selected locale. Separators, decimal precision,
        and negative values are shown with representative product figures.
      </p>

      {/* Preview table */}
      <div
        role="listbox"
        aria-label="Select locale to preview number formatting"
        className="overflow-x-auto rounded-xl border border-border"
      >
        <table className="w-full min-w-[600px] text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Locale</th>
              <th className="px-3 py-2 font-medium">
                Currency
                <span className="ml-1 font-normal normal-case opacity-60">
                  (1 234 567.89)
                </span>
              </th>
              <th className="px-3 py-2 font-medium">
                Percent
                <span className="ml-1 font-normal normal-case opacity-60">
                  (+4.21%)
                </span>
              </th>
              <th className="px-3 py-2 font-medium">
                Negative %
                <span className="ml-1 font-normal normal-case opacity-60">
                  (−0.85%)
                </span>
              </th>
              <th className="px-3 py-2 font-medium">
                Compact
                <span className="ml-1 font-normal normal-case opacity-60">
                  (1.5M)
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ locale, currency, pctPos, pctNeg, compact }) => {
              const isSelected = locale === selectedLocale;
              const labels = LOCALE_LABELS[locale];

              return (
                <tr
                  key={locale}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onSelectLocale?.(locale)}
                  tabIndex={onSelectLocale ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (onSelectLocale && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onSelectLocale(locale);
                    }
                  }}
                  className={cn(
                    "border-b border-border last:border-0 transition-colors",
                    onSelectLocale && "cursor-pointer focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "bg-blue-500/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {isSelected && (
                        <CheckCircle2
                          size={12}
                          className="shrink-0 text-blue-400"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={cn(
                          "font-medium",
                          isSelected ? "text-foreground" : ""
                        )}
                      >
                        {labels.native}
                      </span>
                      <span className="hidden text-[10px] text-muted-foreground sm:inline">
                        {labels.label}
                      </span>
                    </div>
                  </td>
                  <td
                    className="px-3 py-2.5 font-mono tabular-nums"
                    dir={locale === "ar" ? "rtl" : "ltr"}
                  >
                    {currency}
                  </td>
                  <td className="px-3 py-2.5 font-mono tabular-nums text-emerald-500">
                    {pctPos}
                  </td>
                  <td className="px-3 py-2.5 font-mono tabular-nums text-red-400">
                    {pctNeg}
                  </td>
                  <td className="px-3 py-2.5 font-mono tabular-nums">
                    {compact}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Unsupported locale notice */}
      {unsupportedNote && (
        <div
          role="note"
          className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-600 dark:text-amber-400"
        >
          <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{unsupportedNote}</span>
        </div>
      )}

      {/* Currently selected info */}
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {LOCALE_LABELS[selectedLocale].label}
        </span>{" "}
        is applied to all numeric displays in the app.
      </p>
    </div>
  );
}
