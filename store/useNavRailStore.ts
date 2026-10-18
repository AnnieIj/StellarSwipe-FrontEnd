import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * #757 – Collapsible desktop navigation rail
 *
 * Persists the user's preferred collapsed/expanded state for the desktop nav
 * rail.  Mobile navigation is unaffected by this setting.
 */
interface NavRailState {
  /** Whether the desktop nav rail is collapsed to icon-only mode. */
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (value: boolean) => void;
}

export const useNavRailStore = create<NavRailState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (value) => set({ collapsed: value }),
    }),
    { name: "nav-rail-collapsed" }
  )
);
