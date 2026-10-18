/**
 * Period-over-period comparison calculation utilities.
 *
 * Handles comparison metrics (current vs prior period) with support for:
 * - Multiple granularities (week, month, quarter, year)
 * - Partial/incomplete period detection and handling
 * - Zero/null value edge cases
 * - Pro-rating for incomplete periods
 */

export type ComparisonGranularity = "week" | "month" | "quarter" | "year";

export interface ComparisonMetrics {
  currentValue: number;
  priorValue: number;
  absoluteChange: number;
  percentageChange: number;
  isPositive: boolean;
  isNeutral: boolean;
}

export interface PeriodDateRange {
  start: Date;
  end: Date;
}

export interface PeriodComparisonData {
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

/**
 * Calculate the percentage change between two values.
 * Returns 0 if prior value is 0 or null to avoid division by zero.
 *
 * Formula: ((current - prior) / prior) * 100
 */
export function calculatePercentageChange(
  current: number,
  prior: number | null | undefined
): number {
  if (!prior || prior === 0) return 0;
  const change = ((current - prior) / Math.abs(prior)) * 100;
  return parseFloat(change.toFixed(2));
}

/**
 * Calculate the absolute change between two values.
 * Handles null/undefined prior values.
 */
export function calculateAbsoluteChange(
  current: number,
  prior: number | null | undefined
): number {
  if (prior == null) return current;
  const change = current - prior;
  return parseFloat(change.toFixed(2));
}

/**
 * Create comparison metrics from current and prior values.
 */
export function createComparisonMetrics(
  currentValue: number,
  priorValue: number | null | undefined
): ComparisonMetrics {
  const absoluteChange = calculateAbsoluteChange(currentValue, priorValue);
  const percentageChange = calculatePercentageChange(currentValue, priorValue);

  return {
    currentValue: parseFloat(currentValue.toFixed(2)),
    priorValue: priorValue ? parseFloat(priorValue.toFixed(2)) : 0,
    absoluteChange,
    percentageChange,
    isPositive: absoluteChange > 0,
    isNeutral: absoluteChange === 0,
  };
}

/**
 * Get the date range for a given period.
 * End date is exclusive (start of next period).
 */
export function getPeriodDateRange(
  endDate: Date,
  granularity: ComparisonGranularity
): PeriodDateRange {
  const end = new Date(endDate);
  const start = new Date(endDate);

  switch (granularity) {
    case "week":
      // Get start of the current week (Monday)
      const day = end.getDay();
      const diff = end.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case "month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case "quarter":
      const quarter = Math.floor(end.getMonth() / 3);
      start.setMonth(quarter * 3, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case "year":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}

/**
 * Get the date range for the prior period relative to a given period.
 */
export function getPriorPeriodDateRange(
  currentStart: Date,
  granularity: ComparisonGranularity
): PeriodDateRange {
  const priorEnd = new Date(currentStart);
  priorEnd.setMilliseconds(-1); // Go back 1ms to get the end of previous period

  return getPeriodDateRange(priorEnd, granularity);
}

/**
 * Detect if a period is complete based on the end date.
 * A period is incomplete if it hasn't ended yet.
 */
export function isCompletePeriod(
  periodEnd: Date,
  now: Date = new Date()
): boolean {
  return periodEnd <= now;
}

/**
 * Calculate the completeness percentage of a period.
 * Returns 100 for complete periods, 0-99 for incomplete periods.
 */
export function calculateCompletenessPercent(
  periodStart: Date,
  periodEnd: Date,
  now: Date = new Date()
): number {
  if (now >= periodEnd) return 100;
  if (now < periodStart) return 0;

  const totalDuration = periodEnd.getTime() - periodStart.getTime();
  const elapsedDuration = now.getTime() - periodStart.getTime();
  const percent = (elapsedDuration / totalDuration) * 100;

  return Math.round(percent);
}

/**
 * Pro-rate a metric to full period completion.
 * Useful for annualizing partial period metrics.
 *
 * @param value - The partial period value
 * @param completenessPercent - Percentage of period completed (0-100)
 * @returns The pro-rated full period value
 */
export function prorateToFullPeriod(
  value: number,
  completenessPercent: number
): number {
  if (completenessPercent === 0 || completenessPercent === 100) return value;
  const prorated = (value / completenessPercent) * 100;
  return parseFloat(prorated.toFixed(2));
}

/**
 * Create a complete period comparison data object.
 * Handles partial period detection and pro-rating.
 *
 * @param currentValue - Current period metric value
 * @param priorValue - Prior period metric value (null if no data)
 * @param granularity - Comparison granularity
 * @param now - Current date/time (defaults to now)
 * @param shouldProratePartial - Whether to pro-rate incomplete periods (defaults to false)
 */
export function createPeriodComparison(
  currentValue: number,
  priorValue: number | null | undefined,
  granularity: ComparisonGranularity,
  now: Date = new Date(),
  shouldProratePartial: boolean = false
): PeriodComparisonData {
  const currentPeriodRange = getPeriodDateRange(now, granularity);
  const priorPeriodRange = getPriorPeriodDateRange(currentPeriodRange.start, granularity);

  const currentIsComplete = isCompletePeriod(currentPeriodRange.end, now);
  const currentCompletenessPercent = calculateCompletenessPercent(
    currentPeriodRange.start,
    currentPeriodRange.end,
    now
  );

  // If current period is incomplete and pro-rating is enabled, pro-rate the current value
  const adjustedCurrentValue =
    shouldProratePartial && !currentIsComplete
      ? prorateToFullPeriod(currentValue, currentCompletenessPercent)
      : currentValue;

  const metrics = createComparisonMetrics(adjustedCurrentValue, priorValue);

  return {
    currentPeriod: {
      range: currentPeriodRange,
      isComplete: currentIsComplete,
      completenessPercent: currentCompletenessPercent,
    },
    priorPeriod: {
      range: priorPeriodRange,
      isComplete: true, // Prior periods are always complete
    },
    metrics,
    metadata: {
      calculatedAt: now,
      hasNoPriorData: !priorValue,
    },
  };
}

/**
 * Format a ComparisonGranularity to a human-readable label.
 */
export function formatGranularityLabel(granularity: ComparisonGranularity): string {
  const labels: Record<ComparisonGranularity, string> = {
    week: "Week-over-Week",
    month: "Month-over-Month",
    quarter: "Quarter-over-Quarter",
    year: "Year-over-Year",
  };
  return labels[granularity];
}

/**
 * Format a date range to a human-readable string.
 * e.g., "Jun 24 - Jun 30" or "Jun 1 - Jun 30"
 */
export function formatDateRange(start: Date, end: Date): string {
  const startMonth = start.toLocaleString("en-US", { month: "short" });
  const startDay = start.getDate();
  const endMonth = end.toLocaleString("en-US", { month: "short" });
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}
