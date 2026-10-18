# Locale-Aware Formatting Integration Guide

## Overview

This guide shows how to use the new `useLocaleFormatter` hook and `lib/localeFormatter.ts` utilities to ensure consistent, locale-aware formatting across the StellarSwipe UI.

## Problem Solved

Previously, the app had formatting inconsistencies:

```tsx
// ❌ INCONSISTENT: Using browser default locale
const price = (1234.56).toLocaleString("en-US"); // Always en-US

// ❌ INCONSISTENT: Using lib/utils formatNumber (ignores current locale)
import { formatNumber } from "@/lib/utils";
const pct = formatNumber(0.421) + "%"; // Uses browser locale, not app locale

// ✅ NEW: Using useLocaleFormatter hook (respects current app locale)
const { formatCurrency, formatPercent } = useLocaleFormatter();
const price = formatCurrency(1234.56, "USD");  // Respects app locale
const pct = formatPercent(0.421, 2);           // Respects app locale
```

## Quick Start

### 1. Basic Usage in Components

```tsx
"use client";

import { useLocaleFormatter } from "@/hooks/useLocaleFormatter";

export function PriceCard() {
  const { formatCurrency, formatPercent } = useLocaleFormatter();

  return (
    <div>
      <p>Total Value: {formatCurrency(1234.56, "USD")}</p>
      <p>Return: {formatPercent(0.0842, 2)}</p>
    </div>
  );
}
```

### 2. Different Locales Example

```tsx
// User sets locale to German (de)
// All formatters automatically use de-DE:

formatCurrency(1234.56, "USD")  // "1.234,56 $" (German format)
formatPercent(0.5, 2)            // "50,00%" (German format)
formatNumber(1000, { decimals: 2 }) // "1.000,00"
```

## Available Formatters

### `formatCurrency(value, currency, locale?)`

Formats a number as currency with locale-specific symbols and separators.

```tsx
const { formatCurrency } = useLocaleFormatter();

// Auto-uses current app locale
formatCurrency(1234.56, "USD")      // en-US: "$1,234.56"
formatCurrency(1234.56, "USD")      // de-DE: "1.234,56 $"
formatCurrency(1234.56, "EUR")      // fr-FR: "1 234,56 €"

// Can override locale if needed (rare)
formatCurrency(1234.56, "USD", "ja-JP")  // "¥1,234"
```

### `formatPercent(value, decimals?, locale?)`

Formats a decimal value (0-1) as a percentage.

```tsx
const { formatPercent } = useLocaleFormatter();

formatPercent(0.421, 2)    // "42.10%"
formatPercent(0.5, 0)      // "50%"
formatPercent(0.0001, 4)   // "0.0100%"
```

### `formatNumber(value, options?)`

Formats a number with thousands separators and optional decimals.

```tsx
const { formatNumber } = useLocaleFormatter();

formatNumber(1234567.89)           // "1,234,567.89"
formatNumber(1000, { decimals: 0 }) // "1,000"
```

### `formatCompact(value)`

Uses compact notation for large numbers (K, M, B).

```tsx
const { formatCompact } = useLocaleFormatter();

formatCompact(1234)          // "1.2K"
formatCompact(1234567)       // "1.2M"
formatCompact(1234567890)    // "1.2B"
```

### `formatCount(value)`

Smart counter formatter: uses compact notation for large numbers only.

```tsx
const { formatCount } = useLocaleFormatter();

formatCount(42)              // "42"
formatCount(1234)            // "1.2K"
formatCount(1234567)         // "1.2M"
```

### `formatWithUnit(value, unit, options?)`

Formats a number with a unit suffix, using non-breaking space to prevent wrapping.

```tsx
const { formatWithUnit } = useLocaleFormatter();

formatWithUnit(12, "XLM")           // "12 XLM" (no wrap)
formatWithUnit(2.5, "GB", { decimals: 1 }) // "2.5 GB"
```

## Integration Checklist

### Components using `toLocaleString()` directly:

Replace:
```tsx
// ❌ Before: Hardcoded locale or browser default
{value.toLocaleString("en-US", { style: "currency", currency: "USD" })}
```

With:
```tsx
// ✅ After: Uses current app locale
const { formatCurrency } = useLocaleFormatter();
{formatCurrency(value, "USD")}
```

**Files to update** (from grep results):
- `components/chart/PnLWidget.tsx` – uses `toLocaleString("en-US")`
- `components/chart/PortfolioAllocationChart.tsx` – hardcoded "en-US"
- `components/PortfolioSummaryCards.tsx` – hardcoded `toLocaleString`
- `components/PremiumSignalBadge.tsx` – uses `toLocaleString()`
- `components/SignalCard.tsx` – uses `toLocaleString()`
- `components/StakeBadge.tsx` – multiple instances

### Components using `lib/utils.formatNumber()`:

Replace:
```tsx
// ❌ Before: Uses browser locale, not app locale
import { formatNumber } from "@/lib/utils";
{formatNumber(entry.returnPct)}%
```

With:
```tsx
// ✅ After: Respects current app locale
const { formatPercent } = useLocaleFormatter();
{formatPercent(entry.returnPct / 100, 2)}
```

**Files to update** (from grep results):
- `components/Leaderboard.tsx` – uses `lib/utils.formatNumber()`
- `components/LeaderboardCompact.tsx` – uses `lib/utils.formatNumber()`

## Testing Across Locales

The test suite covers multiple locales automatically:

```tsx
// Test formatCurrency in different locales
test("Currency formatting for en-US", () => {
  expect(formatCurrency(1234.56, "USD", "en-US")).toBe("$1,234.56");
});

test("Currency formatting for de-DE", () => {
  const result = formatCurrency(1234.56, "EUR", "de-DE");
  expect(result).toContain("1");
  expect(result).toContain("EUR");
});
```

Run tests:
```bash
npm run test -- lib/__tests__/localeFormatter.test.ts
npm run test -- hooks/__tests__/useLocaleFormatter.test.ts
```

## Best Practices

### ✅ DO:

```tsx
// Use the hook at component level
const { formatCurrency, formatPercent } = useLocaleFormatter();

// Handle NaN gracefully (returns "-")
const value = apiData?.price ?? NaN;
const formatted = formatCurrency(value, "USD"); // Safe

// Use compact notation for large lists to prevent wrapping
const { formatCount } = useLocaleFormatter();
<span>{formatCount(1500000)}</span>  // "1.5M" instead of "1,500,000"

// Use non-breaking spaces for units
const { formatWithUnit } = useLocaleFormatter();
<span>{formatWithUnit(100, "XLM")}</span>  // Prevents "100" / "XLM" wrap
```

### ❌ DON'T:

```tsx
// Don't hardcode locales
formatCurrency(value, "USD", "en-US")  // Ignores user's locale

// Don't mix formatters
const { formatCurrency } = useLocaleFormatter();
const price = (value).toLocaleString();  // Inconsistent!

// Don't use toLocaleString() without locale parameter
{value.toLocaleString()}  // Uses browser locale, not app locale
```

## Locale Support

Current supported locales and their BCP-47 tags:

| Locale | BCP-47 Tag | Currency Example | Number Format |
|--------|-----------|-----------------|---------------|
| English | en-US | $1,234.56 | 1,234.56 |
| German | de-DE | 1.234,56 € | 1.234,56 |
| Spanish | es-ES | 1.234,56 € | 1.234,56 |
| French | fr-FR | 1 234,56 € | 1 234,56 |
| Chinese | zh-CN | ¥1,234.56 | 1,234.56 |
| Yoruba | yo-NG | ₦1,234.56 | 1,234.56 |
| Arabic | ar-SA | ر.س.‏ 1,234.56 | ١٬٢٣٤٫٥٦ (RTL) |

## FAQ

**Q: Why use `useLocaleFormatter` instead of calling formatters directly?**
A: The hook ensures formatters respond to locale changes. Direct function calls use the locale at call time only.

**Q: Can I specify a different currency/locale than the current app locale?**
A: Yes, for rare cases (e.g., showing historical data in original currency):
```tsx
formatCurrency(value, "EUR", "de-DE")  // Override locale
```

**Q: What about date formatting?**
A: The existing `useI18n` hook already provides `formatDate()`. Consider adding to this system in next phase.

**Q: Does this prevent layout shifts on locale change?**
A: Yes! Formatters use consistent sizing. Non-breaking spaces prevent wrapping mid-value+unit.

## Migration Timeline

- **Phase 1 (10%)**: Foundation (✅ Complete)
  - Core formatters: `formatCurrency`, `formatPercent`, `formatNumber`, `formatCompact`
  - Hook: `useLocaleFormatter`
  - Tests for all formatters across locales

- **Phase 2 (40%)**: Component Integration
  - Update Leaderboard, LeaderboardCompact, PortfolioSummaryCards
  - Update PremiumSignalBadge, StakeBadge, SignalCard
  - Update PnLWidget, PortfolioAllocationChart

- **Phase 3 (40%)**: Extended Features
  - Add `formatPercentChange()` for +/- deltas
  - Add `formatReturnRate()` for investment returns
  - Add `formatPriceChange()` with color/arrow indicators
  - Performance: Memoize formatters for lists

- **Phase 4 (10%)**: Settings & Analytics
  - Settings UI to override number format preferences (spacing, decimal sep)
  - Analytics: Track locale changes and formatting errors
  - Documentation: Add to component storybook
