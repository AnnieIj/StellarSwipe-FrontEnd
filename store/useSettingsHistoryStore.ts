import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  MAX_HISTORY_ENTRIES,
  type SettingsHistoryEntry,
} from "@/lib/settingsHistory";

/**
 * useSettingsHistoryStore
 * ───────────────────────
 * Recent preference changes, newest first (#900). Entries for sensitive
 * settings are stored already redacted, so no secret ever reaches storage.
 */
interface SettingsHistoryState {
  entries: SettingsHistoryEntry[];
  record: (entry: SettingsHistoryEntry) => void;
  clear: () => void;
}

export const useSettingsHistoryStore = create<SettingsHistoryState>()(
  persist(
    (set) => ({
      entries: [],
      record: (entry) =>
        set((state) => ({
          entries: [entry, ...state.entries].slice(0, MAX_HISTORY_ENTRIES),
        })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: "settings-history",
      partialize: (state) => ({ entries: state.entries }),
    }
  )
);
