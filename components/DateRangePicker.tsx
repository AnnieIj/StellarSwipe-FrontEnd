"use client";

import { useId, useMemo, useState } from "react";
import { Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DateRange {
  start: Date;
  end: Date;
}

export interface Preset {
  label: string;
  getRange: () => DateRange;
}

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysAgo(n: number): DateRange {
  const end = startOfDay(new Date());
  const start = startOfDay(new Date());
  start.setDate(start.getDate() - n);
  return { start, end };
}

export const DEFAULT_PRESETS: Preset[] = [
  { label: "Today", getRange: () => daysAgo(0) },
  { label: "Last 7 days", getRange: () => daysAgo(7) },
  { label: "Last 30 days", getRange: () => daysAgo(30) },
  { label: "Last 90 days", getRange: () => daysAgo(90) },
  {
    label: "This month",
    getRange: () => {
      const now = new Date();
      return {
        start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: startOfDay(now),
      };
    },
  },
];

function toInputValue(d: Date | null): string {
  if (!d) return "";
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${day}`;
}

function fromInputValue(v: string): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDisplay(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: Preset[];
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

/**
 * Responsive date-range picker: touch-friendly stacked layout on narrow
 * screens, presets + calendars side-by-side on desktop. Keyboard focus
 * order always follows the visual order (start date, end date, presets,
 * apply) so it works the same whether the layout is stacked or inline.
 */
export function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  minDate,
  maxDate,
  className,
}: DateRangePickerProps) {
  const [draftStart, setDraftStart] = useState(value.start);
  const [draftEnd, setDraftEnd] = useState(value.end);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const startId = useId();
  const endId = useId();

  const error = useMemo(() => {
    if (!draftStart || !draftEnd) return "Select both a start and end date.";
    if (draftStart > draftEnd) return "Start date must be before end date.";
    if (minDate && draftStart < startOfDay(minDate))
      return `Start date can't be before ${formatDisplay(minDate)}.`;
    if (maxDate && draftEnd > startOfDay(maxDate))
      return `End date can't be after ${formatDisplay(maxDate)}.`;
    return null;
  }, [draftStart, draftEnd, minDate, maxDate]);

  function applyPreset(preset: Preset) {
    const range = preset.getRange();
    setDraftStart(range.start);
    setDraftEnd(range.end);
    setActivePreset(preset.label);
    onChange(range);
  }

  function handleApply() {
    if (error || !draftStart || !draftEnd) return;
    onChange({ start: draftStart, end: draftEnd });
  }

  return (
    <div
      className={cn(
        "w-full min-w-0 rounded-2xl border border-white/10 bg-slate-900 p-4",
        className
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Calendars: stacked on mobile, side-by-side from sm up */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
          <div className="min-w-0 flex-1 space-y-1.5">
            <label
              htmlFor={startId}
              className="text-xs font-medium text-slate-400"
            >
              Start date
            </label>
            <div className="relative">
              <Calendar
                size={14}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                id={startId}
                type="date"
                value={toInputValue(draftStart)}
                max={toInputValue(draftEnd) || undefined}
                onChange={(e) => {
                  setActivePreset(null);
                  setDraftStart(fromInputValue(e.target.value));
                }}
                className="min-h-11 w-full min-w-0 rounded-xl border border-white/10 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <label
              htmlFor={endId}
              className="text-xs font-medium text-slate-400"
            >
              End date
            </label>
            <div className="relative">
              <Calendar
                size={14}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                id={endId}
                type="date"
                value={toInputValue(draftEnd)}
                min={toInputValue(draftStart) || undefined}
                onChange={(e) => {
                  setActivePreset(null);
                  setDraftEnd(fromInputValue(e.target.value));
                }}
                className="min-h-11 w-full min-w-0 rounded-xl border border-white/10 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Presets: horizontally wrapping chips so they never force overflow */}
        <div
          role="group"
          aria-label="Date range presets"
          className="flex min-w-0 flex-wrap gap-2 lg:max-w-[220px] lg:justify-end"
        >
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              aria-pressed={activePreset === preset.label}
              className={cn(
                "min-h-9 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                activePreset === preset.label
                  ? "border-blue-400/40 bg-blue-500/20 text-blue-200"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 break-words text-xs text-slate-400" aria-live="polite">
          {error ? (
            <span className="flex items-center gap-1.5 text-red-400">
              <AlertCircle size={13} aria-hidden="true" />
              {error}
            </span>
          ) : (
            <>
              Selected: <span className="text-slate-200">{formatDisplay(draftStart)}</span>
              {" – "}
              <span className="text-slate-200">{formatDisplay(draftEnd)}</span>
            </>
          )}
        </p>
        <Button
          size="sm"
          onClick={handleApply}
          disabled={!!error}
          className="w-full sm:w-auto"
        >
          Apply range
        </Button>
      </div>
    </div>
  );
}
