import { useState, useCallback } from "react";

export interface ColumnDef<K extends string = string> {
  /** Stable machine-readable key, used as the column identifier. */
  key: K;
  /** Human-readable label shown in the visibility toggle UI. */
  label: string;
  /**
   * When true the column cannot be hidden by the user.
   * Use for identifying columns (e.g. "Date", "Asset Pair") that are
   * required for the table to remain meaningful.
   */
  required?: boolean;
  /** Initial visibility. Defaults to true. */
  defaultVisible?: boolean;
}

interface UseColumnVisibilityOptions<K extends string> {
  /** Column definitions in display order. */
  columns: ColumnDef<K>[];
  /**
   * Optional localStorage key to persist the selection across page loads.
   * When omitted, state is ephemeral (resets on unmount / navigation).
   */
  storageKey?: string;
}

interface UseColumnVisibilityReturn<K extends string> {
  /** Current visibility map — true means the column is visible. */
  visibility: Record<K, boolean>;
  /** Toggle a column's visibility. Required columns are silently ignored. */
  toggle: (key: K) => void;
  /** Show all optional columns. */
  showAll: () => void;
  /** Returns true if a specific column is currently visible. */
  isVisible: (key: K) => boolean;
}

function readFromStorage<K extends string>(
  storageKey: string,
  columns: ColumnDef<K>[]
): Record<K, boolean> | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Record<K, boolean>>;
    // Validate — ensure all keys are present, required ones are always true
    const result = {} as Record<K, boolean>;
    for (const col of columns) {
      result[col.key] =
        col.required === true
          ? true
          : parsed[col.key] !== undefined
          ? Boolean(parsed[col.key])
          : col.defaultVisible !== false;
    }
    return result;
  } catch {
    return null;
  }
}

function writeToStorage<K extends string>(
  storageKey: string,
  visibility: Record<K, boolean>
): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(visibility));
  } catch {
    // localStorage unavailable (private browsing, quota exceeded) — ignore
  }
}

function buildDefault<K extends string>(columns: ColumnDef<K>[]): Record<K, boolean> {
  const result = {} as Record<K, boolean>;
  for (const col of columns) {
    result[col.key] = col.required === true ? true : col.defaultVisible !== false;
  }
  return result;
}

/**
 * useColumnVisibility — #565
 *
 * Manages which columns are visible in a data table.
 *
 * - Required columns (required: true) are always visible and cannot be hidden.
 * - Optional columns can be toggled by the user.
 * - When a storageKey is provided, the selection persists in localStorage.
 *
 * @example
 * const { visibility, toggle, isVisible } = useColumnVisibility({
 *   columns: TAX_COLUMNS,
 *   storageKey: "tax-table-columns-v1",
 * });
 * // In JSX: {isVisible("gainLoss") && <td>...</td>}
 */
export function useColumnVisibility<K extends string>({
  columns,
  storageKey,
}: UseColumnVisibilityOptions<K>): UseColumnVisibilityReturn<K> {
  const [visibility, setVisibility] = useState<Record<K, boolean>>(() => {
    if (storageKey && typeof window !== "undefined") {
      const persisted = readFromStorage(storageKey, columns);
      if (persisted) return persisted;
    }
    return buildDefault(columns);
  });

  const toggle = useCallback(
    (key: K) => {
      setVisibility((prev) => {
        const col = columns.find((c) => c.key === key);
        // Silently ignore attempts to hide required columns
        if (!col || col.required) return prev;
        const next = { ...prev, [key]: !prev[key] };
        if (storageKey) writeToStorage(storageKey, next);
        return next;
      });
    },
    [columns, storageKey]
  );

  const showAll = useCallback(() => {
    setVisibility((prev) => {
      const next = { ...prev } as Record<K, boolean>;
      for (const col of columns) {
        if (!col.required) next[col.key] = true;
      }
      if (storageKey) writeToStorage(storageKey, next);
      return next;
    });
  }, [columns, storageKey]);

  const isVisible = useCallback(
    (key: K) => visibility[key] !== false,
    [visibility]
  );

  return { visibility, toggle, showAll, isVisible };
}
