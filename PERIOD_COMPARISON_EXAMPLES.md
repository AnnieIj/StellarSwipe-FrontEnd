# Period Comparison Implementation Examples

## Complete Integration Examples

### Example 1: Basic Static Implementation

For prototyping or demo purposes:

```tsx
// app/analytics/page.tsx
"use client";

import { PeriodComparisonWidget } from "@/components/comparison/PeriodComparisonWidget";

export default function AnalyticsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Portfolio Analytics</h1>

      <PeriodComparisonWidget
        // Current period metrics
        pnl={1500}
        winRate={62.5}
        totalTrades={40}

        // Prior period metrics
        priorPnl={1200}
        priorWinRate={58}
        priorTotalTrades={36}
      />
    </div>
  );
}
```

**What this shows:**
- P&L increased by $300 (25%)
- Win rate increased by 4.5%
- Total trades increased by 4

---

### Example 2: Integration with Zustand Store

```tsx
// components/analytics/AnalyticsDashboard.tsx
"use client";

import { usePortfolioStore } from "@/store/usePortfolioStore";
import { PeriodComparisonWidget } from "@/components/comparison/PeriodComparisonWidget";
import { calculateWinRate } from "@/lib/trades";

export function AnalyticsDashboard() {
  // Get current period data from store
  const { assets, totalValue } = usePortfolioStore();
  
  const currentPnL = assets.reduce((sum, a) => sum + (a.unrealizedPnL ?? 0), 0);
  const trades = getTrades(); // Your trade fetching logic
  const winRate = calculateWinRate(trades);

  // In a real app, fetch prior period data
  const priorPeriodData = usePriorPeriodData(); // Custom hook

  return (
    <PeriodComparisonWidget
      pnl={currentPnL}
      winRate={winRate}
      totalTrades={trades.length}
      priorPnl={priorPeriodData?.pnl}
      priorWinRate={priorPeriodData?.winRate}
      priorTotalTrades={priorPeriodData?.trades}
    />
  );
}
```

---

### Example 3: Full Integration with React Query

Most realistic integration with data fetching:

```tsx
// hooks/usePortfolioComparison.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { queryOptions } from "@/lib/queryOptions";
import type { ComparisonGranularity } from "@/lib/comparison";

interface MetricsSnapshot {
  pnl: number;
  winRate: number;
  totalTrades: number;
  timestamp: Date;
}

/**
 * Fetch portfolio metrics for a given period
 */
async function fetchMetrics(
  granularity: ComparisonGranularity,
  period: "current" | "prior"
): Promise<MetricsSnapshot> {
  const response = await fetch(
    `/api/portfolio/metrics?granularity=${granularity}&period=${period}`
  );
  if (!response.ok) throw new Error("Failed to fetch metrics");
  return response.json();
}

/**
 * Hook for period-over-period comparison
 */
export function usePortfolioComparison(granularity: ComparisonGranularity) {
  // Fetch current period metrics
  const { data: currentMetrics, isLoading: isLoadingCurrent } = useQuery({
    queryKey: ["portfolio-metrics", granularity, "current"],
    queryFn: () => fetchMetrics(granularity, "current"),
    ...queryOptions.portfolio,
  });

  // Fetch prior period metrics
  const { data: priorMetrics, isLoading: isLoadingPrior } = useQuery({
    queryKey: ["portfolio-metrics", granularity, "prior"],
    queryFn: () => fetchMetrics(granularity, "prior"),
    ...queryOptions.portfolio,
  });

  return {
    current: currentMetrics,
    prior: priorMetrics,
    isLoading: isLoadingCurrent || isLoadingPrior,
  };
}

// components/analytics/ComparisonSection.tsx
"use client";

import { useState } from "react";
import { PeriodComparisonWidget } from "@/components/comparison/PeriodComparisonWidget";
import { usePortfolioComparison } from "@/hooks/usePortfolioComparison";
import type { ComparisonGranularity } from "@/lib/comparison";

export function ComparisonSection() {
  const [granularity, setGranularity] = useState<ComparisonGranularity>("month");
  const { current, prior, isLoading } = usePortfolioComparison(granularity);

  if (isLoading) {
    return <div className="h-64 bg-white/10 rounded animate-pulse" />;
  }

  return (
    <PeriodComparisonWidget
      pnl={current?.pnl ?? 0}
      winRate={current?.winRate ?? 0}
      totalTrades={current?.totalTrades ?? 0}
      priorPnl={prior?.pnl}
      priorWinRate={prior?.winRate}
      priorTotalTrades={prior?.totalTrades}
    />
  );
}
```

---

### Example 4: With Additional Custom Metrics

```tsx
// components/analytics/AdvancedComparison.tsx
"use client";

import { useMemo } from "react";
import { PeriodComparisonWidget } from "@/components/comparison/PeriodComparisonWidget";
import { calculateMetrics } from "@/lib/portfolio-calculations";

interface PortfolioData {
  pnl: number;
  trades: Trade[];
  assets: Asset[];
}

export function AdvancedComparison({
  current,
  prior,
}: {
  current: PortfolioData;
  prior?: PortfolioData;
}) {
  // Calculate all metrics
  const metrics = useMemo(() => {
    const currentMetrics = calculateMetrics(current);
    const priorMetrics = prior ? calculateMetrics(prior) : null;

    return {
      current: currentMetrics,
      prior: priorMetrics,
    };
  }, [current, prior]);

  // Build additional metrics array
  const additionalMetrics = useMemo(() => {
    const metrics = [];

    // Sharpe Ratio
    if (metrics.current.sharpeRatio !== undefined) {
      metrics.push({
        label: "Sharpe Ratio",
        current: metrics.current.sharpeRatio,
        prior: metrics.prior?.sharpeRatio ?? null,
      });
    }

    // Average Trade Size
    if (metrics.current.avgTradeSize !== undefined) {
      metrics.push({
        label: "Avg Trade Size",
        current: metrics.current.avgTradeSize,
        prior: metrics.prior?.avgTradeSize ?? null,
        suffix: "USD",
      });
    }

    // Maximum Drawdown
    if (metrics.current.maxDrawdown !== undefined) {
      metrics.push({
        label: "Max Drawdown",
        current: metrics.current.maxDrawdown,
        prior: metrics.prior?.maxDrawdown ?? null,
        suffix: "%",
      });
    }

    // Return on Risk
    if (metrics.current.returnOnRisk !== undefined) {
      metrics.push({
        label: "Return on Risk",
        current: metrics.current.returnOnRisk,
        prior: metrics.prior?.returnOnRisk ?? null,
      });
    }

    return metrics;
  }, [metrics]);

  return (
    <PeriodComparisonWidget
      pnl={metrics.current.pnl}
      winRate={metrics.current.winRate}
      totalTrades={metrics.current.trades}
      priorPnl={metrics.prior?.pnl}
      priorWinRate={metrics.prior?.winRate}
      priorTotalTrades={metrics.prior?.trades}
      additionalMetrics={additionalMetrics}
    />
  );
}
```

---

### Example 5: Using Only the Calculation Layer

For custom UI or headless usage:

```tsx
// components/custom/CustomComparisonView.tsx
"use client";

import {
  createPeriodComparison,
  formatGranularityLabel,
  formatDateRange,
} from "@/lib/comparison";
import { formatNumber } from "@/lib/utils";

interface CustomComparison {
  currentPnL: number;
  priorPnL: number;
  currentWinRate: number;
  priorWinRate: number;
}

export function CustomComparisonView({
  currentPnL,
  priorPnL,
  currentWinRate,
  priorWinRate,
}: CustomComparison) {
  // Calculate comparisons using the utility
  const pnlComparison = createPeriodComparison(
    currentPnL,
    priorPnL,
    "month"
  );

  const winRateComparison = createPeriodComparison(
    currentWinRate,
    priorWinRate,
    "month"
  );

  return (
    <div className="space-y-4">
      <div>
        <h3>P&L Comparison</h3>
        <p>Current: ${formatNumber(pnlComparison.metrics.currentValue, 2)}</p>
        <p>Prior: ${formatNumber(pnlComparison.metrics.priorValue, 2)}</p>
        <p className={pnlComparison.metrics.isPositive ? "text-green-400" : "text-red-400"}>
          Change: ${formatNumber(pnlComparison.metrics.absoluteChange, 2)} 
          ({pnlComparison.metrics.percentageChange}%)
        </p>

        {!pnlComparison.currentPeriod.isComplete && (
          <p className="text-amber-400">
            ⚠️ {pnlComparison.currentPeriod.completenessPercent}% complete
          </p>
        )}
      </div>

      <div>
        <h3>Win Rate Comparison</h3>
        <p>Current: {winRateComparison.metrics.currentValue}%</p>
        <p>Prior: {winRateComparison.metrics.priorValue}%</p>
        <p>
          Change: {winRateComparison.metrics.absoluteChange}%
        </p>
      </div>

      <div className="text-xs text-foreground-muted">
        <p>Current: {formatDateRange(
          pnlComparison.currentPeriod.range.start,
          pnlComparison.currentPeriod.range.end
        )}</p>
        <p>Prior: {formatDateRange(
          pnlComparison.priorPeriod.range.start,
          pnlComparison.priorPeriod.range.end
        )}</p>
      </div>
    </div>
  );
}
```

---

### Example 6: Using Only the Selector Component

For custom layouts:

```tsx
// components/custom/CustomDashboard.tsx
"use client";

import { useState } from "react";
import { ComparisonGranularitySelector } from "@/components/comparison/ComparisonGranularitySelector";
import { ComparisonMetricCard } from "@/components/comparison/ComparisonMetricCard";
import { createComparisonMetrics } from "@/lib/comparison";
import type { ComparisonGranularity } from "@/lib/comparison";

export function CustomDashboard() {
  const [granularity, setGranularity] = useState<ComparisonGranularity>("month");

  // Your data fetching logic here
  const currentMetrics = { pnl: 1500, winRate: 62.5, trades: 40 };
  const priorMetrics = { pnl: 1200, winRate: 58, trades: 36 };

  // Create comparison metrics
  const pnlMetrics = createComparisonMetrics(currentMetrics.pnl, priorMetrics.pnl);
  const winRateMetrics = createComparisonMetrics(currentMetrics.winRate, priorMetrics.winRate);
  const tradeMetrics = createComparisonMetrics(currentMetrics.trades, priorMetrics.trades);

  return (
    <div className="space-y-4">
      {/* Custom header with selector */}
      <div className="flex items-center justify-between">
        <h2>Portfolio Metrics</h2>
        <ComparisonGranularitySelector
          value={granularity}
          onChange={setGranularity}
        />
      </div>

      {/* Custom grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ComparisonMetricCard
          label="P&L"
          metrics={pnlMetrics}
          formatValue={(v) => `$${v.toFixed(0)}`}
        />
        <ComparisonMetricCard
          label="Win Rate"
          metrics={winRateMetrics}
          formatValue={(v) => `${v.toFixed(1)}%`}
          showAbsoluteOnly
        />
        <ComparisonMetricCard
          label="Total Trades"
          metrics={tradeMetrics}
          formatValue={(v) => Math.round(v).toString()}
        />
      </div>
    </div>
  );
}
```

---

### Example 7: Using Only Metric Card

For displaying a single metric:

```tsx
// components/custom/MetricDisplay.tsx
"use client";

import { ComparisonMetricCard } from "@/components/comparison/ComparisonMetricCard";
import { createComparisonMetrics } from "@/lib/comparison";

interface MetricDisplayProps {
  label: string;
  current: number;
  prior: number | null;
  formatValue?: (value: number) => string;
  suffix?: string;
}

export function MetricDisplay({
  label,
  current,
  prior,
  formatValue = (v) => v.toString(),
  suffix,
}: MetricDisplayProps) {
  const metrics = createComparisonMetrics(current, prior);

  return (
    <ComparisonMetricCard
      label={label}
      metrics={metrics}
      formatValue={formatValue}
      suffix={suffix}
    />
  );
}

// Usage:
<MetricDisplay
  label="Daily P&L"
  current={250}
  prior={200}
  formatValue={(v) => `$${v.toFixed(2)}`}
  suffix="USD"
/>
```

---

## Testing Examples

### Unit Test for Custom Implementation

```tsx
// __tests__/CustomComparison.test.ts
import { createPeriodComparison } from "@/lib/comparison";

describe("CustomComparison", () => {
  it("calculates correct comparison", () => {
    const comparison = createPeriodComparison(
      1500,  // current
      1200,  // prior
      "month"
    );

    expect(comparison.metrics.percentageChange).toBe(25);
    expect(comparison.metrics.absoluteChange).toBe(300);
    expect(comparison.metrics.isPositive).toBe(true);
  });

  it("detects incomplete periods", () => {
    const now = new Date();
    const midMonth = new Date(now.getFullYear(), now.getMonth(), 15);
    
    const comparison = createPeriodComparison(
      1500,
      1200,
      "month",
      midMonth
    );

    expect(comparison.currentPeriod.isComplete).toBe(false);
    expect(comparison.currentPeriod.completenessPercent).toBeGreaterThan(0);
    expect(comparison.currentPeriod.completenessPercent).toBeLessThan(100);
  });

  it("handles missing prior data", () => {
    const comparison = createPeriodComparison(1500, null, "month");

    expect(comparison.metadata.hasNoPriorData).toBe(true);
    expect(comparison.metrics.priorValue).toBe(0);
    expect(comparison.metrics.percentageChange).toBe(0);
  });
});
```

### Component Test

```tsx
// __tests__/ComparisonSection.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ComparisonSection } from "@/components/analytics/ComparisonSection";

jest.mock("@/hooks/usePortfolioComparison", () => ({
  usePortfolioComparison: () => ({
    current: {
      pnl: 1500,
      winRate: 62.5,
      totalTrades: 40,
    },
    prior: {
      pnl: 1200,
      winRate: 58,
      totalTrades: 36,
    },
    isLoading: false,
  }),
}));

describe("ComparisonSection", () => {
  it("renders comparison widget", () => {
    render(<ComparisonSection />);
    expect(screen.getByText("Period Comparison")).toBeInTheDocument();
  });

  it("can change granularity", async () => {
    const user = userEvent.setup();
    render(<ComparisonSection />);

    const selector = screen.getByRole("button", {
      name: /select period-over-period comparison granularity/i,
    });

    await user.click(selector);
    await waitFor(() => {
      const weekOption = screen.getByText("Week-over-Week");
      expect(weekOption).toBeInTheDocument();
    });
  });
});
```

---

## API Integration Pattern

If you have backend endpoints for metrics:

```typescript
// lib/api.ts - Add these endpoints
export async function fetchMetrics(
  granularity: ComparisonGranularity,
  period: "current" | "prior"
): Promise<MetricsSnapshot> {
  const params = new URLSearchParams({
    granularity,
    period,
  });

  return apiFetch<MetricsSnapshot>(
    `/api/portfolio/metrics?${params.toString()}`
  );
}

// Backend endpoint structure (example)
// GET /api/portfolio/metrics?granularity=month&period=current
// {
//   "pnl": 1500,
//   "winRate": 62.5,
//   "totalTrades": 40,
//   "timestamp": "2024-06-30T23:59:59Z"
// }
```

---

## Performance Optimization

```tsx
// Memoized comparison calculations
import { useMemo } from "react";
import { createPeriodComparison } from "@/lib/comparison";
import type { ComparisonGranularity } from "@/lib/comparison";

export function OptimizedComparison({
  pnl,
  priorPnl,
  granularity,
}: {
  pnl: number;
  priorPnl: number | null;
  granularity: ComparisonGranularity;
}) {
  // Only recalculate when values actually change
  const comparison = useMemo(
    () => createPeriodComparison(pnl, priorPnl, granularity),
    [pnl, priorPnl, granularity]
  );

  return (
    <ComparisonMetricCard
      label="P&L"
      metrics={comparison.metrics}
    />
  );
}
```

All these examples demonstrate how flexible the period comparison system is. Mix and match based on your needs!
