import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DateRange } from "@/components/DateRangePicker";
import type { ComparisonGranularity } from "@/lib/comparison";

/**
 * Snapshot of the analytics page view state that can be saved as a named
 * workspace. Fields are kept as serialisable primitives so the store round-
 * trips cleanly through JSON/localStorage.
 */
export interface AnalyticsViewSnapshot {
  /** Date range start — stored as ISO string for JSON-safe persistence. */
  rangeStart: string;
  /** Date range end — stored as ISO string. */
  rangeEnd: string;
  /** Whether the period-comparison panel is expanded. */
  showPeriodComparison: boolean;
  /** Period-comparison granularity. */
  granularity: ComparisonGranularity;
}

/** A persisted named analytics view. */
export interface SavedAnalyticsView {
  id: string;
  name: string;
  snapshot: AnalyticsViewSnapshot;
  createdAt: number;
  updatedAt: number;
}

type MutationResult = { ok: true } | { ok: false; error: string };

const MAX_NAME_LENGTH = 50;
const MAX_VIEWS = 20;

function validateName(
  name: string,
  existing: SavedAnalyticsView[],
  excludeId?: string
): MutationResult {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` };
  }
  const collides = existing.some(
    (v) =>
      v.id !== excludeId &&
      v.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (collides) {
    return { ok: false, error: "A saved view with this name already exists." };
  }
  return { ok: true };
}

interface SavedAnalyticsViewState {
  /** All persisted views, ordered by creation time ascending. */
  views: SavedAnalyticsView[];
  /** ID of the currently active view, or null if none is applied. */
  activeViewId: string | null;

  /**
   * Save the current view state under `name`.
   * Returns `{ ok: false, error }` for validation failures.
   */
  save: (name: string, snapshot: AnalyticsViewSnapshot) => MutationResult;

  /**
   * Apply a saved view (mark it active).
   * Returns the snapshot so callers can hydrate their local UI state.
   * Returns null if the view does not exist.
   */
  apply: (id: string) => AnalyticsViewSnapshot | null;

  /**
   * Rename an existing view.
   * Returns `{ ok: false, error }` for validation failures.
   */
  rename: (id: string, name: string) => MutationResult;

  /**
   * Overwrite the snapshot of an existing view with the current state.
   * Returns `{ ok: false, error }` if the view is not found.
   */
  update: (id: string, snapshot: AnalyticsViewSnapshot) => MutationResult;

  /** Delete a saved view. Clears activeViewId if it matches. */
  remove: (id: string) => void;

  /** Deselect the active view without deleting it. */
  clearActive: () => void;
}

export const useSavedAnalyticsViewStore = create<SavedAnalyticsViewState>()(
  persist(
    (set, get) => ({
      views: [],
      activeViewId: null,

      save: (name, snapshot) => {
        const trimmed = name.trim();
        const { views } = get();

        if (views.length >= MAX_VIEWS) {
          return {
            ok: false,
            error: `You can save at most ${MAX_VIEWS} views. Delete one to continue.`,
          };
        }

        const validation = validateName(trimmed, views);
        if (!validation.ok) return validation;

        const now = Date.now();
        set((state) => ({
          views: [
            ...state.views,
            {
              id: `view-${now}-${Math.random().toString(36).slice(2, 8)}`,
              name: trimmed,
              snapshot,
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
        return { ok: true };
      },

      apply: (id) => {
        const view = get().views.find((v) => v.id === id);
        if (!view) return null;
        set({ activeViewId: id });
        return view.snapshot;
      },

      rename: (id, name) => {
        const trimmed = name.trim();
        const { views } = get();
        const target = views.find((v) => v.id === id);
        if (!target) return { ok: false, error: "Saved view not found." };

        const validation = validateName(trimmed, views, id);
        if (!validation.ok) return validation;

        set((state) => ({
          views: state.views.map((v) =>
            v.id === id ? { ...v, name: trimmed, updatedAt: Date.now() } : v
          ),
        }));
        return { ok: true };
      },

      update: (id, snapshot) => {
        const { views } = get();
        if (!views.find((v) => v.id === id)) {
          return { ok: false, error: "Saved view not found." };
        }
        set((state) => ({
          views: state.views.map((v) =>
            v.id === id ? { ...v, snapshot, updatedAt: Date.now() } : v
          ),
        }));
        return { ok: true };
      },

      remove: (id) => {
        set((state) => ({
          views: state.views.filter((v) => v.id !== id),
          activeViewId: state.activeViewId === id ? null : state.activeViewId,
        }));
      },

      clearActive: () => set({ activeViewId: null }),
    }),
    { name: "saved-analytics-views" }
  )
);

/**
 * Helper: convert an AnalyticsViewSnapshot's date strings back to Date objects
 * for use with DateRangePicker.
 */
export function snapshotToDateRange(snapshot: AnalyticsViewSnapshot): DateRange {
  return {
    start: new Date(snapshot.rangeStart),
    end: new Date(snapshot.rangeEnd),
  };
}
