/**
 * Comprehensive tests for period-over-period comparison calculations.
 *
 * Coverage includes:
 * - Basic percentage and absolute change calculations
 * - Period date range calculations for all granularities
 * - Partial period detection and completeness calculation
 * - Pro-rating logic for incomplete periods
 * - Edge cases (zero values, null data, etc.)
 */

import {
  calculatePercentageChange,
  calculateAbsoluteChange,
  createComparisonMetrics,
  getPeriodDateRange,
  getPriorPeriodDateRange,
  isCompletePeriod,
  calculateCompletenessPercent,
  prorateToFullPeriod,
  createPeriodComparison,
  formatGranularityLabel,
  formatDateRange,
  type ComparisonGranularity,
} from "../comparison";

// ── Utility: Mock date creation ──────────────────────────────────────────────

function createDate(year: number, month: number, day: number, hour = 0): Date {
  return new Date(year, month - 1, day, hour);
}

// ── Percentage & Absolute Change Tests ─────────────────────────────────────

describe("calculatePercentageChange", () => {
  it("calculates positive percentage change", () => {
    expect(calculatePercentageChange(120, 100)).toBe(20);
  });

  it("calculates negative percentage change", () => {
    expect(calculatePercentageChange(80, 100)).toBe(-20);
  });

  it("handles zero to positive change (returns 0, not infinity)", () => {
    expect(calculatePercentageChange(100, 0)).toBe(0);
  });

  it("handles null prior value (returns 0)", () => {
    expect(calculatePercentageChange(100, null)).toBe(0);
  });

  it("handles undefined prior value (returns 0)", () => {
    expect(calculatePercentageChange(100, undefined)).toBe(0);
  });

  it("rounds result to 2 decimal places", () => {
    expect(calculatePercentageChange(100.456, 50)).toBe(100.91);
  });

  it("handles negative base values (uses absolute value)", () => {
    // -100 to -50 is 50% increase (closer to zero is positive)
    expect(calculatePercentageChange(-50, -100)).toBe(50);
  });

  it("calculates very small percentage changes accurately", () => {
    expect(calculatePercentageChange(100.01, 100)).toBe(0.01);
  });
});

describe("calculateAbsoluteChange", () => {
  it("calculates positive absolute change", () => {
    expect(calculateAbsoluteChange(150, 100)).toBe(50);
  });

  it("calculates negative absolute change", () => {
    expect(calculateAbsoluteChange(75, 100)).toBe(-25);
  });

  it("handles null prior value (returns current value)", () => {
    expect(calculateAbsoluteChange(100, null)).toBe(100);
  });

  it("handles undefined prior value (returns current value)", () => {
    expect(calculateAbsoluteChange(100, undefined)).toBe(100);
  });

  it("rounds result to 2 decimal places", () => {
    expect(calculateAbsoluteChange(100.125, 50.456)).toBe(49.67);
  });

  it("handles zero values correctly", () => {
    expect(calculateAbsoluteChange(0, 100)).toBe(-100);
    expect(calculateAbsoluteChange(100, 0)).toBe(100);
  });
});

// ── Comparison Metrics Tests ──────────────────────────────────────────────────

describe("createComparisonMetrics", () => {
  it("creates metrics for positive change", () => {
    const metrics = createComparisonMetrics(150, 100);
    expect(metrics.currentValue).toBe(150);
    expect(metrics.priorValue).toBe(100);
    expect(metrics.absoluteChange).toBe(50);
    expect(metrics.percentageChange).toBe(50);
    expect(metrics.isPositive).toBe(true);
    expect(metrics.isNeutral).toBe(false);
  });

  it("creates metrics for negative change", () => {
    const metrics = createComparisonMetrics(75, 100);
    expect(metrics.absoluteChange).toBe(-25);
    expect(metrics.percentageChange).toBe(-25);
    expect(metrics.isPositive).toBe(false);
    expect(metrics.isNeutral).toBe(false);
  });

  it("creates metrics for no change", () => {
    const metrics = createComparisonMetrics(100, 100);
    expect(metrics.absoluteChange).toBe(0);
    expect(metrics.percentageChange).toBe(0);
    expect(metrics.isNeutral).toBe(true);
    expect(metrics.isPositive).toBe(false);
  });

  it("creates metrics when no prior data exists", () => {
    const metrics = createComparisonMetrics(100, null);
    expect(metrics.currentValue).toBe(100);
    expect(metrics.priorValue).toBe(0);
    expect(metrics.absoluteChange).toBe(100);
    expect(metrics.percentageChange).toBe(0);
  });

  it("rounds all values to 2 decimal places", () => {
    const metrics = createComparisonMetrics(123.456, 100.789);
    expect(metrics.currentValue).toBe(123.46);
    expect(metrics.priorValue).toBe(100.79);
    expect(metrics.absoluteChange).toBe(22.67);
  });
});

// ── Period Date Range Tests ──────────────────────────────────────────────────

describe("getPeriodDateRange", () => {
  describe("week granularity", () => {
    it("gets week starting on Monday for mid-week date", () => {
      // Wednesday, June 26, 2024
      const date = createDate(2024, 6, 26);
      const range = getPeriodDateRange(date, "week");

      // Should start on Monday June 24
      expect(range.start.getDate()).toBe(24);
      expect(range.start.getDay()).toBe(1); // Monday

      // Should end on Wednesday or later in same week
      expect(range.end.getDate()).toBeGreaterThanOrEqual(26);
    });

    it("gets full week when starting on Monday", () => {
      // Monday, June 24, 2024
      const date = createDate(2024, 6, 24);
      const range = getPeriodDateRange(date, "week");

      expect(range.start.getDate()).toBe(24);
      expect(range.start.getDay()).toBe(1);
    });

    it("gets correct week for Sunday (previous week's end)", () => {
      // Sunday, June 23, 2024
      const date = createDate(2024, 6, 23);
      const range = getPeriodDateRange(date, "week");

      // Sunday should map to previous week (starting Mon June 17)
      expect(range.start.getDate()).toBe(17);
      expect(range.start.getDay()).toBe(1);
    });
  });

  describe("month granularity", () => {
    it("gets month range for mid-month date", () => {
      const date = createDate(2024, 6, 15);
      const range = getPeriodDateRange(date, "month");

      expect(range.start.getDate()).toBe(1);
      expect(range.start.getMonth()).toBe(5); // June (0-indexed)
      expect(range.end.getDate()).toBe(15);
    });

    it("gets month range for first day of month", () => {
      const date = createDate(2024, 6, 1);
      const range = getPeriodDateRange(date, "month");

      expect(range.start.getDate()).toBe(1);
      expect(range.end.getDate()).toBe(1);
    });

    it("gets month range for last day of month", () => {
      const date = createDate(2024, 6, 30);
      const range = getPeriodDateRange(date, "month");

      expect(range.start.getDate()).toBe(1);
      expect(range.end.getDate()).toBe(30);
    });
  });

  describe("quarter granularity", () => {
    it("gets Q1 range for January", () => {
      const date = createDate(2024, 1, 15);
      const range = getPeriodDateRange(date, "quarter");

      expect(range.start.getMonth()).toBe(0); // January
      expect(range.start.getDate()).toBe(1);
    });

    it("gets Q2 range for May", () => {
      const date = createDate(2024, 5, 15);
      const range = getPeriodDateRange(date, "quarter");

      expect(range.start.getMonth()).toBe(3); // April
      expect(range.start.getDate()).toBe(1);
    });

    it("gets Q3 range for August", () => {
      const date = createDate(2024, 8, 15);
      const range = getPeriodDateRange(date, "quarter");

      expect(range.start.getMonth()).toBe(6); // July
      expect(range.start.getDate()).toBe(1);
    });

    it("gets Q4 range for December", () => {
      const date = createDate(2024, 12, 15);
      const range = getPeriodDateRange(date, "quarter");

      expect(range.start.getMonth()).toBe(9); // October
      expect(range.start.getDate()).toBe(1);
    });
  });

  describe("year granularity", () => {
    it("gets year range for mid-year date", () => {
      const date = createDate(2024, 6, 15);
      const range = getPeriodDateRange(date, "year");

      expect(range.start.getMonth()).toBe(0); // January
      expect(range.start.getDate()).toBe(1);
      expect(range.end.getMonth()).toBe(5); // June
      expect(range.end.getDate()).toBe(15);
    });

    it("gets year range for first day of year", () => {
      const date = createDate(2024, 1, 1);
      const range = getPeriodDateRange(date, "year");

      expect(range.start.getMonth()).toBe(0);
      expect(range.start.getDate()).toBe(1);
    });

    it("gets year range for last day of year", () => {
      const date = createDate(2024, 12, 31);
      const range = getPeriodDateRange(date, "year");

      expect(range.start.getMonth()).toBe(0);
      expect(range.start.getDate()).toBe(1);
    });
  });
});

// ── Prior Period Date Range Tests ────────────────────────────────────────────

describe("getPriorPeriodDateRange", () => {
  it("gets prior week for week granularity", () => {
    // June 24 (Monday) is start of current week
    const currentStart = createDate(2024, 6, 24);
    const priorRange = getPriorPeriodDateRange(currentStart, "week");

    // Prior week should start on Monday June 17
    expect(priorRange.start.getDate()).toBe(17);
    expect(priorRange.start.getDay()).toBe(1);
  });

  it("gets prior month for month granularity", () => {
    const currentStart = createDate(2024, 6, 1); // June 1
    const priorRange = getPriorPeriodDateRange(currentStart, "month");

    // Prior month should start May 1
    expect(priorRange.start.getMonth()).toBe(4); // May
    expect(priorRange.start.getDate()).toBe(1);
  });

  it("gets prior quarter for quarter granularity", () => {
    const currentStart = createDate(2024, 4, 1); // Q2 (April 1)
    const priorRange = getPriorPeriodDateRange(currentStart, "quarter");

    // Prior quarter should start January 1
    expect(priorRange.start.getMonth()).toBe(0); // January
    expect(priorRange.start.getDate()).toBe(1);
  });

  it("gets prior year for year granularity", () => {
    const currentStart = createDate(2024, 1, 1);
    const priorRange = getPriorPeriodDateRange(currentStart, "year");

    // Prior year should start January 1, 2023
    expect(priorRange.start.getFullYear()).toBe(2023);
    expect(priorRange.start.getMonth()).toBe(0);
    expect(priorRange.start.getDate()).toBe(1);
  });
});

// ── Period Completeness Tests ────────────────────────────────────────────────

describe("isCompletePeriod", () => {
  it("returns true when period end is in the past", () => {
    const periodEnd = createDate(2024, 6, 1);
    const now = createDate(2024, 6, 15);
    expect(isCompletePeriod(periodEnd, now)).toBe(true);
  });

  it("returns false when period end is in the future", () => {
    const periodEnd = createDate(2024, 6, 30);
    const now = createDate(2024, 6, 15);
    expect(isCompletePeriod(periodEnd, now)).toBe(false);
  });

  it("returns true when period end equals now (boundary case)", () => {
    const periodEnd = createDate(2024, 6, 15);
    const now = createDate(2024, 6, 15);
    expect(isCompletePeriod(periodEnd, now)).toBe(true);
  });
});

describe("calculateCompletenessPercent", () => {
  it("returns 100 for complete period", () => {
    const start = createDate(2024, 6, 1);
    const end = createDate(2024, 6, 30);
    const now = createDate(2024, 7, 15); // After period end
    expect(calculateCompletenessPercent(start, end, now)).toBe(100);
  });

  it("returns 0 for period not yet started", () => {
    const start = createDate(2024, 7, 1);
    const end = createDate(2024, 7, 31);
    const now = createDate(2024, 6, 15); // Before period start
    expect(calculateCompletenessPercent(start, end, now)).toBe(0);
  });

  it("calculates 50% for mid-period", () => {
    const start = createDate(2024, 6, 1);
    const end = createDate(2024, 6, 3);
    const now = createDate(2024, 6, 2); // Midway through
    const percent = calculateCompletenessPercent(start, end, now);

    expect(percent).toBeGreaterThan(40);
    expect(percent).toBeLessThan(60);
  });

  it("calculates completeness for partial week", () => {
    const start = createDate(2024, 6, 24); // Monday
    const end = createDate(2024, 6, 30); // Sunday
    const now = createDate(2024, 6, 27); // Wednesday
    const percent = calculateCompletenessPercent(start, end, now);

    // 3 days out of ~7 = ~43%
    expect(percent).toBeGreaterThan(35);
    expect(percent).toBeLessThan(50);
  });

  it("rounds to nearest integer", () => {
    const start = createDate(2024, 6, 1, 0);
    const end = createDate(2024, 6, 1, 24); // 24 hours
    const now = createDate(2024, 6, 1, 12); // 12 hours in
    const percent = calculateCompletenessPercent(start, end, now);

    expect(Number.isInteger(percent)).toBe(true);
    expect(percent).toBeCloseTo(50, 0);
  });
});

// ── Pro-rating Tests ─────────────────────────────────────────────────────────

describe("prorateToFullPeriod", () => {
  it("returns original value for 100% complete period", () => {
    expect(prorateToFullPeriod(100, 100)).toBe(100);
  });

  it("returns original value for 0% complete period", () => {
    expect(prorateToFullPeriod(100, 0)).toBe(100); // Edge case: no scaling possible
  });

  it("pro-rates 50% complete period to full period", () => {
    // If we've earned $50 in 50% of the period, full period would be $100
    expect(prorateToFullPeriod(50, 50)).toBe(100);
  });

  it("pro-rates 25% complete period to full period", () => {
    // If we've earned $25 in 25% of the period, full period would be $100
    expect(prorateToFullPeriod(25, 25)).toBe(100);
  });

  it("pro-rates 75% complete period to full period", () => {
    // If we've earned $75 in 75% of the period, full period would be $100
    expect(prorateToFullPeriod(75, 75)).toBe(100);
  });

  it("rounds result to 2 decimal places", () => {
    const prorated = prorateToFullPeriod(33.333, 33.33);
    expect(Number.isFinite(prorated)).toBe(true);
    expect(String(prorated).split(".")[1]?.length).toBeLessThanOrEqual(2);
  });

  it("pro-rates negative values correctly", () => {
    expect(prorateToFullPeriod(-50, 50)).toBe(-100);
  });
});

// ── Complete Period Comparison Tests ─────────────────────────────────────────

describe("createPeriodComparison", () => {
  it("creates comparison for complete month", () => {
    // End of June 2024
    const now = createDate(2024, 7, 1);
    const comparison = createPeriodComparison(1500, 1000, "month", now);

    expect(comparison.currentPeriod.isComplete).toBe(true);
    expect(comparison.priorPeriod.isComplete).toBe(true);
    expect(comparison.metrics.currentValue).toBe(1500);
    expect(comparison.metrics.priorValue).toBe(1000);
    expect(comparison.metrics.absoluteChange).toBe(500);
    expect(comparison.metrics.percentageChange).toBe(50);
  });

  it("detects incomplete current period", () => {
    // Mid-June
    const now = createDate(2024, 6, 15);
    const comparison = createPeriodComparison(1500, 1000, "month", now);

    expect(comparison.currentPeriod.isComplete).toBe(false);
    expect(comparison.currentPeriod.completenessPercent).toBeGreaterThan(0);
    expect(comparison.currentPeriod.completenessPercent).toBeLessThan(100);
  });

  it("sets hasNoPriorData flag when prior value is null", () => {
    const now = createDate(2024, 7, 1);
    const comparison = createPeriodComparison(1500, null, "month", now);

    expect(comparison.metadata.hasNoPriorData).toBe(true);
    expect(comparison.metrics.priorValue).toBe(0);
  });

  it("pro-rates incomplete period when enabled", () => {
    // Mid-month (15th), 50% complete
    const now = createDate(2024, 6, 15);
    const comparison = createPeriodComparison(750, 1000, "month", now, true);

    // 750 at 50% completion pro-rates to ~1500
    expect(comparison.metrics.currentValue).toBeGreaterThan(750);
    expect(comparison.metrics.percentageChange).toBeGreaterThan(50);
  });

  it("does not pro-rate when flag is false", () => {
    const now = createDate(2024, 6, 15);
    const comparison = createPeriodComparison(750, 1000, "month", now, false);

    expect(comparison.metrics.currentValue).toBe(750);
  });

  it("includes correct date ranges for all granularities", () => {
    const granularities: ComparisonGranularity[] = ["week", "month", "quarter", "year"];
    const now = createDate(2024, 6, 15);

    for (const granularity of granularities) {
      const comparison = createPeriodComparison(100, 100, granularity, now);
      expect(comparison.currentPeriod.range.start).toBeLessThanOrEqual(now);
      expect(comparison.currentPeriod.range.end).toBeGreaterThanOrEqual(now);
      expect(comparison.priorPeriod.range.start).toBeLessThan(comparison.currentPeriod.range.start);
    }
  });

  it("sets calculatedAt timestamp", () => {
    const now = createDate(2024, 6, 15);
    const comparison = createPeriodComparison(100, 100, "month", now);

    expect(comparison.metadata.calculatedAt.getTime()).toBe(now.getTime());
  });
});

// ── Formatting Tests ─────────────────────────────────────────────────────────

describe("formatGranularityLabel", () => {
  it("formats week granularity", () => {
    expect(formatGranularityLabel("week")).toBe("Week-over-Week");
  });

  it("formats month granularity", () => {
    expect(formatGranularityLabel("month")).toBe("Month-over-Month");
  });

  it("formats quarter granularity", () => {
    expect(formatGranularityLabel("quarter")).toBe("Quarter-over-Quarter");
  });

  it("formats year granularity", () => {
    expect(formatGranularityLabel("year")).toBe("Year-over-Year");
  });
});

describe("formatDateRange", () => {
  it("formats range within same month", () => {
    const start = createDate(2024, 6, 24);
    const end = createDate(2024, 6, 30);
    expect(formatDateRange(start, end)).toBe("Jun 24 - 30");
  });

  it("formats range spanning months", () => {
    const start = createDate(2024, 6, 28);
    const end = createDate(2024, 7, 5);
    expect(formatDateRange(start, end)).toBe("Jun 28 - Jul 5");
  });

  it("formats single-day range", () => {
    const date = createDate(2024, 6, 15);
    expect(formatDateRange(date, date)).toBe("Jun 15 - 15");
  });
});
