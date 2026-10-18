/** @jest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/react";
import { KeyboardShortcutsHelpModal } from "@/components/KeyboardShortcutsHelpModal";

describe("KeyboardShortcutsHelpModal", () => {
  it("renders the keyboard shortcuts list with all sections", () => {
    render(<KeyboardShortcutsHelpModal open={true} onClose={jest.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument();

    // Section headers
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getByText("Modals & Overlays")).toBeInTheDocument();

    // Key shortcuts that should be present
    expect(screen.getByText("Escape")).toBeInTheDocument();
    expect(screen.getByText("Close any open modal or overlay")).toBeInTheDocument();
    expect(screen.getByText("Go to Signals feed")).toBeInTheDocument();
    expect(screen.getByText("Open command palette")).toBeInTheDocument();
  });

  it("closes when Escape is pressed inside the dialog", () => {
    const onClose = jest.fn();
    render(<KeyboardShortcutsHelpModal open={true} onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the backdrop is clicked", () => {
    const onClose = jest.fn();
    render(<KeyboardShortcutsHelpModal open={true} onClose={onClose} />);

    fireEvent.click(screen.getByTestId("keyboard-shortcuts-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render when closed", () => {
    render(<KeyboardShortcutsHelpModal open={false} onClose={jest.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when ? is pressed while the dialog has focus", () => {
    const onClose = jest.fn();
    render(<KeyboardShortcutsHelpModal open={true} onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "?" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders multi-key shortcuts with readable labels for assistive tech", () => {
    render(<KeyboardShortcutsHelpModal open={true} onClose={jest.fn()} />);

    expect(screen.getByText("Arrow Up or Arrow Down")).toBeInTheDocument();
    expect(screen.getByText("G then N")).toBeInTheDocument();
    expect(screen.getByText("Command+K or Ctrl+K")).toBeInTheDocument();
  });

  describe("focus management", () => {
    // jsdom has no layout, so offsetParent is always null; the focus trap
    // uses it to skip hidden elements.
    const originalOffsetParent = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetParent"
    );
    beforeAll(() => {
      Object.defineProperty(HTMLElement.prototype, "offsetParent", {
        configurable: true,
        get() {
          return document.body;
        },
      });
    });
    afterAll(() => {
      if (originalOffsetParent) {
        Object.defineProperty(HTMLElement.prototype, "offsetParent", originalOffsetParent);
      }
    });

    it("moves focus into the dialog on open and back to the trigger on close", () => {
      const trigger = document.createElement("button");
      trigger.textContent = "Open shortcuts";
      document.body.appendChild(trigger);
      trigger.focus();

      const { rerender } = render(
        <KeyboardShortcutsHelpModal open={true} onClose={jest.fn()} />
      );
      expect(screen.getByRole("button", { name: "Close keyboard shortcuts" })).toHaveFocus();

      rerender(<KeyboardShortcutsHelpModal open={false} onClose={jest.fn()} />);
      expect(trigger).toHaveFocus();

      document.body.removeChild(trigger);
    });
  });
});
