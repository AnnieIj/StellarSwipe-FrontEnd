/** @jest-environment jsdom */
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "@/components/CommandPalette";
import { useRouter } from "next/navigation";
import { useThemeStore } from "@/store/useThemeStore";
import { useRecentSearchesStore } from "@/store/useRecentSearchesStore";
import { MAX_VISIBLE_RECENT_SEARCHES } from "@/lib/recentSearches";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/store/useThemeStore", () => ({
  useThemeStore: jest.fn(),
}));

const PLACEHOLDER = "Search routes and actions…";

function seed(entries: { commandId: string; label: string; href?: string; query: string }[]) {
  act(() => {
    // Added oldest first so the first entry ends up most recent.
    [...entries].reverse().forEach((e) => useRecentSearchesStore.getState().addRecentSearch(e));
  });
}

describe("CommandPalette recent searches", () => {
  const mockPush = jest.fn();
  const mockToggleTheme = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    useRecentSearchesStore.setState({ recentSearches: [] });
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useThemeStore as unknown as jest.Mock).mockReturnValue({ toggle: mockToggleTheme });
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    (window.requestAnimationFrame as jest.Mock).mockRestore();
  });

  it("hides the recent section when there is no history", () => {
    render(<CommandPalette open={true} onClose={mockOnClose} />);
    expect(screen.queryByRole("group", { name: "Recent" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear recent searches" })).not.toBeInTheDocument();
  });

  it("records a selection with its query and shows it next time", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CommandPalette open={true} onClose={mockOnClose} />);

    await user.type(screen.getByPlaceholderText(PLACEHOLDER), "tax");
    await user.keyboard("{Enter}");
    expect(mockPush).toHaveBeenCalledWith("/tax-report");

    rerender(<CommandPalette open={false} onClose={mockOnClose} />);
    rerender(<CommandPalette open={true} onClose={mockOnClose} />);

    const recent = screen.getByRole("group", { name: "Recent" });
    const option = within(recent).getByRole("option");
    expect(option).toHaveAccessibleName("Tax Report, searched “tax”");
  });

  it("limits the number of recent entries shown", () => {
    seed(
      ["home", "signals", "bookmarks", "providers", "compare", "referral", "security"].map((id) => ({
        commandId: id,
        label: id,
        href: `/${id}`,
        query: "",
      }))
    );
    render(<CommandPalette open={true} onClose={mockOnClose} />);

    const recent = screen.getByRole("group", { name: "Recent" });
    expect(within(recent).getAllByRole("option")).toHaveLength(MAX_VISIBLE_RECENT_SEARCHES);
  });

  it("selecting a recent entry navigates to its stored destination and keeps its query", async () => {
    const user = userEvent.setup();
    seed([{ commandId: "backtest", label: "Backtest Simulator", href: "/backtest-sim", query: "sim" }]);
    render(<CommandPalette open={true} onClose={mockOnClose} />);

    // The recent entry is first and active by default.
    await user.keyboard("{Enter}");

    expect(mockPush).toHaveBeenCalledWith("/backtest-sim");
    expect(mockOnClose).toHaveBeenCalled();
    expect(useRecentSearchesStore.getState().recentSearches[0]).toMatchObject({
      commandId: "backtest",
      query: "sim",
    });
  });

  it("removes the highlighted recent entry with the Delete key", async () => {
    const user = userEvent.setup();
    seed([
      { commandId: "compare", label: "Compare", href: "/compare", query: "" },
      { commandId: "security", label: "Security", href: "/security", query: "" },
    ]);
    render(<CommandPalette open={true} onClose={mockOnClose} />);

    await user.keyboard("{Delete}");

    const recent = screen.getByRole("group", { name: "Recent" });
    expect(within(recent).getAllByRole("option")).toHaveLength(1);
    expect(within(recent).getByRole("option")).toHaveTextContent("Security");
    expect(screen.getByRole("status")).toHaveTextContent("Removed Compare from recent searches");
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toHaveFocus();
  });

  it("removes an individual entry with its remove button", async () => {
    const user = userEvent.setup();
    seed([{ commandId: "compare", label: "Compare", href: "/compare", query: "" }]);
    render(<CommandPalette open={true} onClose={mockOnClose} />);

    await user.click(screen.getByRole("button", { name: "Remove Compare from recent searches" }));

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.queryByRole("group", { name: "Recent" })).not.toBeInTheDocument();
  });

  it("clears the full history", async () => {
    const user = userEvent.setup();
    seed([
      { commandId: "compare", label: "Compare", href: "/compare", query: "" },
      { commandId: "security", label: "Security", href: "/security", query: "" },
    ]);
    render(<CommandPalette open={true} onClose={mockOnClose} />);

    await user.click(screen.getByRole("button", { name: "Clear recent searches" }));

    expect(useRecentSearchesStore.getState().recentSearches).toHaveLength(0);
    expect(screen.queryByRole("group", { name: "Recent" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Recent searches cleared");
  });

  it("never stores sensitive queries or URL parameters", () => {
    act(() => {
      useRecentSearchesStore.getState().addRecentSearch({
        commandId: "security",
        label: "Security",
        href: "/security?token=abc123",
        query: "my secret seed",
      });
    });

    const [entry] = useRecentSearchesStore.getState().recentSearches;
    expect(entry).toMatchObject({ commandId: "security", href: "/security", query: "" });
    expect(localStorage.getItem("command-palette-recent-searches")).not.toMatch(/secret|abc123/);
  });

  it("hides recent entries while typing and supports arrow navigation across sections", async () => {
    const user = userEvent.setup();
    seed([{ commandId: "compare", label: "Compare", href: "/compare", query: "" }]);
    render(<CommandPalette open={true} onClose={mockOnClose} />);

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("option")[1]).toHaveTextContent("Home");

    await user.type(screen.getByPlaceholderText(PLACEHOLDER), "home");
    expect(screen.queryByRole("group", { name: "Recent" })).not.toBeInTheDocument();
  });
});
