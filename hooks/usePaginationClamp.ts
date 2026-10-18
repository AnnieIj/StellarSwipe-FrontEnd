"use client";

import { useEffect, useState } from "react";

export interface UsePaginationClampOptions {
  /** Total number of items in the (possibly filtered/sorted) dataset. */
  totalItems: number;
  /** Items rendered per page. */
  pageSize: number;
  /**
   * Changing this value (e.g. a filter/sort signature) resets to page 0.
   * Pass a value that changes whenever the active filters/sort change.
   */
  resetKey?: unknown;
}

export interface UsePaginationClampReturn {
  /** Always a valid page index — clamped into [0, totalPages - 1]. */
  page: number;
  totalPages: number;
  /** Start index of the current page's slice. */
  offset: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  goToPage: (page: number) => void;
  goToPrevious: () => void;
  goToNext: () => void;
}

/**
 * Keeps a page index valid as the underlying dataset changes shape — e.g.
 * after filters/sorting narrow the results, or new data arrives and shrinks
 * the page count out from under the current page.
 *
 * - Clamps the returned `page` back into range whenever `totalItems`
 *   changes, so callers never slice with a stale, out-of-bounds index.
 * - Resets to page 0 whenever `resetKey` changes, so changing filters
 *   returns to a predictable page instead of showing stale results.
 */
export function usePaginationClamp({
  totalItems,
  pageSize,
  resetKey,
}: UsePaginationClampOptions): UsePaginationClampReturn {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));

  // Filters/sorting changed — jump back to a predictable first page rather
  // than leaving the user on a page number that no longer means anything.
  useEffect(() => {
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Dataset shrank (or grew) — clamp so `page` always points at a page that
  // actually exists.
  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages - 1));
  }, [totalPages]);

  const safePage = Math.min(page, totalPages - 1);

  return {
    page: safePage,
    totalPages,
    offset: safePage * pageSize,
    canGoPrevious: safePage > 0,
    canGoNext: safePage < totalPages - 1,
    goToPage: (p: number) => setPage(Math.max(0, Math.min(p, totalPages - 1))),
    goToPrevious: () => setPage((prev) => Math.max(0, prev - 1)),
    goToNext: () => setPage((prev) => Math.min(totalPages - 1, prev + 1)),
  };
}
