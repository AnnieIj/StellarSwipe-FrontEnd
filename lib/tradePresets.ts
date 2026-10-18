/**
 * Trade-size preset helpers.
 *
 * Presets are the percentage-of-balance shortcuts shown above the amount
 * input in the trade form. Users can edit, reorder and restore them; the
 * rules below are shared by the store (for persisted data) and the editor.
 */

export const DEFAULT_TRADE_PRESETS: readonly number[] = [25, 50, 75, 100];

export const MAX_TRADE_PRESETS = 6;

/**
 * Validates a full, ordered list of preset percentages.
 *
 * @returns The first validation error, or `null` when the list is valid.
 *
 * @example
 * validateTradePresets([25, 50, 75, 100]) // null
 * validateTradePresets([25, 25])          // "25% is listed more than once"
 * validateTradePresets([0, 50])           // "Presets must be greater than 0%"
 */
export function validateTradePresets(values: readonly number[]): string | null {
  if (values.length === 0) return "Add at least one preset";
  if (values.length > MAX_TRADE_PRESETS) {
    return `Use no more than ${MAX_TRADE_PRESETS} presets`;
  }
  for (const value of values) {
    if (!Number.isFinite(value)) return "Presets must be numbers";
    if (value <= 0) return "Presets must be greater than 0%";
    if (value > 100) return "Presets cannot exceed 100%";
  }
  if (new Set(values).size !== values.length) {
    return "Each preset must be unique";
  }
  return null;
}

/**
 * Drops invalid legacy values from persisted storage. Falls back to the
 * defaults when nothing usable remains.
 */
export function sanitizeTradePresets(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [...DEFAULT_TRADE_PRESETS];
  const candidates = raw
    .map((v) => Number(v))
    .filter((v, i, arr) => Number.isFinite(v) && v > 0 && v <= 100 && arr.indexOf(v) === i)
    .slice(0, MAX_TRADE_PRESETS);
  return candidates.length > 0 ? candidates : [...DEFAULT_TRADE_PRESETS];
}
