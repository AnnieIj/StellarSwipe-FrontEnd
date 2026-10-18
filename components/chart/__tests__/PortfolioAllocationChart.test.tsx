/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { PortfolioAllocationChart } from "@/components/chart/PortfolioAllocationChart";
import { usePortfolioStore } from "@/store/usePortfolioStore";

jest.mock("@/store/usePortfolioStore");

const mockUsePortfolioStore = usePortfolioStore as jest.MockedFunction<
  typeof usePortfolioStore
>;

describe("PortfolioAllocationChart", () => {
  beforeEach(() => {
    mockUsePortfolioStore.mockReturnValue({
      assets: [],
      totalValue: 0,
      isLoading: false,
      lastUpdated: null,
      setAssets: jest.fn(),
      setLoading: jest.fn(),
      updateAsset: jest.fn(),
      removeAsset: jest.fn(),
      clear: jest.fn(),
    });
  });

  it("renders loading state", () => {
    mockUsePortfolioStore.mockReturnValue({
      assets: [],
      totalValue: 0,
      isLoading: true,
      lastUpdated: null,
      setAssets: jest.fn(),
      setLoading: jest.fn(),
      updateAsset: jest.fn(),
      removeAsset: jest.fn(),
      clear: jest.fn(),
    });

    const { container } = render(<PortfolioAllocationChart />);
    // Component renders a skeleton with loading aria-label
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Loading portfolio allocation")
    ).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<PortfolioAllocationChart />);
    expect(screen.getByText("No portfolio data available")).toBeTruthy();
  });

  it("renders portfolio data with chart and labels", () => {
    mockUsePortfolioStore.mockReturnValue({
      assets: [
        {
          symbol: "XLM",
          name: "Stellar",
          value: 1500,
          percentage: 50,
          color: "#0d1f2d",
        },
        {
          symbol: "USDC",
          name: "USD Coin",
          value: 1500,
          percentage: 50,
          color: "#2775ca",
        },
      ],
      totalValue: 3000,
      isLoading: false,
      lastUpdated: new Date(),
      setAssets: jest.fn(),
      setLoading: jest.fn(),
      updateAsset: jest.fn(),
      removeAsset: jest.fn(),
      clear: jest.fn(),
    });

    render(<PortfolioAllocationChart />);
    expect(screen.getByText("Portfolio Allocation")).toBeTruthy();
    expect(screen.getByText(/Total value:/)).toBeTruthy();
    expect(screen.getByText("Stellar")).toBeTruthy();
    expect(screen.getByText("USD Coin")).toBeTruthy();
    expect(screen.getAllByText("50.0%")).toHaveLength(2);
  });
});
