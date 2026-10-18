import { create } from "zustand";
import { persist } from "zustand/middleware";

export const CONTRAST_STORAGE_KEY = "stellar-contrast";
export const HIGH_CONTRAST_CLASS = "high-contrast";
/** Briefly applied while swapping themes so no half-transitioned colors paint. */
const THEME_SWITCHING_CLASS = "theme-switching";

/**
 * Applies or removes the high-contrast class on <html> in a single frame.
 * Transitions are suspended for the swap so elements with `transition-colors`
 * don't animate through an unreadable intermediate state.
 */
export function applyHighContrastClass(enabled: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add(THEME_SWITCHING_CLASS);
  root.classList.toggle(HIGH_CONTRAST_CLASS, enabled);
  // Force a style flush with transitions disabled, then re-enable them.
  void root.offsetHeight;
  window.requestAnimationFrame(() => root.classList.remove(THEME_SWITCHING_CLASS));
}

interface ContrastState {
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  /** Restore the default (non high-contrast) theme. */
  resetContrast: () => void;
}

/**
 * Persisted high-contrast preference (#788). The layout's blocking inline
 * script reads `stellar-contrast` before first paint, so a returning user
 * never sees the default theme flash before high contrast applies.
 */
export const useContrastStore = create<ContrastState>()(
  persist(
    (set) => ({
      highContrast: false,
      setHighContrast: (enabled) => {
        applyHighContrastClass(enabled);
        set({ highContrast: enabled });
      },
      resetContrast: () => {
        applyHighContrastClass(false);
        set({ highContrast: false });
      },
    }),
    {
      name: CONTRAST_STORAGE_KEY,
      partialize: (state) => ({ highContrast: state.highContrast }),
      onRehydrateStorage: () => (state) => {
        if (state) applyHighContrastClass(state.highContrast);
      },
    }
  )
);
