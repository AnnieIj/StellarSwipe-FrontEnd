/**
 * Locale-aware formatting utilities.
 * Provides consistent formatting for currency, percentages, and numbers across the UI.
 *
 * Usage:
 *   const { formatCurrency, formatPercent, formatCompactNumber } = useLocaleFormatter();
 *   <span>{formatCurrency(1234.56, 'USD')}</span>  // $1,234.56 (en-US)
 *   <span>{formatPercent(0.421, 2)}</span>         // 42.10%
 *   <span>{formatCompactNumber(1500000)}</span>    // 1.5M
 */

import { getCurrentLocale, LOCALE_BCP47 } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

export interface FormatterOptions {
  decimals?: number;
  compact?: boolean;
  abbreviate?: boolean;
}

/**
 * Formats a number as currency with locale support.
 * Returns immediately - does not depend on React hooks.
 *
 * @example
 * formatCurrency(1234.56, 'USD', 'en-US')  // "$1,234.56"
 * formatCurrency(1234.56, 'EUR', 'de-DE')  // "1.234,56 €"
 */
export function formatCurrency(
  value: number,
  currency: string = "USD",
  locale?: Locale | string
): string {
  const localeTag = typeof locale === "string" 
    ? locale 
    : LOCALE_BCP47[locale || (getCurrentLocale() as Locale)];

  if (isNaN(value)) return "-";

  return new Intl.NumberFormat(localeTag, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formats a decimal as a percentage with locale support.
 * 
 * @example
 * formatPercent(0.421, 2)      // "42.10%"
 * formatPercent(0.8, 0)        // "80%"
 * formatPercent(0.0001234, 4)  // "0.0123%"
 */
export function formatPercent(
  value: number,
  decimals: number = 2,
  locale?: Locale | string
): string {
  const localeTag = typeof locale === "string" 
    ? locale 
    : LOCALE_BCP47[locale || (getCurrentLocale() as Locale)];

  if (isNaN(value)) return "-";

  return new Intl.NumberFormat(localeTag, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formats a number with thousands separators and optional decimals.
 * 
 * @example
 * formatNumber(1234567.89, { decimals: 2 })  // "1,234,567.89"
 * formatNumber(1234567, { decimals: 0 })     // "1,234,567"
 */
export function formatNumber(
  value: number,
  options: FormatterOptions = {}
): string {
  const { decimals = 2 } = options;
  
  if (isNaN(value)) return "-";

  const locale = getCurrentLocale() as Locale;
  const localeTag = LOCALE_BCP47[locale];

  return new Intl.NumberFormat(localeTag, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formats a number using compact notation (e.g., "1.5M", "2.3K").
 * Useful for very large numbers to prevent layout issues.
 * 
 * @example
 * formatCompactNumber(1234567)      // "1.2M"
 * formatCompactNumber(1234)         // "1.2K"
 * formatCompactNumber(42)           // "42"
 */
export function formatCompactNumber(
  value: number,
  locale?: Locale | string
): string {
  const localeTag = typeof locale === "string" 
    ? locale 
    : LOCALE_BCP47[locale || (getCurrentLocale() as Locale)];

  if (isNaN(value)) return "-";

  return new Intl.NumberFormat(localeTag, {
    notation: "compact",
    compactDisplay: "short",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Formats a large count (e.g., user rankings, follower counts).
 * Uses compact notation if number is large, otherwise standard formatting.
 * 
 * @example
 * formatCount(42)       // "42"
 * formatCount(1234)     // "1.2K"
 * formatCount(1000000)  // "1M"
 */
export function formatCount(value: number, locale?: Locale | string): string {
  if (isNaN(value)) return "-";
  
  // Use compact notation for large numbers
  if (Math.abs(value) >= 1000) {
    return formatCompactNumber(value, locale);
  }
  
  const localeTag = typeof locale === "string" 
    ? locale 
    : LOCALE_BCP47[locale || (getCurrentLocale() as Locale)];

  return new Intl.NumberFormat(localeTag, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats a value with a unit suffix (e.g., "12 XLM", "2.5 GB").
 * Prevents line wrapping by using non-breaking space.
 * 
 * @example
 * formatWithUnit(12, "XLM")      // "12 XLM"
 * formatWithUnit(2.5, "GB")      // "2.5 GB"
 */
export function formatWithUnit(
  value: number,
  unit: string,
  options: FormatterOptions = {}
): string {
  if (isNaN(value)) return "-";
  
  const formatted = formatNumber(value, options);
  return `${formatted}\u00A0${unit}`; // \u00A0 is non-breaking space
}
