"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface StopLossSliderProps {
  /** Current stop-loss percentage (0–100) */
  value: number;
  /** Called in real time as the slider moves */
  onChange: (value: number) => void;
  /** Optional entry price used to compute the stop-loss price */
  entryPrice?: number;
  /** Optional asset symbol, e.g. "XLM" */
  assetSymbol?: string;
  /** Minimum percentage. Default: 0 */
  min?: number;
  /** Maximum percentage. Default: 100 */
  max?: number;
  /** Step increment. Default: 1 */
  step?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * StopLossSlider — accessible range input for selecting a stop-loss percentage.
 *
 * Features:
 * - Real-time updates while dragging
 * - Keyboard navigation (arrow keys, Home, End)
 * - Active track highlight proportional to the selected value
 * - Displays the corresponding price when entryPrice is provided
 * - ARIA attributes for screen readers
 * - Value persists while the parent keeps it in state
 *
 * @example
 * // Controlled slider with derived stop-loss price
 * const [stopLoss, setStopLoss] = React.useState(10);
 *
 * <StopLossSlider
 *   value={stopLoss}
 *   onChange={setStopLoss}
 *   entryPrice={0.4821}
 *   assetSymbol="XLM"
 * />
 *
 * @example
 * // Tighter range (1–25 %), step of 0.5
 * <StopLossSlider
 *   value={stopLoss}
 *   onChange={setStopLoss}
 *   min={1}
 *   max={25}
 *   step={0.5}
 * />
 *
 * @example
 * // Disabled while a trade is submitting
 * <StopLossSlider value={stopLoss} onChange={setStopLoss} disabled={isSubmitting} />
 *
 * @see {@link https://storybook.stellarswipe.dev/?path=/docs/ui-stoplosslider--docs Storybook — StopLossSlider}
 */
export function StopLossSlider({
  value,
  onChange,
  entryPrice,
  assetSymbol = "XLM",
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
}: StopLossSliderProps) {
  const id = React.useId();
  const trackRef = React.useRef<HTMLDivElement>(null);

  // Clamp helper
  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  // Percentage of the track filled
  const fillPercent = ((clamp(value) - min) / (max - min)) * 100;

  // Derived stop-loss price
  const stopPrice =
    entryPrice != null
      ? (entryPrice * (1 - clamp(value) / 100)).toFixed(4)
      : null;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(clamp(Number(e.target.value)));
  }

  // Colour the thumb/track based on risk level
  const riskColor =
    value <= 10
      ? "text-accent-success"
      : value <= 30
      ? "text-accent-warning"
      : "text-accent-danger";

  const trackFillColor =
    value <= 10
      ? "bg-accent-success"
      : value <= 30
      ? "bg-accent-warning"
      : "bg-accent-danger";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          Stop-Loss
        </label>
        <div className="flex items-center gap-2">
          <span
            className={cn("text-sm font-semibold tabular-nums", riskColor)}
            aria-live="polite"
            aria-atomic="true"
          >
            {clamp(value)}%
          </span>
          {stopPrice && (
            <span className="text-xs text-muted-foreground tabular-nums">
              ≈ {stopPrice} {assetSymbol}
            </span>
          )}
        </div>
      </div>

      {/* Track + thumb */}
      <div className="relative flex items-center" ref={trackRef}>
        {/* Background track */}
        <div className="absolute h-1.5 w-full rounded-full bg-muted" />

        {/* Active (filled) track */}
        <div
          className={cn(
            "absolute h-1.5 rounded-full transition-all duration-75",
            trackFillColor
          )}
          style={{ width: `${fillPercent}%` }}
          aria-hidden="true"
        />

        {/* Native range input — sits on top, transparent */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={clamp(value)}
          onChange={handleChange}
          disabled={disabled}
          aria-label="Stop-loss percentage"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={clamp(value)}
          aria-valuetext={`${clamp(value)}% stop-loss${
            stopPrice ? `, price ${stopPrice} ${assetSymbol}` : ""
          }`}
          className={cn(
            // Reset native styles, keep it accessible
            "relative w-full cursor-pointer appearance-none bg-transparent",
            "h-5 focus:outline-none",
            // Thumb styles via CSS custom properties (Tailwind-compatible)
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background",
            "[&::-webkit-slider-thumb]:shadow-md",
            "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-100",
            "[&::-webkit-slider-thumb]:hover:scale-110",
            value <= 10
              ? "[&::-webkit-slider-thumb]:bg-[hsl(var(--accent-success))]"
              : value <= 30
              ? "[&::-webkit-slider-thumb]:bg-[hsl(var(--accent-warning))]"
              : "[&::-webkit-slider-thumb]:bg-[hsl(var(--accent-danger))]",
            // Firefox
            "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
            "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2",
            "[&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:shadow-md",
            value <= 10
              ? "[&::-moz-range-thumb]:bg-[hsl(var(--accent-success))]"
              : value <= 30
              ? "[&::-moz-range-thumb]:bg-[hsl(var(--accent-warning))]"
              : "[&::-moz-range-thumb]:bg-[hsl(var(--accent-danger))]",
            // Focus ring on thumb
            "focus-visible:[&::-webkit-slider-thumb]:ring-2",
            "focus-visible:[&::-webkit-slider-thumb]:ring-ring",
            "focus-visible:[&::-webkit-slider-thumb]:ring-offset-1",
            disabled && "cursor-not-allowed opacity-50"
          )}
        />
      </div>

      {/* Min / Max labels */}
      <div className="flex justify-between text-xs text-muted-foreground select-none">
        <span>{min}%</span>
        <span>{max}%</span>
      </div>

      {/* Risk hint */}
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {value === 0
          ? "No stop-loss set."
          : value <= 10
          ? "Low risk — tight stop."
          : value <= 30
          ? "Moderate risk."
          : "High risk — wide stop."}
      </p>
    </div>
  );
}
