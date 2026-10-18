/** @jest-environment jsdom */
import React from "react";
import { render, fireEvent, act } from "@testing-library/react";
import { useRef, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

function TestOverlay({ open, initialFocus, children }: any) {
  const ref = useFocusTrap({ isActive: open, initialFocus });
  return open ? (
    <div ref={ref} role="dialog">
      {children}
    </div>
  ) : null;
}

describe("useFocusTrap basics", () => {
  // Use real timers so requestAnimationFrame runs naturally in jsdom.

  it("moves focus to initial focus and traps Tab within overlay", async () => {
    const { getByText } = render(
      <div>
        <button>outside</button>
        <TestOverlay open={true} initialFocus={"button:first-of-type"}>
          <button>first</button>
          <button>second</button>
        </TestOverlay>
      </div>
    );

    // Wait a microtask to allow the requestAnimationFrame callback to run
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const first = getByText("first") as HTMLButtonElement;
    const second = getByText("second") as HTMLButtonElement;

    expect(document.activeElement?.textContent).toContain("first");

    // Tab should move focus to second
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement?.textContent).toContain("second");

    // Tab should wrap back to first
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement?.textContent).toContain("first");

    // Shift+Tab from first should go to second
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement?.textContent).toContain("second");
  });

  it("restores focus to previous element on close", async () => {
    function Wrapper() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button data-testid="trigger">trigger</button>
          <button onClick={() => setOpen(true)}>reopen</button>
          <TestOverlay open={open} initialFocus={"button:first-of-type"}>
            <button data-testid="inside">inside</button>
          </TestOverlay>
          <button onClick={() => setOpen(false)}>close</button>
        </div>
      );
    }

    const { getByTestId, getByText } = render(<Wrapper />);

    const trigger = getByTestId("trigger") as HTMLButtonElement;

    // Focus the trigger, then open overlay via the reopen button
    trigger.focus();
    const reopen = getByText("reopen") as HTMLButtonElement;
    reopen.click();

    // Wait for rAF scheduled by the hook to run
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const inside = getByTestId("inside") as HTMLButtonElement;

    // inside should be focused
    expect(document.activeElement?.textContent).toContain("inside");

    // Close overlay by clicking close button
    const closeBtn = getByText("close") as HTMLButtonElement;
    closeBtn.click();

    // After unmount, focus should restore to trigger
    expect(document.activeElement?.textContent).toContain("trigger");
  });
});
