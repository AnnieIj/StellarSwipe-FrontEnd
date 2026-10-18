import type { DateRange } from "@/components/DateRangePicker";

export const ANALYTICS_RANGE_PARAMS = { start: "start", end: "end" } as const;

export function serializeAnalyticsRange(range: DateRange): string {
  const params = new URLSearchParams();
  params.set(ANALYTICS_RANGE_PARAMS.start, toDateParam(range.start));
  params.set(ANALYTICS_RANGE_PARAMS.end, toDateParam(range.end));
  return `?${params.toString()}`;
}

export function parseAnalyticsRange(search: string): DateRange | null {
  const params = new URLSearchParams(search);
  const start = fromDateParam(params.get(ANALYTICS_RANGE_PARAMS.start));
  const end = fromDateParam(params.get(ANALYTICS_RANGE_PARAMS.end));
  return start && end && start <= end ? { start, end } : null;
}

function toDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function fromDateParam(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}