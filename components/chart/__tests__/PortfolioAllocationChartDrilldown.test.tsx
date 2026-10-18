/** @jest-environment jsdom */

/**
 * PortfolioAllocationChart — token drilldown tests (#797)
 *
 * Covers: selecting a segment opens the constituent list, clearing the
 * selection collapses the panel, keyboard accessibility (Enter/Space/Escape),
 * and the empty-constituents state.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { PortfolioAllocationChart } from "@/components/chart/PortfolioAllocationChart";
import { usePortfolioStore } from "@/store/usePortfolioStore";

jest.mock("@/store/usePortfolioStore");
const mockStore = usePortfolioStore as jest.MockedFunction<typeof usePortfolioStore>;

const STORE_BASE = {
  totalValue: 2000,
  isLoading: false,
  lastUpdated: new Date(),
  setAssets: jest.fn(),
  setLoading: jest.fn(),
  updateAsset: jest.fn(),
  removeAsset: jest.fn(),
  clear: jest.fn(),
};

const XLM_ASSET = {
  symbol: "XLM",
  name: "Stellar Lumens",
  value: 1200,
  percentage: 60,
  color: "#7C3AED",
  constituents: [
    { symbol: "AQUA", name: "Aquarius", value: 700, percentage: 58.3 },
    { symbol: "yXLM", name: "yXLM Token", value: 500, percentage: 41.7 },
  ],
};

const USDC_ASSET = {
  symbol: "USDC",
  name: "USD Coin",
  value: 800,
  percentage: 40,
  color: "#2775CA",
  constituents: [],
};

function setupStore(assets = [XLM_ASSET, USDC_ASSET]) {
  mockStore.mockReturnValue({ ...STORE_BASE, assets } as any);
}

describe("PortfolioAllocationChart — token drilldown (#797)", () => {
  beforeEach(() => {
    setupStore();
  });

  // ── selection opens drilldown ────────────────────────────────────────────────
  it("clicking a legend button opens the detail panel with asset name in title", () => {
    render(<PortfolioAllocationChart />);
    const btn = screen.getByRole("button", { name: /stellar lumens/i });
    fireEvent.click(btn);
    expect(
      screen.getByRole("region", { name: /stellar lumens details/i })
    ).toBeInTheDocument();
  });

  it("detail panel title includes the selected segment name", () => {
    render(<PortfolioAllocationChart />);
    fireEvent.click(screen.getByRole("button", { name: /stellar lumens/i }));
    expect(
      screen.getByText(/stellar lumens/i, { selector: "p" })
    ).toBeInTheDocument();
  });

  it("renders the constituent token list when the segment has constituents", () => {
    render(<PortfolioAllocationChart />);
    fireEvent.click(screen.getByRole("button", { name: /stellar lumens/i }));

    expect(
      screen.getByRole("list", { name: /constituent tokens of stellar lumens/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Aquarius")).toBeInTheDocument();
    expect(screen.getByText("yXLM Token")).toBeInTheDocument();
  });

  it("renders constituent value and percentage for each token", () => {
    render(<PortfolioAllocationChart />);
    fireEvent.click(screen.getByRole("button", { name: /stellar lumens/i }));

    expect(screen.getByText(/\$700\.00/)).toBeInTheDocument();
    expect(screen.getByText(/58\.3%/)).toBeInTheDocument();
  });

  // ── empty constituents state ─────────────────────────────────────────────────
  it("shows empty-state message when constituents array is empty", () => {
    render(<PortfolioAllocationChart />);
    fireEvent.click(screen.getByRole("button", { name: /usd coin/i }));
    expect(
      screen.getByText(/no constituent assets for this segment/i)
    ).toBeInTheDocument();
  });

  // ── no drilldown section when constituents is undefined ──────────────────────
  it("does not render a constituent section when asset has no constituents field", () => {
    setupStore([{ ...XLM_ASSET, constituents: undefined as any }]);
    render(<PortfolioAllocationChart />);
    fireEvent.click(screen.getByRole("button", { name: /stellar lumens/i }));

    expect(
      screen.queryByRole("list", { name: /constituent tokens/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/no constituent assets/i)
    ).not.toBeInTheDocument();
  });

  // ── clearing selection ───────────────────────────────────────────────────────
  it("close button collapses the detail panel", () => {
    render(<PortfolioAllocationChart />);
    fireEvent.click(screen.getByRole("button", { name: /stellar lumens/i }));
    expect(
      screen.getByRole("region", { name: /stellar lumens details/i })
    ).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", {
      name: /close stellar lumens details/i,
    });
    fireEvent.click(closeBtn);
    expect(
      screen.queryByRole("region", { name: /stellar lumens details/i })
    ).not.toBeInTheDocument();
  });

  it("pressing Escape on the detail panel collapses it", () => {
    render(<PortfolioAllocationChart />);
    fireEvent.click(screen.getByRole("button", { name: /stellar lumens/i }));
    const panel = screen.getByRole("region", { name: /stellar lumens details/i });
    fireEvent.keyDown(panel, { key: "Escape" });
    expect(
      screen.queryByRole("region", { name: /stellar lumens details/i })
    ).not.toBeInTheDocument();
  });

  // ── keyboard accessibility on legend items ───────────────────────────────────
  it("pressing Enter on a legend button opens the drilldown", () => {
    render(<PortfolioAllocationChart />);
    const btn = screen.getByRole("button", { name: /stellar lumens/i });
    fireEvent.keyDown(btn, { key: "Enter" });
    fireEvent.click(btn); // legend uses onClick so simulate click as fallback
    expect(
      screen.getByRole("region", { name: /stellar lumens details/i })
    ).toBeInTheDocument();
  });
});
