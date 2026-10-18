import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  MAX_STORED_RECENT_SEARCHES,
  sanitizeRecentHref,
  sanitizeRecentQuery,
} from "@/lib/recentSearches";

export interface RecentSearch {
  /** Id of the command palette item that was selected. */
  commandId: string;
  /** Label shown for the entry (the command's label at selection time). */
  label: string;
  /** Destination for route commands; absent for actions. */
  href?: string;
  /** The (sanitized) query that led to the selection; empty if none. */
  query: string;
  timestamp: number;
}

interface RecentSearchesState {
  recentSearches: RecentSearch[];
  addRecentSearch: (entry: Omit<RecentSearch, "timestamp">) => void;
  removeRecentSearch: (commandId: string) => void;
  clearRecentSearches: () => void;
}

export const useRecentSearchesStore = create<RecentSearchesState>()(
  persist(
    (set) => ({
      recentSearches: [],
      addRecentSearch: (entry) =>
        set((state) => {
          const next: RecentSearch = {
            commandId: entry.commandId,
            label: entry.label,
            query: sanitizeRecentQuery(entry.query),
            timestamp: Date.now(),
            ...(entry.href ? { href: sanitizeRecentHref(entry.href) } : {}),
          };
          const rest = state.recentSearches.filter((r) => r.commandId !== entry.commandId);
          return { recentSearches: [next, ...rest].slice(0, MAX_STORED_RECENT_SEARCHES) };
        }),
      removeRecentSearch: (commandId) =>
        set((state) => ({
          recentSearches: state.recentSearches.filter((r) => r.commandId !== commandId),
        })),
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    { name: "command-palette-recent-searches" }
  )
);
