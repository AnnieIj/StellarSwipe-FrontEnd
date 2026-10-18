/**
 * @jest-environment jsdom
 */
/**
 * Render tests for components/DataSaverToggle.tsx (issue #408)
 *
 * Verifies the settings toggle reflects and updates the persisted Data Saver
 * state, with an accessible switch role.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { DataSaverToggle } from "@/components/DataSaverToggle";
import { useDataSaverStore } from "@/store/useDataSaverStore";

beforeEach(() => {
  useDataSaverStore.getState().setDataSaverEnabled(false);
});

const SWITCH = { name: /toggle data saver mode/i };

describe("DataSaverToggle", () => {
  it("renders the switch in the off state by default", () => {
    render(<DataSaverToggle />);
    const sw = screen.getByRole("switch", SWITCH);
    expect(sw.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("Data Saver")).toBeTruthy();
  });

  it("enables Data Saver mode when clicked", () => {
    render(<DataSaverToggle />);
    fireEvent.click(screen.getByRole("switch", SWITCH));

    expect(
      screen.getByRole("switch", SWITCH).getAttribute("aria-checked")
    ).toBe("true");
    expect(useDataSaverStore.getState().dataSaverEnabled).toBe(true);
  });

  it("disables Data Saver mode on a second click (immediate, no reload)", () => {
    render(<DataSaverToggle />);
    const sw = screen.getByRole("switch", SWITCH);
    fireEvent.click(sw);
    fireEvent.click(sw);

    expect(useDataSaverStore.getState().dataSaverEnabled).toBe(false);
    expect(
      screen.getByRole("switch", SWITCH).getAttribute("aria-checked")
    ).toBe("false");
  });

  it("reflects an already-enabled store state on mount", () => {
    useDataSaverStore.getState().setDataSaverEnabled(true);
    render(<DataSaverToggle />);
    expect(
      screen.getByRole("switch", SWITCH).getAttribute("aria-checked")
    ).toBe("true");
  });
});
