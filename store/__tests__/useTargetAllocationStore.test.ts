/**
 * Tests for useTargetAllocationStore + TargetAllocationEditor (#798)
 *
 * Covers: editing targets, persistence, invalid totals (validation message),
 * overlay toggle, and accessible labels.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { act } from "react";

// ── Store tests ───────────────────────────────────────────────────────────────
import { useTargetAllocationStore } from "@/store/useTargetAllocationStore";

describe("useTargetAllocationStore", () => {
  beforeEach(() => {
    // Reset store between tests
    useTargetAllocationStore.setState({
      targets: {},
      overlayVisible: false,
    });
  });

  it("starts empty and overlay off", () => {
    const s = useTargetAllocationStore.getState();
    expect(s.targets).toEqual({});
    expect(s.overlayVisible).toBe(false);
  });

  it("setTarget adds a symbol with the given percentage", () => {
    act(() => useTargetAllocationStore.getState().setTarget("XLM", 60));
    expect(useTargetAllocationStore.getState().targets["XLM"]).toBe(60);
  });

  it("removeTarget removes a symbol", () => {
    act(() => {
      useTargetAllocationStore.getState().setTarget("XLM", 60);
      useTargetAllocationStore.getState().removeTarget("XLM");
    });
    expect(useTargetAllocationStore.getState().targets["XLM"]).toBeUndefined();
  });

  it("setTargets replaces all targets", () => {
    act(() =>
      useTargetAllocationStore.getState().setTargets([
        { symbol: "XLM", targetPct: 50 },
        { symbol: "USDC", targetPct: 50 },
      ])
    );
    expect(useTargetAllocationStore.getState().targets).toEqual({
      XLM: 50,
      USDC: 50,
    });
  });

  it("clearTargets empties the targets map", () => {
    act(() => {
      useTargetAllocationStore.getState().setTarget("XLM", 100);
      useTargetAllocationStore.getState().clearTargets();
    });
    expect(useTargetAllocationStore.getState().targets).toEqual({});
  });

  it("isValid returns true when targets sum to 100", () => {
    act(() =>
      useTargetAllocationStore.getState().setTargets([
        { symbol: "XLM", targetPct: 60 },
        { symbol: "USDC", targetPct: 40 },
      ])
    );
    expect(useTargetAllocationStore.getState().isValid()).toBe(true);
  });

  it("isValid returns false when targets do not sum to 100", () => {
    act(() =>
      useTargetAllocationStore.getState().setTargets([
        { symbol: "XLM", targetPct: 60 },
        { symbol: "USDC", targetPct: 30 },
      ])
    );
    expect(useTargetAllocationStore.getState().isValid()).toBe(false);
  });

  it("totalPct returns the sum rounded to 2 dp", () => {
    act(() =>
      useTargetAllocationStore.getState().setTargets([
        { symbol: "XLM", targetPct: 33.333 },
        { symbol: "USDC", targetPct: 33.333 },
        { symbol: "BTC", targetPct: 33.334 },
      ])
    );
    // 33.333 + 33.333 + 33.334 = 100.000
    expect(useTargetAllocationStore.getState().totalPct()).toBe(100);
  });

  it("toggleOverlay flips the overlayVisible flag", () => {
    act(() => useTargetAllocationStore.getState().toggleOverlay());
    expect(useTargetAllocationStore.getState().overlayVisible).toBe(true);
    act(() => useTargetAllocationStore.getState().toggleOverlay());
    expect(useTargetAllocationStore.getState().overlayVisible).toBe(false);
  });
});

// ── TargetAllocationEditor component tests ────────────────────────────────────
import { TargetAllocationEditor } from "@/components/TargetAllocationEditor";
import { usePortfolioStore } from "@/store/usePortfolioStore";

vi.mock("@/store/usePortfolioStore");
const mockPortfolioStore = usePortfolioStore as unknown as ReturnType<typeof vi.fn>;

const ASSETS = [
  { symbol: "XLM", name: "Stellar Lumens", value: 1500, percentage: 60, color: "#7C3AED" },
  { symbol: "USDC", name: "USD Coin", value: 1000, percentage: 40, color: "#2775CA" },
];

function setupPortfolio(assets = ASSETS) {
  mockPortfolioStore.mockReturnValue({ assets } as any);
}

describe("TargetAllocationEditor", () => {
  beforeEach(() => {
    setupPortfolio();
    useTargetAllocationStore.setState({ targets: {}, overlayVisible: false });
  });

  it("renders an input for each asset", () => {
    render(<TargetAllocationEditor />);
    expect(
      screen.getByLabelText(/target allocation for stellar lumens/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/target allocation for usd coin/i)
    ).toBeInTheDocument();
  });

  it("Save button is disabled when total ≠ 100", () => {
    render(<TargetAllocationEditor />);
    const save = screen.getByRole("button", { name: /save targets/i });
    expect(save).toBeDisabled();
  });

  it("shows validation message when total is over 100", () => {
    render(<TargetAllocationEditor />);
    fireEvent.change(
      screen.getByLabelText(/target allocation for stellar lumens/i),
      { target: { value: "80" } }
    );
    fireEvent.change(
      screen.getByLabelText(/target allocation for usd coin/i),
      { target: { value: "40" } }
    );
    expect(screen.getByText(/over by/i)).toBeInTheDocument();
  });

  it("shows validation message when total is under 100", () => {
    render(<TargetAllocationEditor />);
    fireEvent.change(
      screen.getByLabelText(/target allocation for stellar lumens/i),
      { target: { value: "30" } }
    );
    expect(screen.getByText(/under by/i)).toBeInTheDocument();
  });

  it("Save button is enabled and saves when total = 100", () => {
    render(<TargetAllocationEditor />);
    fireEvent.change(
      screen.getByLabelText(/target allocation for stellar lumens/i),
      { target: { value: "60" } }
    );
    fireEvent.change(
      screen.getByLabelText(/target allocation for usd coin/i),
      { target: { value: "40" } }
    );

    const save = screen.getByRole("button", { name: /save targets/i });
    expect(save).not.toBeDisabled();
    fireEvent.click(save);

    const { targets } = useTargetAllocationStore.getState();
    expect(targets["XLM"]).toBe(60);
    expect(targets["USDC"]).toBe(40);
  });

  it("Clear button resets the draft and store", () => {
    render(<TargetAllocationEditor />);
    fireEvent.change(
      screen.getByLabelText(/target allocation for stellar lumens/i),
      { target: { value: "60" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(
      (screen.getByLabelText(/target allocation for stellar lumens/i) as HTMLInputElement).value
    ).toBe("");
  });

  it("toggle overlay button updates the store flag", () => {
    render(<TargetAllocationEditor />);
    const toggleBtn = screen.getByRole("button", { name: /show target band overlay/i });
    fireEvent.click(toggleBtn);
    expect(useTargetAllocationStore.getState().overlayVisible).toBe(true);
  });

  it("shows empty-state message when portfolio has no assets", () => {
    setupPortfolio([]);
    render(<TargetAllocationEditor />);
    expect(
      screen.getByText(/add assets to your portfolio/i)
    ).toBeInTheDocument();
  });
});
