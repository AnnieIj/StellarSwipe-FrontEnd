/**
 * Array utility helpers for common comparison and transformation operations.
 *
 * These helpers are used across signal processing, comparison-tray operations,
 * and general data manipulation to reduce repetitive inline logic.
 */

/**
 * Partition an array into two arrays based on a predicate.
 *
 * @example
 * const [valid, invalid] = partition(signals, s => s.confidence >= 50);
 *
 * @returns A tuple where the first element is items that passed the predicate
 *          and the second element is items that failed.
 */
export function partition<T>(
  items: T[],
  predicate: (item: T, index: number) => boolean,
): [T[], T[]] {
  const pass: T[] = [];
  const fail: T[] = [];
  for (let i = 0; i < items.length; i++) {
    if (predicate(items[i], i)) {
      pass.push(items[i]);
    } else {
      fail.push(items[i]);
    }
  }
  return [pass, fail];
}

/**
 * Toggle an item in an array. If the item exists (via strict equality or
 * a custom match function), it is removed. Otherwise it is appended.
 *
 * @example
 * const updated = toggle(selectedIds, "sig-42");
 */
export function toggle<T>(
  items: T[],
  item: T,
  matches?: (a: T, b: T) => boolean,
): T[] {
  const eq = matches ?? ((a: T, b: T) => a === b);
  const index = items.findIndex((existing) => eq(existing, item));
  if (index !== -1) {
    return [...items.slice(0, index), ...items.slice(index + 1)];
  }
  return [...items, item];
}

/**
 * Group an array of items by a key extracted from each item.
 *
 * @example
 * const byAction = groupBy(signals, s => s.action);
 * // { BUY: [sig1, sig3], SELL: [sig2] }
 */
export function groupBy<T, K extends string | number | symbol>(
  items: T[],
  keyFn: (item: T, index: number) => K,
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;
  for (let i = 0; i < items.length; i++) {
    const key = keyFn(items[i], i);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(items[i]);
  }
  return result;
}

/**
 * Returns a new array with duplicate items removed. Uses strict equality
 * by default, or an optional custom equality function.
 *
 * @example
 * const unique = uniqBy(signals, (a, b) => a.id === b.id);
 */
export function uniqBy<T>(
  items: T[],
  equals: (a: T, b: T) => boolean = (a, b) => a === b,
): T[] {
  const result: T[] = [];
  for (const item of items) {
    if (!result.some((existing) => equals(existing, item))) {
      result.push(item);
    }
  }
  return result;
}

/**
 * Move an item from one index to another within an array. Returns a new array.
 * If the indices are out of bounds the original array is returned unchanged.
 */
export function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    fromIndex >= items.length ||
    toIndex < 0 ||
    toIndex >= items.length
  ) {
    return items;
  }
  const copy = [...items];
  const [removed] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, removed);
  return copy;
}

/**
 * Chunk an array into groups of the specified size. The final chunk may
 * be smaller than `size`.
 *
 * @example
 * chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    return [];
  }
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}
