/**
 * optimisticUtils.ts
 *
 * Reusable helpers for implementing optimistic UI updates with automatic
 * rollback on failure.  These standardise the snapshot–try–rollback pattern
 * already used throughout the codebase (ActiveSessionsPanel, NotificationStore).
 *
 * @example
 *   const { execute } = useOptimisticAction({
 *     run: () => api.deleteJournalEntry(id),
 *     onOptimistic: () => store.removeEntry(id),
 *     onRollback: () => store.restoreEntry(id, snapshot),
 *     successMessage: "Entry deleted",
 *   });
 *
 *   // In an event handler:
 *   await execute();
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OptimisticActionOptions<TData, TSnapshot = unknown> {
  /** The async operation to perform (API call, blockchain tx, etc.). */
  run: () => Promise<TData>;

  /**
   * Synchronous callback invoked **before** `run` — apply the optimistic
   * state change here (e.g. remove an item, increment a counter).
   * Return a snapshot that can be passed to `onRollback`.
   */
  onOptimistic: () => TSnapshot;

  /**
   * Called if `run` throws — restore the snapshot so the UI reverts to the
   * pre-optimistic state.
   */
  onRollback: (snapshot: TSnapshot, error: unknown) => void;

  /** Optional success toast message. */
  successMessage?: string;

  /** Optional error toast message (defaults to a generic message). */
  errorMessage?: string;

  /** Called after a successful run (e.g. invalidate query cache). */
  onSuccess?: (data: TData) => void;

  /** Called after a failed run (after rollback). */
  onError?: (error: unknown) => void;
}

// ---------------------------------------------------------------------------
// Hook-based executor (preferred inside React components)
// ---------------------------------------------------------------------------

import { useCallback, useState } from "react";

export interface OptimisticActionState {
  /** True while the async `run` is in flight. */
  isPending: boolean;
  /** The last error caught, or null. */
  error: unknown;
}

/**
 * React hook that wraps an optimistic-update flow.
 *
 * Returns `execute` — call it from event handlers — and reactive `isPending`
 * / `error` values for loading spinners and inline error displays.
 */
export function useOptimisticAction<TData, TSnapshot = unknown>(
  options: OptimisticActionOptions<TData, TSnapshot>
) {
  const { run, onOptimistic, onRollback, onSuccess, onError } = options;
  const [state, setState] = useState<OptimisticActionState>({
    isPending: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ isPending: true, error: null });

    const snapshot = onOptimistic();

    try {
      const data = await run();
      setState({ isPending: false, error: null });
      onSuccess?.(data);
      return data;
    } catch (err) {
      onRollback(snapshot, err);
      setState({ isPending: false, error: err });
      onError?.(err);
      throw err;
    }
  }, [run, onOptimistic, onRollback, onSuccess, onError]);

  return { execute, ...state };
}

// ---------------------------------------------------------------------------
// Standalone executor (useful outside React, e.g. in store actions)
// ---------------------------------------------------------------------------

/**
 * Low-level optimistic-update executor that does not require React hooks.
 *
 * Returns the data on success, or throws after rolling back on failure.
 *
 * @example
 *   const data = await optimisticExecutor({
 *     run: () => api.saveBookmark(id),
 *     onOptimistic: () => { store.addBookmark(id); },
 *     onRollback:  (err) => { store.removeBookmark(id); },
 *   });
 */
export async function optimisticExecutor<TData>(
  options: Omit<OptimisticActionOptions<TData, void>, "successMessage" | "errorMessage" | "onSuccess" | "onError">
): Promise<TData> {
  const { run, onOptimistic, onRollback } = options;

  const snapshot = onOptimistic();

  try {
    const data = await run();
    return data;
  } catch (err) {
    onRollback(snapshot, err);
    throw err;
  }
}
