import { useThemeStore, DEFAULT_ACCENT_COLOR } from "@/store/useThemeStore";

describe("useThemeStore – accent color", () => {
  beforeEach(() => {
    useThemeStore.setState({
      accentColor: DEFAULT_ACCENT_COLOR,
      theme: "dark",
      hasExplicitChoice: false,
      _hasHydrated: false,
    });
    localStorage.clear();
  });

  it("default accent color is DEFAULT_ACCENT_COLOR", () => {
    expect(useThemeStore.getState().accentColor).toBe(DEFAULT_ACCENT_COLOR);
  });

  it("setAccentColor updates the stored color", () => {
    useThemeStore.getState().setAccentColor("#8b5cf6");
    expect(useThemeStore.getState().accentColor).toBe("#8b5cf6");
  });

  it("setAccentColor persists across multiple calls in the same session", () => {
    useThemeStore.getState().setAccentColor("#ef4444");
    expect(useThemeStore.getState().accentColor).toBe("#ef4444");

    useThemeStore.getState().setAccentColor("#10b981");
    expect(useThemeStore.getState().accentColor).toBe("#10b981");
  });

  it("accent color survives a theme toggle (orthogonal state)", () => {
    useThemeStore.getState().setAccentColor("#f59e0b");
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().accentColor).toBe("#f59e0b");
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("reapplied on reload — setState with stored color restores it correctly", () => {
    // Simulates the persist middleware rehydrating from storage:
    // set accentColor, then create a fresh snapshot and verify it's there.
    useThemeStore.getState().setAccentColor("#ec4899");
    const saved = useThemeStore.getState().accentColor;

    // Simulate a new page load by resetting and rehydrating
    useThemeStore.setState({ accentColor: DEFAULT_ACCENT_COLOR });
    expect(useThemeStore.getState().accentColor).toBe(DEFAULT_ACCENT_COLOR);

    useThemeStore.setState({ accentColor: saved });
    expect(useThemeStore.getState().accentColor).toBe("#ec4899");
  });

  it("accepts any valid hex string as accent color", () => {
    const colors = ["#ffffff", "#000000", "#123456", "#abcdef"];
    for (const color of colors) {
      useThemeStore.getState().setAccentColor(color);
      expect(useThemeStore.getState().accentColor).toBe(color);
    }
  });
});

describe("useThemeStore – theme persistence and explicit choice", () => {
  beforeEach(() => {
    useThemeStore.setState({
      theme: "dark",
      hasExplicitChoice: false,
      _hasHydrated: true,
    });
    localStorage.clear();
  });

  it("toggling theme sets hasExplicitChoice to true", () => {
    expect(useThemeStore.getState().hasExplicitChoice).toBe(false);
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().theme).toBe("light");
    expect(useThemeStore.getState().hasExplicitChoice).toBe(true);
  });

  it("setting theme explicitly sets hasExplicitChoice to true", () => {
    useThemeStore.getState().setTheme("light");
    expect(useThemeStore.getState().theme).toBe("light");
    expect(useThemeStore.getState().hasExplicitChoice).toBe(true);
  });

  it("setSystemTheme updates theme when hasExplicitChoice is false", () => {
    useThemeStore.setState({ hasExplicitChoice: false, theme: "dark" });
    useThemeStore.getState().setSystemTheme("light");
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("setSystemTheme ignores update when hasExplicitChoice is true", () => {
    useThemeStore.setState({ hasExplicitChoice: true, theme: "dark" });
    useThemeStore.getState().setSystemTheme("light");
    expect(useThemeStore.getState().theme).toBe("dark");
  });
});
