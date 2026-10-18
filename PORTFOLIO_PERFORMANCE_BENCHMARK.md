# Portfolio Performance vs Benchmark Overlay Chart

## Summary

This PR implements a portfolio performance-vs-benchmark overlay chart that allows users to compare their portfolio returns against a simulated XLM-hold equivalent starting from the same initial value.

## Changes

### New Files

- `hooks/usePriceHistory.ts` - Hook for fetching/sourcing price history data for assets (currently mocked, ready for real API integration)
- `lib/benchmark.ts` - Utility functions for computing benchmark series and performance delta
- `lib/__tests__/benchmark.test.ts` - Unit tests for benchmark computation logic
- `components/chart/PortfolioPerformanceBenchmarkChart.tsx` - Main chart component with toggleable XLM benchmark overlay

### Modified Files

- `components/DashboardWidgets.tsx` - Added the new performance chart widget to the dashboard layout

## Features Implemented

### 1. Overlay Chart Comparing Portfolio Value vs XLM Hold

The `PortfolioPerformanceBenchmarkChart` component displays:

- Green line showing portfolio value over time
- Dashed blue line showing equivalent XLM hold value when benchmark is enabled
- Performance delta calculation showing outperformance/underperformance percentage

### 2. XLM Price History Sourcing

- Uses the existing `useXLMPriceHistory` hook which follows the same pattern as `useSignalPrice` for price polling
- Currently generates mock data but structured for real Horizon/Soroban RPC integration
- Uses the same price data patterns already established in the codebase

### 3. Toggleable Benchmark Overlay

- Checkbox control to show/hide the XLM benchmark line
- When disabled, only the portfolio performance line is shown
- Clear visual distinction between portfolio and benchmark with colors and line styles

### 4. Unit Tests

Comprehensive tests covering:

- `computeBenchmarkSeries`: Correctly scales XLM prices relative to initial portfolio value
- `generateMockPortfolioHistory`: Generates correct number of points with proper timestamps
- `computePerformanceDelta`: Calculates accurate returns and outperformance metrics
- Edge cases for empty histories, negative returns, unsorted data

## Technical Details

### Benchmark Calculation Logic

The benchmark series is computed by:

1. Taking the initial portfolio value
2. Scaling it by the XLM price ratio relative to the XLM price at the start of the period
3. This ensures the benchmark starts at the same value as the portfolio and tracks XLM performance

```typescript
const priceRatio = point.price / startPrice;
const benchmarkValue = initialPortfolioValue * priceRatio;
```

### Chart Implementation

- SVG-based rendering (consistent with existing MiniChart and PortfolioAllocationChart)
- Catmull-Rom smooth curves for line paths
- Responsive width/height via viewBox
- Accessible with ARIA labels and semantic SVG elements

## Acceptance Criteria

- [x] Add an overlay chart comparing the user's portfolio value over time against a simulated XLM-hold-equivalent starting from the same initial value
- [x] Source XLM price history from the existing price feed data pattern used elsewhere in the app
- [x] Allow toggling the benchmark overlay on and off
- [x] Add unit tests verifying the benchmark series is computed correctly against mocked price history

## Closes #367

closes #367
