import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names, handling conditional classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number with up to 2 decimal places and thousands separators.
 * Uses the browser's Intl.NumberFormat for locale-aware formatting.
 */
export function formatNumber(
  value: number,
  maximumFractionDigits: number = 2
): string {
  if (isNaN(value)) return "-";
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}
