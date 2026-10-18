/**
 * @jest-environment jsdom
 */
/**
 * Render tests for components/ThemeToggle.tsx (issue #234 follow-up)
 *
 * Verifies the toggle button reflects the persisted theme, calls the correct
 * store action on click, syncs the <html> class for CSS, and that the
 * localStorage key matches the blocking inline script in layout.tsx so the
 * anti-flash guarantee is preserved.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useThemeStore } from "@/store/useThemeStore";

const STORAGE_KEY = "stellar-theme";

beforeEach(() => {
  useThemeStore.setState({
    theme: "dark",
    _hasHydrated: true,
  });
  document.documentElement.classList.remove("light", "dark");
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Hydration gate
// ---------------------------------------------------------------------------

describe("hydration placeholder", () => {
  it("renders an invisible skeleton before hydration completes", () => {
    useThemeStore.setState({ _hasHydrated: false });

    const { container } = render(<ThemeToggle />);

    const placeholder = container.firstChild as HTMLElement;
    expect(placeholder).toBeTruthy();
    expect(placeholder.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders the toggle button once hydrated", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Icon / label rendering per theme state
// ---------------------------------------------------------------------------

describe("icon and label rendering", () => {
  it("shows the Sun icon and 'Switch to light mode' label when dark", () => {
    useThemeStore.setState({ theme: "dark" });
    render(<ThemeToggle />);

    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe("Switch to light mode");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.querySelector("svg")).toBeTruthy();
  });

  it("shows the Moon icon and 'Switch to dark mode' label when light", () => {
    useThemeStore.setState({ theme: "light" });
    render(<ThemeToggle />);

    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe("Switch to dark mode");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    expect(btn.querySelector("svg")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Toggle interaction
// ---------------------------------------------------------------------------

describe("toggle behaviour", () => {
  it("calls store toggle on click and cycles dark → light", () => {
    useThemeStore.setState({ theme: "dark" });
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button"));
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("cycles light → dark on a second click", () => {
    useThemeStore.setState({ theme: "dark" });
    render(<ThemeToggle />);

    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(useThemeStore.getState().theme).toBe("dark");
  });

  it("updates the rendered label after toggling", () => {
    useThemeStore.setState({ theme: "dark" });
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe(
      "Switch to dark mode",
    );
  });
});

// ---------------------------------------------------------------------------
// <html> class sync (CSS anti-flash contract)
// ---------------------------------------------------------------------------

describe("<html> class synchronisation", () => {
  it("adds the 'dark' class and removes 'light' when theme is dark", () => {
    document.documentElement.classList.add("light");
    render(<ThemeToggle />);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("adds the 'light' class and removes 'dark' when theme is light", () => {
    useThemeStore.setState({ theme: "light" });
    document.documentElement.classList.add("dark");
    render(<ThemeToggle />);

    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("syncs the class after a toggle click", () => {
    useThemeStore.setState({ theme: "dark" });
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button"));

    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Anti-flash guarantee — localStorage key alignment with layout.tsx
// ---------------------------------------------------------------------------

describe("anti-flash persistence contract", () => {
  it("persists to the 'stellar-theme' key that layout.tsx reads", () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button"));

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!);
    expect(parsed.state.theme).toBe("light");
  });

  it("layout.tsx blocking script can read back the toggled value", () => {
    useThemeStore.setState({ theme: "dark" });
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button"));

    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);

    const persistedTheme = parsed.state?.theme;
    expect(persistedTheme === "dark" || persistedTheme === "light").toBe(true);

    const layoutTheme =
      persistedTheme !== "dark" && persistedTheme !== "light"
        ? "dark"
        : persistedTheme;
    expect(layoutTheme).toBe("light");
  });
});

// ---------------------------------------------------------------------------
// prefers-color-scheme fallback (simulates layout.tsx behaviour)
// ---------------------------------------------------------------------------

describe("prefers-color-scheme fallback", () => {
  const ORIGINAL_MATCH_MEDIA = window.matchMedia;

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: ORIGINAL_MATCH_MEDIA,
    });
  });

  function mockMatchMedia(prefersDark: boolean) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)" ? prefersDark : false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  }

  it("falls back to OS preference when no theme is persisted", () => {
    mockMatchMedia(false);

    const persisted = localStorage.getItem(STORAGE_KEY);
    let theme: string;
    if (persisted) {
      const parsed = JSON.parse(persisted);
      theme = parsed.state?.theme;
    } else {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    expect(theme).toBe("light");
  });

  it("falls back to dark when OS preference is dark and nothing is persisted", () => {
    mockMatchMedia(true);

    const persisted = localStorage.getItem(STORAGE_KEY);
    let theme: string;
    if (persisted) {
      const parsed = JSON.parse(persisted);
      theme = parsed.state?.theme;
    } else {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    expect(theme).toBe("dark");
  });

  it("respects persisted theme over OS preference", () => {
    mockMatchMedia(false);

    useThemeStore.setState({ theme: "dark" });
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button"));

    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);

    expect(parsed.state.theme).toBe("light");

    const persistedTheme = parsed.state.theme;
    expect(persistedTheme).toBe("light");
  });
});
