"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { type ComparisonMetrics } from "@/lib/comparison";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ComparisonMetricCardProps {
  label: string;
  metrics: ComparisonMetrics;
  formatValue?: (value: number) => string;
  suffix?: string;
  showAbsoluteOnly?: boolean;
  className?: string;
}

/**
 * ComparisonMetricCard — Displays a single metric with period-over-period comparison.
 *
 * Shows:
 * - Current period value
 * - Prior period value
 * - Absolute change with indicator
 * - Percentage change with trend icon
 * - Color coding (green/red/neutral) for changes
 *
 * Features:
 * - Accessible color + icon indicators (color not sole indicator)
 * - Customizable value formatting
 * - Optional absolute-only display mode (hides percentage)
 * - ARIA labels for screen readers
 */
export function ComparisonMetricCard({
  label,
  metrics,
  formatValue = (v) => formatNumber(v, 2),
  suffix = "",
  showAbsoluteOnly = false,
  className,
}: ComparisonMetricCardProps) {
  const trendIcon =
    metrics.isPositive && !metrics.isNeutral ? (
      <TrendingUp size={16} />
    ) : metrics.isPositive === false && !metrics.isNeutral ? (
      <TrendingDown size={16} />
    ) : (
      <Minus size={16} />
    );

  const trendColor =
    metrics.isPositive && !metrics.isNeutral
      ? "text-emerald-400"
      : metrics.isPositive === false && !metrics.isNeutral
        ? "text-red-400"
        : "text-foreground-muted";

  const trendLabel =
    metrics.isPositive && !metrics.isNeutral
      ? "increased"
      : metrics.isPositive === false && !metrics.isNeutral
        ? "decreased"
        : "unchanged";

  const ariaLabel = `${label}: ${formatValue(metrics.currentValue)}${suffix}, ${metrics.isPositive && !metrics.isNeutral ? "up" : metrics.isPositive === false && !metrics.isNeutral ? "down" : "unchanged"} ${Math.abs(metrics.absoluteChange)} ${suffix} or ${metrics.percentageChange}% compared to prior period`;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-white/5 p-4",
        className
      )}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Label */}
      <div className="mb-3 text-xs font-semibold text-foreground-muted uppercase tracking-wide">
        {label}
      </div>

      {/* Current vs Prior Values */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] font-medium text-foreground-subtle mb-1">
            Current
          </div>
          <div className="text-lg font-bold text-foreground tabular-nums">
            {formatValue(metrics.currentValue)}
            {suffix && <span className="text-xs ml-1">{suffix}</span>}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium text-foreground-subtle mb-1">
            Prior
          </div>
          <div className="text-lg font-bold text-foreground-muted tabular-nums">
            {formatValue(metrics.priorValue)}
            {suffix && <span className="text-xs ml-1">{suffix}</span>}
          </div>
        </div>
      </div>

      {/* Change Indicator */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/30">
        <div className={cn("flex items-center gap-1", trendColor)}>
          {trendIcon}
          <span className="text-sm font-semibold tabular-nums">
            {metrics.absoluteChange >= 0 ? "+" : ""}
            {formatValue(metrics.absoluteChange)}
            {suffix && <span className="text-xs ml-0.5">{suffix}</span>}
          </span>
        </div>

        {!showAbsoluteOnly && (
          <div
            className={cn(
              "ml-auto text-sm font-semibold tabular-nums",
              trendColor
            )}
            aria-label={`${metrics.percentageChange}% change`}
          >
            ({metrics.percentageChange >= 0 ? "+" : ""}
            {metrics.percentageChange}%)
          </div>
        )}
      </div>

      {/* Accessibility: Ensure change direction is communicated via text, not just color */}
      <div className="sr-only">{trendLabel}</div>
    </div>
  );
}
