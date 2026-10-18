"use client";

/**
 * useQuickActions
 *
 * Unified hook for common signal-level "quick actions" that benefit from
 * optimistic UI updates:
 *   - Bookmark / unbookmark a signal
 *   - Snooze / unsnooze a signal
 *   - Follow / unfollow a signal provider
 *
 * Each action immediately reflects the user's intent in local state, then
 * syncs with the server. If the server call fails, the state is rolled back
 * and a descriptive toast is shown with an optional retry action.
 *
 * Inspired by the optimistic patterns in ActiveSessionsPanel and
 * useNotificationStore.
 */

import { useCallback, useState } from "react";
import { toast } from "@/lib/toast";
import {
  beginBookmarkRequest,
  settleBookmarkRequest,
  useBookmarkStore,
} from "@/store/useBookmarkStore";
import { useSnoozeStore } from "@/store/useSnoozeStore";
import { saveBookmark, removeBookmark as removeBookmarkApi } from "@/lib/bookmarkApi";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuickAction = "bookmark" | "snooze" | "follow";

export interface QuickActionState {
  /** The id of the signal currently being processed, or null. */
  pendingAction: {
    signalId: string;
    action: QuickAction;
  } | null;
  /** The last error keyed by signal-id, or null. */
  errors: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useQuickActions() {
  const [state, setState] = useState<QuickActionState>({
    pendingAction: null,
    errors: {},
  });

  const addBookmark = useBookmarkStore((state) => state.addBookmark);
  const removeBookmark = useBookmarkStore((state) => state.removeBookmark);
  const hasBookmark = useBookmarkStore((state) => state.hasBookmark);
  const snoozeSignal = useSnoozeStore((state) => state.snoozeSignal);
  const unsnoozeSignal = useSnoozeStore((state) => state.unsnoozeSignal);

  // ── Bookmark / Unbookmark ──────────────────────────────────────────

  const toggleBookmark = useCallback(
    async (signalId: string, label: string) => {
      const isBookmarked = hasBookmark(signalId);
      const seq = beginBookmarkRequest(signalId);

      // Optimistic: toggle immediately
      if (isBookmarked) {
        removeBookmark(signalId);
      } else {
        addBookmark(signalId);
      }

      setState((prev) => ({
        ...prev,
        pendingAction: { signalId, action: "bookmark" },
        errors: { ...prev.errors, [signalId]: "" },
      }));

      try {
        if (isBookmarked) {
          await removeBookmarkApi(signalId);
        } else {
          await saveBookmark(signalId);
        }
        const { isLatest } = settleBookmarkRequest(signalId, seq, {
          ok: true,
          target: !isBookmarked,
          prior: isBookmarked,
        });
        if (!isLatest) return;
        setState((prev) => ({ ...prev, pendingAction: null }));
        toast.success(isBookmarked ? "Bookmark removed" : "Bookmarked", {
          description: isBookmarked
            ? `${label} removed from saved signals.`
            : `${label} saved to your bookmarks.`,
          duration: 2500,
        });
      } catch (err) {
        const { isLatest, restoreTo } = settleBookmarkRequest(signalId, seq, {
          ok: false,
          target: !isBookmarked,
          prior: isBookmarked,
        });
        // A newer toggle supersedes this one; let it settle the UI.
        if (!isLatest) return;
        // Rollback to the last server-confirmed state
        if (restoreTo) {
          addBookmark(signalId);
        } else {
          removeBookmark(signalId);
        }
        const message =
          err instanceof Error ? err.message : "Sync failed. Your changes are saved locally.";
        setState((prev) => ({
          ...prev,
          pendingAction: null,
          errors: { ...prev.errors, [signalId]: message },
        }));
        toast.error("Sync delayed", {
          description: message,
          duration: 4000,
        });
      }
    },
    [addBookmark, removeBookmark, hasBookmark]
  );

  // ── Snooze / Unsnooze ──────────────────────────────────────────────

  const snooze = useCallback(
    (signalId: string, label: string, durationMs?: number) => {
      // Optimistic: hide immediately
      snoozeSignal(signalId, durationMs);

      toast.info("Signal snoozed", {
        description: `${label} is hidden temporarily.`,
        duration: 4500,
        action: {
          label: "Undo",
          onClick: () => unsnoozeSignal(signalId),
        },
      });
    },
    [snoozeSignal, unsnoozeSignal]
  );

  const unsnooze = useCallback(
    (signalId: string) => {
      unsnoozeSignal(signalId);
    },
    [unsnoozeSignal]
  );

  // ── Clear errors ───────────────────────────────────────────────────

  const clearError = useCallback((signalId: string) => {
    setState((prev) => {
      const { [signalId]: _omit, ...rest } = prev.errors;
      return { ...prev, errors: rest };
    });
  }, []);

  return {
    toggleBookmark,
    snooze,
    unsnooze,
    clearError,
    /** True while any quick action is in flight. */
    isPending: state.pendingAction !== null,
    pendingAction: state.pendingAction,
    errors: state.errors,
  };
}
