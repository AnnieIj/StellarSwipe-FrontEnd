"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";
export type ChartPalette = "default" | "colorblind";

/** Default accent color applied to --color-accent CSS custom property */
export const DEFAULT_ACCENT_COLOR = "#3b82f6";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem("stellar-theme");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.theme === "light" || parsed?.state?.theme === "dark") {
        return parsed.state.theme;
      }
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch {
    return "dark";
  }
}

function getInitialExplicitChoice(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem("stellar-theme");
    if (stored) {
      const parsed = JSON.parse(stored);
      return typeof parsed?.state?.hasExplicitChoice === "boolean"
        ? parsed.state.hasExplicitChoice
        : !!parsed?.state?.theme;
    }
    return false;
  } catch {
    return false;
  }
}

interface ThemeState {
  theme: Theme;
  accentColor: string;
  chartPalette: ChartPalette;
  hasExplicitChoice: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  setTheme: (theme: Theme) => void;
  setSystemTheme: (theme: Theme) => void;
  toggle: () => void;
  setAccentColor: (color: string) => void;
  setChartPalette: (palette: ChartPalette) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: getInitialTheme(),
      accentColor: DEFAULT_ACCENT_COLOR,
      chartPalette: "default",
      hasExplicitChoice: getInitialExplicitChoice(),
      _hasHydrated: false,
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
      setTheme: (theme) => set({ theme, hasExplicitChoice: true }),
      setSystemTheme: (theme) => {
        if (!get().hasExplicitChoice) {
          set({ theme });
        }
      },
      toggle: () => {
        const nextTheme = get().theme === "dark" ? "light" : "dark";
        set({ theme: nextTheme, hasExplicitChoice: true });
      },
      setAccentColor: (color) => set({ accentColor: color }),
      setChartPalette: (chartPalette) => set({ chartPalette }),
    }),
    {
      name: "stellar-theme",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/** Returns `true` once localStorage has been read and state is stable. */
export const useThemeHydrated = () => useThemeStore((s) => s._hasHydrated);
