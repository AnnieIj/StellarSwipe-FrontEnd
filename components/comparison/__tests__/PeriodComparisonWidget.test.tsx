/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { PeriodComparisonWidget } from "../PeriodComparisonWidget";

// Mock the formatNumber utility from lib/utils
jest.mock("@/lib/utils", () => ({
  formatNumber: (num: number, decimals: number) => num.toFixed(decimals),
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

describe("PeriodComparisonWidget", () => {
  const defaultProps = {
    pnl: 1500,
    winRate: 62.5,
    totalTrades: 40,
    priorPnl: 1200,
    priorWinRate: 58,
    priorTotalTrades: 36,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-15T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders widget title and default granularity (Month-over-Month)", () => {
    render(<PeriodComparisonWidget {...defaultProps} />);
    expect(screen.getByText("Period Comparison")).toBeInTheDocument();
    // Dropdown button should display default granularity
    const dropdownButton = screen.getByRole("button", {
      name: /Select period-over-period comparison granularity/i,
    });
    expect(dropdownButton).toHaveTextContent("Month-over-Month");
  });

  it("displays all three core metric cards", () => {
    render(<PeriodComparisonWidget {...defaultProps} />);
    expect(screen.getByText("P&L")).toBeInTheDocument();
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    expect(screen.getByText("Total Trades")).toBeInTheDocument();
  });

  it("shows current and prior values in metric cards", () => {
    render(<PeriodComparisonWidget {...defaultProps} />);
    // P&L card
    expect(screen.getByText("1500.00")).toBeInTheDocument(); // current
    expect(screen.getByText("1200.00")).toBeInTheDocument(); // prior
    // Win Rate card
    expect(screen.getByText("62.5%")).toBeInTheDocument();
    expect(screen.getByText("58.0%")).toBeInTheDocument();
    // Total Trades card
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("36")).toBeInTheDocument();
  });

  it("shows absolute and percentage changes for each metric", () => {
    render(<PeriodComparisonWidget {...defaultProps} />);
    // P&L: $1500 vs $1200 => +$300 (+25%)
    expect(screen.getByText("+300.00")).toBeInTheDocument();
    expect(screen.getByText("+25.00%")).toBeInTheDocument();
    // Win Rate: 62.5% vs 58% => +4.5% (+7.76%)
    expect(screen.getByText("+4.50%")).toBeInTheDocument();
    expect(screen.getByText("+7.76%")).toBeInTheDocument();
    // Total Trades: 40 vs 36 => +4 (+11.11%)
    expect(screen.getByText("+4")).toBeInTheDocument();
    expect(screen.getByText("+11.11%")).toBeInTheDocument();
  });

  it("allows changing granularity via dropdown", () => {
    render(<PeriodComparisonWidget {...defaultProps} />);
    const dropdownButton = screen.getByRole("button", {
      name: /Select period-over-period comparison granularity/i,
    });
    fireEvent.click(dropdownButton);
    // Menu should open
    expect(screen.getByRole("menu")).toBeInTheDocument();
    // All granularity options should be present
    expect(screen.getByRole("menuitem", { name: "Week-over-Week" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Month-over-Month" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Quarter-over-Quarter" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Year-over-Year" })).toBeInTheDocument();
    // Select Week-over-Week
    fireEvent.click(screen.getByRole("menuitem", { name: "Week-over-Week" }));
    // Dropdown button should update
    expect(dropdownButton).toHaveTextContent("Week-over-Week");
  });

  it("shows incomplete period warning when current period is not complete", () => {
    // Set date to middle of month (incomplete)
    jest.setSystemTime(new Date("2026-06-15T12:00:00Z"));
    render(<PeriodComparisonWidget {...defaultProps} />);
    // Warning should appear
    expect(screen.getByText(/This period is incomplete/)).toBeInTheDocument();
    expect(screen.getByText(/Metrics may change as the period progresses/)).toBeInTheDocument();
  });

  it("does not show incomplete period warning when period is complete", () => {
    // Set date to end of month (complete)
    jest.setSystemTime(new Date("2026-06-30T23:59:59Z"));
    render(<PeriodComparisonWidget {...defaultProps} />);
    expect(screen.queryByText(/This period is incomplete/)).not.toBeInTheDocument();
  });

  it("shows missing prior data notice when prior values are null", () => {
    render(
      <PeriodComparisonWidget
        pnl={1500}
        winRate={62.5}
        totalTrades={40}
        priorPnl={null}
        priorWinRate={null}
        priorTotalTrades={null}
      />
    );
    expect(screen.getByText(/No prior period data available/)).toBeInTheDocument();
  });

  it("does not show missing prior data notice when at least one prior value is present", () => {
    render(
      <PeriodComparisonWidget
        pnl={1500}
        winRate={62.5}
        totalTrades={40}
        priorPnl={1200} // only P&L has prior data
        priorWinRate={null}
        priorTotalTrades={null}
      />
    );
    expect(screen.queryByText(/No prior period data available/)).not.toBeInTheDocument();
  });

  it("displays period date ranges for current and prior periods", () => {
    render(<PeriodComparisonWidget {...defaultProps} />);
    // Should show date ranges like "Jun 1 - Jun 30" for current, "May 1 - May 31" for prior
    expect(screen.getByText(/Current:/)).toBeInTheDocument();
    expect(screen.getByText(/Prior:/)).toBeInTheDocument();
    // Both ranges should be present
    const periodReference = screen.getByText(/Current:/).parentElement;
    expect(periodReference).toHaveTextContent(/Prior:/);
  });

  it("supports additional metrics via additionalMetrics prop", () => {
    const additionalMetrics = [
      {
        label: "Avg Trade Size",
        current: 125.5,
        prior: 110.3,
        suffix: "USD",
      },
      {
        label: "Max Drawdown",
        current: -15.2,
        prior: -12.8,
        suffix: "%",
      },
    ];
    render(
      <PeriodComparisonWidget
        {...defaultProps}
        additionalMetrics={additionalMetrics}
      />
    );
    // Additional metrics should appear
    expect(screen.getByText("Avg Trade Size")).toBeInTheDocument();
    expect(screen.getByText("Max Drawdown")).toBeInTheDocument();
    // Their values should be displayed
    expect(screen.getByText("125.50")).toBeInTheDocument();
    expect(screen.getByText("110.30")).toBeInTheDocument();
  });

  it("handles controlled granularity via granularity and onGranularityChange props", () => {
    const handleGranularityChange = jest.fn();
    render(
      <PeriodComparisonWidget
        {...defaultProps}
        granularity="quarter"
        onGranularityChange={handleGranularityChange}
      />
    );
    // Dropdown button should display "Quarter-over-Quarter"
    const dropdownButton = screen.getByRole("button", {
      name: /Select period-over-period comparison granularity/i,
    });
    expect(dropdownButton).toHaveTextContent("Quarter-over-Quarter");
    // Clicking dropdown and selecting another granularity should call onGranularityChange
    fireEvent.click(dropdownButton);
    fireEvent.click(screen.getByRole("menuitem", { name: "Year-over-Year" }));
    expect(handleGranularityChange).toHaveBeenCalledWith("year");
  });

  it("shows demo mode badge when isDemo prop is true", () => {
    render(
      <PeriodComparisonWidget
        {...defaultProps}
        isDemo={true}
      />
    );
    expect(screen.getByText(/Demo mode/)).toBeInTheDocument();
  });

  it("does not show demo mode badge when isDemo is false or undefined", () => {
    const { rerender } = render(
      <PeriodComparisonWidget {...defaultProps} isDemo={false} />
    );
    expect(screen.queryByText(/Demo mode/)).not.toBeInTheDocument();
    rerender(<PeriodComparisonWidget {...defaultProps} />);
    expect(screen.queryByText(/Demo mode/)).not.toBeInTheDocument();
  });

  describe("keyboard accessibility", () => {
    it("supports arrow navigation in granularity dropdown", () => {
      render(<PeriodComparisonWidget {...defaultProps} />);
      const dropdownButton = screen.getByRole("button", {
        name: /Select period-over-period comparison granularity/i,
      });
      // Open dropdown with arrow down
      fireEvent.keyDown(dropdownButton, { key: "ArrowDown" });
      expect(screen.getByRole("menu")).toBeInTheDocument();
      // Menu items should be focusable
      const menuItems = screen.getAllByRole("menuitem");
      expect(menuItems[0]).toHaveFocus();
      // Arrow down moves to next item
      fireEvent.keyDown(menuItems[0], { key: "ArrowDown" });
      expect(menuItems[1]).toHaveFocus();
      // Arrow up moves to previous item
      fireEvent.keyDown(menuItems[1], { key: "ArrowUp" });
      expect(menuItems[0]).toHaveFocus();
      // Escape closes dropdown
      fireEvent.keyDown(menuItems[0], { key: "Escape" });
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(dropdownButton).toHaveFocus();
    });

    it("selects granularity with Enter or Space", () => {
      const handleGranularityChange = jest.fn();
      render(
        <PeriodComparisonWidget
          {...defaultProps}
          granularity="month"
          onGranularityChange={handleGranularityChange}
        />
      );
      const dropdownButton = screen.getByRole("button", {
        name: /Select period-over-period comparison granularity/i,
      });
      fireEvent.click(dropdownButton);
      const quarterOption = screen.getByRole("menuitem", { name: "Quarter-over-Quarter" });
      fireEvent.keyDown(quarterOption, { key: "Enter" });
      expect(handleGranularityChange).toHaveBeenCalledWith("quarter");
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("renders correctly with minimal props (no prior data)", () => {
    render(
      <PeriodComparisonWidget
        pnl={1500}
        winRate={62.5}
        totalTrades={40}
        priorPnl={null}
        priorWinRate={null}
        priorTotalTrades={null}
      />
    );
    // Should still render all core UI elements
    expect(screen.getByText("Period Comparison")).toBeInTheDocument();
    expect(screen.getByText("P&L")).toBeInTheDocument();
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    expect(screen.getByText("Total Trades")).toBeInTheDocument();
  });
});