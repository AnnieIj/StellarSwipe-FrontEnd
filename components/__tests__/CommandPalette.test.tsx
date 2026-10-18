/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "@/components/CommandPalette";
import { useRouter } from "next/navigation";
import { useThemeStore } from "@/store/useThemeStore";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/store/useThemeStore", () => ({
  useThemeStore: jest.fn(),
}));

describe("CommandPalette", () => {
  const mockPush = jest.fn();
  const mockToggleTheme = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useThemeStore as unknown as jest.Mock).mockReturnValue({
      toggle: mockToggleTheme,
    });
    // Mock requestAnimationFrame for focus tests
    jest
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      });
  });

  afterEach(() => {
    (window.requestAnimationFrame as jest.Mock).mockRestore();
  });

  it("renders correctly when open and handles escape to close", async () => {
    const user = userEvent.setup();
    render(<CommandPalette open={true} onClose={mockOnClose} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("filters the visible command list correctly when typing a query", async () => {
    const user = userEvent.setup();
    render(<CommandPalette open={true} onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText("Search routes and actions…");
    await user.type(input, "tax");

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Tax Report");
  });

  it("shows an empty state when no commands match", async () => {
    const user = userEvent.setup();
    render(<CommandPalette open={true} onClose={mockOnClose} />);

    const input = screen.getByPlaceholderText("Search routes and actions…");
    await user.type(input, "somethingnotmatching");

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(
      screen.getByText('No results for "somethingnotmatching"')
    ).toBeInTheDocument();
  });

  it("navigates with Arrow Up/Down and clamps at boundaries", async () => {
    const user = userEvent.setup();
    render(<CommandPalette open={true} onClose={mockOnClose} />);

    // Initially, the first item is selected (Home)
    let options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    // Move down
    await user.keyboard("{ArrowDown}");
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    expect(options[1]).toHaveAttribute("aria-selected", "true"); // Signals

    // Move up
    await user.keyboard("{ArrowUp}");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    expect(options[1]).toHaveAttribute("aria-selected", "false");

    // Clamp at top
    await user.keyboard("{ArrowUp}");
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    // Clamp at bottom
    for (let i = 0; i < options.length + 2; i++) {
      await user.keyboard("{ArrowDown}");
    }
    options = screen.getAllByRole("option");
    expect(options[options.length - 1]).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("activates the selected command and closes the palette on Enter", async () => {
    const user = userEvent.setup();
    render(<CommandPalette open={true} onClose={mockOnClose} />);

    // Select second item "Signals" (href: "/signals")
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(mockPush).toHaveBeenCalledWith("/signals");
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("focus moves to input on open and returns to triggering element on close", () => {
    const triggerBtn = document.createElement("button");
    triggerBtn.textContent = "Trigger";
    document.body.appendChild(triggerBtn);
    triggerBtn.focus();

    expect(document.activeElement).toBe(triggerBtn);

    const { rerender } = render(
      <CommandPalette open={true} onClose={mockOnClose} />
    );

    const input = screen.getByPlaceholderText("Search routes and actions…");
    expect(document.activeElement).toBe(input);

    rerender(<CommandPalette open={false} onClose={mockOnClose} />);
    expect(document.activeElement).toBe(triggerBtn);

    document.body.removeChild(triggerBtn);
  });
});
