export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "stellar-theme";
export const THEME_MODES: readonly ThemeMode[] = ["light", "dark", "system"];
export const DEFAULT_THEME_MODE: ThemeMode = "system";

export interface ThemeStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && (THEME_MODES as readonly string[]).includes(value);
}

export function parsePersistedTheme(raw: string | null): ThemeMode | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const state = (parsed as { state?: unknown }).state;
  if (typeof state !== "object" || state === null) return null;
  const theme = (state as { theme?: unknown }).theme;
  return isThemeMode(theme) ? theme : null;
}

export function readThemePreference(storage: ThemeStorageLike): ThemeMode | null {
  try {
    return parsePersistedTheme(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeThemePreference(
  storage: ThemeStorageLike,
  mode: ThemeMode,
): boolean {
  try {
    storage.setItem(THEME_STORAGE_KEY, JSON.stringify({ state: { theme: mode } }));
    return true;
  } catch {
    return false;
  }
}

export function resolveThemePreference(options: {
  stored: ThemeMode | null;
  prefersDark: boolean;
}): ThemeMode {
  if (options.stored === "light" || options.stored === "dark") return options.stored;
  return options.stored ?? DEFAULT_THEME_MODE;
}

export function effectiveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (mode === "system") return prefersDark ? "dark" : "light";
  return mode;
}

export function toggleTheme(mode: ThemeMode): ThemeMode {
  if (mode === "system") return "dark";
  return mode === "dark" ? "light" : "dark";
}

export function themeClassName(mode: ThemeMode, prefersDark: boolean): string {
  return effectiveTheme(mode, prefersDark) === "dark" ? "dark" : "";
}
