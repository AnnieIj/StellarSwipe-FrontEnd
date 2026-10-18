import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FilterDirection, FeedSortOrder } from "./useSignalFilterStore";

export interface SavedFilterSnapshot {
  direction: FilterDirection;
  asset: string;
  provider: string;
  bookmarkedOnly: boolean;
  sortOrder: FeedSortOrder;
}

export type SavedFilterScope = "signals";

export interface SavedFilter {
  id: string;
  name: string;
  scope: SavedFilterScope;
  filter: SavedFilterSnapshot;
  createdAt: number;
}

type MutationResult = { ok: true } | { ok: false; error: string };

const MAX_NAME_LENGTH = 40;

function validateName(
  name: string,
  scope: SavedFilterScope,
  existing: SavedFilter[],
  excludeId?: string
): MutationResult {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` };
  }
  const collides = existing.some(
    (f) =>
      f.id !== excludeId &&
      f.scope === scope &&
      f.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (collides) return { ok: false, error: "A saved filter with this name already exists." };
  return { ok: true };
}

interface SavedFilterState {
  savedFilters: SavedFilter[];
  save: (
    name: string,
    scope: SavedFilterScope,
    filter: SavedFilterSnapshot
  ) => MutationResult;
  rename: (id: string, name: string) => MutationResult;
  remove: (id: string) => void;
}

export const useSavedFilterStore = create<SavedFilterState>()(
  persist(
    (set, get) => ({
      savedFilters: [],
      save: (name, scope, filter) => {
        const trimmed = name.trim();
        const result = validateName(trimmed, scope, get().savedFilters);
        if (!result.ok) return result;
        set((state) => ({
          savedFilters: [
            ...state.savedFilters,
            {
              id: `filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              name: trimmed,
              scope,
              filter,
              createdAt: Date.now(),
            },
          ],
        }));
        return { ok: true };
      },
      rename: (id, name) => {
        const target = get().savedFilters.find((f) => f.id === id);
        if (!target) return { ok: false, error: "Saved filter not found." };
        const trimmed = name.trim();
        const result = validateName(trimmed, target.scope, get().savedFilters, id);
        if (!result.ok) return result;
        set((state) => ({
          savedFilters: state.savedFilters.map((f) =>
            f.id === id ? { ...f, name: trimmed } : f
          ),
        }));
        return { ok: true };
      },
      remove: (id) =>
        set((state) => ({
          savedFilters: state.savedFilters.filter((f) => f.id !== id),
        })),
    }),
    { name: "saved-filter-store" }
  )
);
