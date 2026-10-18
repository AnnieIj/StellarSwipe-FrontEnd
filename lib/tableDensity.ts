export type TableDensity = "compact" | "comfortable" | "spacious";

export const TABLE_DENSITIES: { value: TableDensity; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
];

export const DEFAULT_TABLE_DENSITY: TableDensity = "comfortable";

/**
 * Tailwind classes per density. Only padding, gaps and font size change —
 * rows never get a fixed height, so content can wrap instead of clipping.
 */
export const TABLE_DENSITY_CLASSES: Record<
  TableDensity,
  { table: string; cell: string }
> = {
  compact: { table: "border-spacing-y-1 text-xs", cell: "px-2 py-1 leading-snug" },
  comfortable: { table: "border-spacing-y-2 text-sm", cell: "px-3 py-2 leading-normal" },
  spacious: { table: "border-spacing-y-3 text-sm", cell: "px-4 py-3.5 leading-relaxed" },
};

export function isTableDensity(value: unknown): value is TableDensity {
  return value === "compact" || value === "comfortable" || value === "spacious";
}
