import {
  DEFAULT_THEME_MODE,
  THEME_STORAGE_KEY,
  type ThemeMode,
  type ThemeStorageLike,
  effectiveTheme,
  isThemeMode,
  parsePersistedTheme,
  readThemePreference,
  resolveThemePreference,
  themeClassName,
  toggleTheme,
  writeThemePreference,
} from "@/lib/themePreference";

function memoryStorage(initial: Record<string, string> = {}): ThemeStorageLike & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

function throwingStorage(): ThemeStorageLike {
  return {
    getItem: () => {
      throw new Error("storage disabled");
    },
    setItem: () => {
      throw new Error("quota exceeded");
    },
    removeItem: () => undefined,
  };
}

describe("parsePersistedTheme – malformed storage never breaks the app", () => {
  it("reads a persisted zustand payload", () => {
    expect(parsePersistedTheme(JSON.stringify({ state: { theme: "dark" } }))).toBe("dark");
  });

  it("ignores an absent, empty or unparsable value", () => {
    expect(parsePersistedTheme(null)).toBeNull();
    expect(parsePersistedTheme("")).toBeNull();
    expect(parsePersistedTheme("{not json")).toBeNull();
    expect(parsePersistedTheme("\"dark\"")).toBeNull();
  });

  it("ignores a payload without a state object", () => {
    expect(parsePersistedTheme(JSON.stringify({ version: 0 }))).toBeNull();
    expect(parsePersistedTheme(JSON.stringify({ state: null }))).toBeNull();
    expect(parsePersistedTheme(JSON.stringify({ state: "dark" }))).toBeNull();
  });

  it("ignores a theme that is not a known mode", () => {
    expect(parsePersistedTheme(JSON.stringify({ state: { theme: "neon" } }))).toBeNull();
  });

  it("validates a mode directly", () => {
    expect(isThemeMode("system")).toBe(true);
    expect(isThemeMode("neon")).toBe(false);
    expect(isThemeMode(1)).toBe(false);
  });
});

describe("preference resolution – an explicit choice always wins", () => {
  it("keeps a stored light or dark choice regardless of the OS", () => {
    expect(resolveThemePreference({ stored: "light", prefersDark: true })).toBe("light");
    expect(resolveThemePreference({ stored: "dark", prefersDark: false })).toBe("dark");
  });

  it("follows the OS when nothing is stored or the choice is system", () => {
    expect(resolveThemePreference({ stored: null, prefersDark: true })).toBe("system");
    expect(resolveThemePreference({ stored: "system", prefersDark: true })).toBe("system");
  });

  it("defaults to following the OS on a first visit", () => {
    expect(DEFAULT_THEME_MODE).toBe("system");
    expect(effectiveTheme(resolveThemePreference({ stored: null, prefersDark: true }), true)).toBe(
      "dark",
    );
  });
});

describe("effectiveTheme and themeClassName", () => {
  it("resolves the mode to a concrete theme", () => {
    expect(effectiveTheme("system", true)).toBe("dark");
    expect(effectiveTheme("system", false)).toBe("light");
    expect(effectiveTheme("dark", false)).toBe("dark");
    expect(effectiveTheme("light", true)).toBe("light");
  });

  it("maps to the class the document root uses", () => {
    expect(themeClassName("dark", false)).toBe("dark");
    expect(themeClassName("light", true)).toBe("");
    expect(themeClassName("system", true)).toBe("dark");
  });
});

describe("toggleTheme", () => {
  it("flips between light and dark", () => {
    expect(toggleTheme("light")).toBe("dark");
    expect(toggleTheme("dark")).toBe("light");
  });

  it("leaves system mode for the explicit dark theme", () => {
    expect(toggleTheme("system")).toBe("dark");
  });
});

describe("storage round trip", () => {
  it("writes and reads the preference under the documented key", () => {
    const storage = memoryStorage();
    expect(writeThemePreference(storage, "dark")).toBe(true);
    expect(storage.data[THEME_STORAGE_KEY]).toBe(
      JSON.stringify({ state: { theme: "dark" } }),
    );
    expect(readThemePreference(storage)).toBe("dark");
  });

  it("keeps other persisted fields in the same payload", () => {
    const storage = memoryStorage({
      [THEME_STORAGE_KEY]: JSON.stringify({
        state: { theme: "light", accentColor: "#3b82f6" },
        version: 0,
      }),
    });
    expect(readThemePreference(storage)).toBe("light");
  });

  it("survives storage that throws instead of crashing the render", () => {
    const storage = throwingStorage();
    expect(readThemePreference(storage)).toBeNull();
    expect(writeThemePreference(storage, "dark")).toBe(false);
  });

  it("reports null when nothing has been stored yet", () => {
    expect(readThemePreference(memoryStorage())).toBeNull();
  });

  it("can be cleared", () => {
    const storage = memoryStorage();
    writeThemePreference(storage, "dark" as ThemeMode);
    storage.removeItem(THEME_STORAGE_KEY);
    expect(readThemePreference(storage)).toBeNull();
  });
});
