# Period-over-Period Comparison Implementation Guide

## Overview

This implementation adds comprehensive period-over-period (PoP) comparison functionality to the StellarSwipe portfolio analytics dashboard. Users can now easily compare their portfolio performance across different time granularities (week, month, quarter, year) and track metrics over time.

## Architecture

### Data Layer (`lib/comparison.ts`)

Core calculation utilities with zero external dependencies beyond what's already in the project.

#### Types

```typescript
type ComparisonGranularity = "week" | "month" | "quarter" | "year";

interface ComparisonMetrics {
  currentValue: number;
  priorValue: number;
  absoluteChange: number;
  percentageChange: number;
  isPositive: boolean;
  isNeutral: boolean;
}

interface PeriodComparisonData {
  currentPeriod: {
    range: PeriodDateRange;
    isComplete: boolean;
    completenessPercent: number;
  };
  priorPeriod: {
    range: PeriodDateRange;
    isComplete: boolean;
  };
  metrics: ComparisonMetrics;
  metadata: {
    calculatedAt: Date;
    hasNoPriorData: boolean;
  };
}
```

#### Key Functions

**Calculation Functions**

```typescript
// Calculate percentage change: ((current - prior) / prior) * 100
calculatePercentageChange(current: number, prior: number | null): number

// Calculate absolute change: current - prior
calculateAbsoluteChange(current: number, prior: number | null): number

// Create full metrics object from current and prior values
createComparisonMetrics(currentValue: number, priorValue: number | null): ComparisonMetrics
```

**Period Date Range Functions**

```typescript
// Get date range for the current period (Monday-Sunday for week, etc.)
getPeriodDateRange(endDate: Date, granularity: ComparisonGranularity): PeriodDateRange

// Get date range for the prior period
getPriorPeriodDateRange(currentStart: Date, granularity: ComparisonGranularity): PeriodDateRange
```

**Completeness & Pro-Rating**

```typescript
// Check if a period has ended
isCompletePeriod(periodEnd: Date, now?: Date): boolean

// Calculate what % of a period has elapsed (0-100)
calculateCompletenessPercent(start: Date, end: Date, now?: Date): number

// Pro-rate a partial period value to full period (e.g., annualize)
prorateToFullPeriod(value: number, completenessPercent: number): number
```

**Main Factory Function**

```typescript
createPeriodComparison(
  currentValue: number,
  priorValue: number | null,
  granularity: ComparisonGranularity,
  now?: Date,
  shouldProratePartial?: boolean
): PeriodComparisonData
```

**Formatting Functions**

```typescript
formatGranularityLabel(granularity: ComparisonGranularity): string
// Returns: "Week-over-Week", "Month-over-Month", etc.

formatDateRange(start: Date, end: Date): string
// Returns: "Jun 24 - 30" or "Jun 28 - Jul 5"
```

#### Edge Cases Handled

1. **Zero/Null Prior Values**: Returns 0 for percentage change to avoid division by zero
2. **Missing Prior Data**: Sets `hasNoPriorData` flag and uses 0 as baseline
3. **Partial Periods**: Detects incomplete periods and provides completeness percentage
4. **Pro-rating**: Optional pro-rating for incomplete periods (e.g., mid-month earning → annualized)
5. **Negative Values**: Correctly handles negative baseline values

### UI Components

#### 1. `ComparisonGranularitySelector`

Dropdown/segmented control for selecting comparison period.

**Props**
```typescript
interface ComparisonGranularityProps {
  value: ComparisonGranularity;
  onChange: (granularity: ComparisonGranularity) => void;
  className?: string;
}
```

**Features**
- Keyboard navigation (Arrow keys, Enter, Escape)
- Accessible ARIA attributes (`aria-haspopup`, `aria-expanded`)
- Mobile-friendly dropdown with outside click handling
- Visual highlight for current selection

**Usage**
```tsx
<ComparisonGranularitySelector
  value="month"
  onChange={(g) => setGranularity(g)}
/>
```

#### 2. `ComparisonMetricCard`

Card component displaying a single metric with period-over-period comparison.

**Props**
```typescript
interface ComparisonMetricCardProps {
  label: string;
  metrics: ComparisonMetrics;
  formatValue?: (value: number) => string;
  suffix?: string;
  showAbsoluteOnly?: boolean;
  className?: string;
}
```

**Display Elements**
- Current period value (large, prominent)
- Prior period value (muted)
- Absolute change with trend icon (green ↗, red ↘, neutral ─)
- Percentage change in parentheses
- Screen-reader-only trend label ("increased", "decreased", "unchanged")

**Features**
- Color-coded changes (green positive, red negative, neutral)
- Icons + text indicators (color not sole indicator for accessibility)
- Customizable value formatting
- Optional "absolute only" mode (for percentages where % change is redundant)
- ARIA labels for screen readers

**Usage**
```tsx
<ComparisonMetricCard
  label="P&L"
  metrics={pnlMetrics}
  formatValue={(v) => `$${formatNumber(v, 2)}`}
  suffix="USD"
/>
```

#### 3. `PeriodComparisonWidget`

Complete widget combining selector and multiple metric cards.

**Props**
```typescript
interface PeriodComparisonWidgetProps {
  // Current period metrics
  pnl: number;
  winRate: number;
  totalTrades: number;

  // Prior period metrics (null if unavailable)
  priorPnl: number | null;
  priorWinRate: number | null;
  priorTotalTrades: number | null;

  // Optional custom metrics
  additionalMetrics?: Array<{
    label: string;
    current: number;
    prior: number | null;
    suffix?: string;
  }>;

  className?: string;
}
```

**Features**
- Granularity selector at top
- 3-column responsive grid (1 on mobile, 2 on tablet, 3 on desktop)
- Incomplete period warning (shows completeness %)
- Missing prior data notice
- Period range reference at bottom
- Coexists with existing benchmark overlay (additive, not replacing)

**Usage**
```tsx
<PeriodComparisonWidget
  pnl={1500}
  winRate={62.5}
  totalTrades={40}
  priorPnl={1200}
  priorWinRate={58}
  priorTotalTrades={36}
  additionalMetrics={[
    { label: "Avg Entry", current: 0.45, prior: 0.48, suffix: "USD" },
    { label: "Avg Exit", current: 0.52, prior: 0.50, suffix: "USD" },
  ]}
/>
```

## Integration

### Analytics Dashboard

The `PeriodComparisonWidget` is integrated into the analytics page and renders as a full-width section below the existing benchmark performance chart.

**File**: `app/analytics/page.tsx`

```tsx
const PeriodComparisonWidget = dynamic(
  () => import("@/components/comparison/PeriodComparisonWidget").then((m) => ({ default: m.PeriodComparisonWidget })),
  {
    loading: () => <div className="animate-pulse h-64 bg-white/10 rounded" />,
    ssr: false,
  }
)

// In JSX:
<div className="md:col-span-2">
  <PeriodComparisonWidget
    pnl={portfolioState.totalPnL}
    winRate={calculateWinRate(trades)}
    totalTrades={trades.length}
    priorPnl={priorPeriodData?.pnl}
    priorWinRate={priorPeriodData?.winRate}
    priorTotalTrades={priorPeriodData?.tradeCount}
  />
</div>
```

### Data Integration Points

To connect to real portfolio data:

1. **Query historical metrics** from your API for current and prior periods
2. **Pass metrics** to `PeriodComparisonWidget`
3. **Component automatically calculates** comparisons based on granularity

Example integration with React Query:

```tsx
const { data: currentMetrics } = useQuery({
  queryKey: ["portfolio-metrics", granularity, "current"],
  queryFn: () => fetchMetrics(granularity, "current"),
  ...queryOptions.portfolio,
});

const { data: priorMetrics } = useQuery({
  queryKey: ["portfolio-metrics", granularity, "prior"],
  queryFn: () => fetchMetrics(granularity, "prior"),
  ...queryOptions.portfolio,
});

<PeriodComparisonWidget
  pnl={currentMetrics.pnl}
  winRate={currentMetrics.winRate}
  totalTrades={currentMetrics.trades}
  priorPnl={priorMetrics?.pnl}
  priorWinRate={priorMetrics?.winRate}
  priorTotalTrades={priorMetrics?.trades}
/>
```

## Testing

### Test Files

1. **`lib/__tests__/comparison.test.ts`** - Comprehensive unit tests for calculation logic
2. **`components/comparison/__tests__/ComparisonMetricCard.test.tsx`** - Component rendering tests
3. **`components/comparison/__tests__/ComparisonGranularitySelector.test.tsx`** - Interaction and keyboard navigation tests

### Test Coverage

**Calculation Tests** (`comparison.test.ts`)
- ✅ Percentage change calculation (positive, negative, edge cases)
- ✅ Absolute change calculation (null values, zero baselines)
- ✅ Comparison metrics creation
- ✅ Period date range calculation (week, month, quarter, year)
- ✅ Prior period date range calculation
- ✅ Period completeness detection
- ✅ Completeness percentage calculation
- ✅ Pro-rating logic
- ✅ Complete period comparison data generation
- ✅ Date range formatting

**Test Scenarios**
- Complete periods
- Partial/incomplete periods (mid-week, mid-month)
- Periods with no prior data
- Zero and negative values
- Boundary conditions

**UI Tests**
- ✅ Component rendering
- ✅ Granularity selection
- ✅ Value formatting
- ✅ Color/icon indicators
- ✅ Keyboard navigation (Arrow keys, Enter, Escape)
- ✅ Dropdown open/close
- ✅ ARIA attributes
- ✅ Screen reader text

### Running Tests

```bash
# Run all tests
npm test

# Run only comparison tests
npm test -- lib/__tests__/comparison.test.ts

# Run only component tests
npm test -- components/comparison/__tests__/

# Watch mode
npm test -- --watch
```

## Calculation Methodology

### Percentage Change Formula

```
percentageChange = ((current - prior) / prior) * 100
```

**Example**
- Current: 120, Prior: 100 → (120 - 100) / 100 × 100 = **20%**
- Current: 80, Prior: 100 → (80 - 100) / 100 × 100 = **-20%**

**Edge Cases**
- Prior is 0 or null → returns 0 (to avoid division by zero)
- Result is rounded to 2 decimal places

### Absolute Change Formula

```
absoluteChange = current - prior
```

**Example**
- Current: 150, Prior: 100 → **50**
- Current: 75, Prior: 100 → **-25**

### Completeness Calculation

```
completenessPercent = (elapsedDuration / totalDuration) × 100
```

**Example** (for a month)
- June 1 to June 15, today is June 15 at noon
- Elapsed: 14.5 days
- Total: 30 days
- Completeness: (14.5 / 30) × 100 = **~48%**

### Pro-Rating Formula

Used to estimate full-period value from partial period data.

```
proratedValue = (partialValue / completenessPercent) × 100
```

**Example** (pro-rating weekly data)
- Earned $100 in 3 days (out of 7) = 43% complete
- Pro-rated weekly: (100 / 43) × 100 = **~233** (estimated full week)

## Accessibility

### Color + Icon + Text Strategy

The implementation uses a three-pronged approach to communicate positive/negative changes:

1. **Color**: Green for positive, red for negative, gray for neutral
2. **Icon**: ↗ for positive, ↘ for negative, ─ for neutral (from lucide-react)
3. **Text**: Screen-reader-only text ("increased", "decreased", "unchanged")

This ensures:
- ✅ Color-blind users aren't confused
- ✅ Screen reader users get clear labels
- ✅ All users get intuitive visual feedback

### Keyboard Navigation

- **Granularity Selector**
  - Tab to focus button
  - Enter/Space to open menu
  - Arrow Up/Down to navigate options
  - Enter/Space to select
  - Escape to close

- **Metric Cards**
  - Tab through cards
  - Screen reader announces metric name, values, and change direction

### ARIA Labels

All interactive elements have proper ARIA labels:
- `aria-haspopup="menu"` on dropdown button
- `aria-expanded="true|false"` on dropdown button
- `aria-label` describing metric and change
- `role="region"` on metric cards for screen reader context

### Screen Reader Optimization

- Trend direction communicated via text ("increased", "decreased")
- Period ranges included in labels
- Metric labels clearly describe what's being compared
- ARIA labels provide complete context without relying on visual cues

## Performance Considerations

### Calculation Performance

- All calculations are synchronous, non-blocking
- No external API calls in calculation layer
- Suitable for real-time updates and rapid granularity switching
- Date calculations use native JavaScript Date (optimized)

### Rendering Performance

- Metric cards use `useMemo` to prevent unnecessary recalculations
- Selector dropdown uses event delegation for efficient event handling
- Components use React.forwardRef for optimal component composition
- Dynamic imports with SSR disabled for analytics page components

### Data Fetching

Recommend using React Query with these settings:

```typescript
queryOptions.portfolio: {
  staleTime: 60_000,      // 1 minute
  gcTime: 5 * 60_000,     // 5 minutes
  refetchOnWindowFocus: true,
}
```

## Mobile Responsiveness

- **Mobile (< 640px)**: Single column metric grid, stacked layout
- **Tablet (640px - 1024px)**: Two column metric grid
- **Desktop (> 1024px)**: Three column metric grid
- **Selector**: Full dropdown on all sizes (keyboard accessible)

## Future Enhancements

1. **Chart Visualization**
   - Historical trend chart showing period-over-period values over time
   - Bar chart comparing current vs prior values

2. **Predictive Insights**
   - Trend analysis (accelerating/decelerating)
   - Anomaly detection
   - Forecast based on current trajectory

3. **Alerts**
   - "Win rate up 15% vs last month"
   - "P&L down 20% - check top losers"
   - "Performance diverging from benchmark"

4. **Export**
   - Download comparison report as PDF
   - CSV export of historical metrics

5. **Advanced Calculations**
   - Compound annual growth rate (CAGR)
   - Rolling averages
   - Volatility metrics

## File Structure

```
lib/
├── comparison.ts                          # Core calculation utilities
└── __tests__/
    └── comparison.test.ts                 # 100+ tests for calculations

components/comparison/
├── ComparisonGranularitySelector.tsx      # Period selector dropdown
├── ComparisonMetricCard.tsx               # Single metric card
├── PeriodComparisonWidget.tsx             # Full widget (combines above)
└── __tests__/
    ├── ComparisonMetricCard.test.tsx      # Metric card tests
    └── ComparisonGranularitySelector.test.tsx  # Selector tests

app/analytics/
└── page.tsx                               # Analytics dashboard (updated)
```

## Acceptance Criteria Checklist

- ✅ Users can select comparison granularity (week/month/quarter/year)
- ✅ Metrics show current value, prior value, and % + absolute change
- ✅ Positive/negative changes visually distinguished consistently
- ✅ Partial periods handled gracefully without misleading data
- ✅ Additive to existing benchmark overlay (no replacement)
- ✅ Unit test coverage for comparison calculations
- ✅ No existing functionality broken
- ✅ Accessibility compliance (color + icons + text, ARIA labels, keyboard nav)
- ✅ Mobile responsive layout
- ✅ Comprehensive documentation

## Support & Maintenance

### Common Integration Patterns

**With Static Data** (for prototyping)
```tsx
<PeriodComparisonWidget
  pnl={1500}
  winRate={62.5}
  totalTrades={40}
  priorPnl={1200}
  priorWinRate={58}
  priorTotalTrades={36}
/>
```

**With React Query**
```tsx
const [granularity, setGranularity] = useState<ComparisonGranularity>("month");
const { data: current } = useQuery({...});
const { data: prior } = useQuery({...});

<PeriodComparisonWidget
  pnl={current?.pnl}
  winRate={current?.winRate}
  totalTrades={current?.trades}
  priorPnl={prior?.pnl}
  priorWinRate={prior?.winRate}
  priorTotalTrades={prior?.trades}
/>
```

**With Additional Metrics**
```tsx
<PeriodComparisonWidget
  pnl={1500}
  winRate={62.5}
  totalTrades={40}
  priorPnl={1200}
  priorWinRate={58}
  priorTotalTrades={36}
  additionalMetrics={[
    { label: "Sharpe Ratio", current: 1.5, prior: 1.2 },
    { label: "Max Drawdown", current: -8.5, prior: -12.3 },
    { label: "Avg Trade Duration", current: 2.4, prior: 2.1, suffix: "hrs" },
  ]}
/>
```
