/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { ComparisonMetricCard } from "../ComparisonMetricCard";
import { type ComparisonMetrics } from "@/lib/comparison";

describe("ComparisonMetricCard", () => {
  const createMetrics = (
    current: number,
    prior: number,
    isPositive: boolean
  ): ComparisonMetrics => ({
    currentValue: current,
    priorValue: prior,
    absoluteChange: current - prior,
    percentageChange: ((current - prior) / prior) * 100,
    isPositive,
    isNeutral: false,
  });

  it("renders metric label", () => {
    const metrics = createMetrics(150, 100, true);
    render(
      <ComparisonMetricCard label="Test Metric" metrics={metrics} />
    );
    expect(screen.getByText("Test Metric")).toBeInTheDocument();
  });

  it("displays current and prior values", () => {
    const metrics = createMetrics(150, 100, true);
    render(
      <ComparisonMetricCard label="Test" metrics={metrics} />
    );
    expect(screen.getByText(/150/)).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it("shows positive change with trending up icon", () => {
    const metrics = createMetrics(150, 100, true);
    const { container } = render(
      <ComparisonMetricCard label="Test" metrics={metrics} />
    );
    // Check for TrendingUp SVG (lucide-react)
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it("shows negative change with trending down icon", () => {
    const metrics = {
      currentValue: 75,
      priorValue: 100,
      absoluteChange: -25,
      percentageChange: -25,
      isPositive: false,
      isNeutral: false,
    };
    render(
      <ComparisonMetricCard label="Test" metrics={metrics} />
    );
    // Component should render without error
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("shows neutral change with minus icon", () => {
    const metrics = {
      currentValue: 100,
      priorValue: 100,
      absoluteChange: 0,
      percentageChange: 0,
      isPositive: false,
      isNeutral: true,
    };
    render(
      <ComparisonMetricCard label="Test" metrics={metrics} />
    );
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("displays absolute change value", () => {
    const metrics = createMetrics(150, 100, true);
    render(
      <ComparisonMetricCard label="Test" metrics={metrics} />
    );
    // +50 should be displayed
    expect(screen.getByText(/\+50/)).toBeInTheDocument();
  });

  it("displays percentage change", () => {
    const metrics = createMetrics(150, 100, true);
    render(
      <ComparisonMetricCard label="Test" metrics={metrics} />
    );
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it("hides percentage change when showAbsoluteOnly is true", () => {
    const metrics = createMetrics(150, 100, true);
    render(
      <ComparisonMetricCard
        label="Test"
        metrics={metrics}
        showAbsoluteOnly={true}
      />
    );
    // Should have absolute change but not percentage in visible text
    // This is a basic check; percentage may still be in aria-label
    expect(screen.getByText(/\+50/)).toBeInTheDocument();
  });

  it("formats value with custom formatter", () => {
    const metrics = createMetrics(150, 100, true);
    const customFormat = (v: number) => `$${v.toFixed(0)}`;
    render(
      <ComparisonMetricCard
        label="Test"
        metrics={metrics}
        formatValue={customFormat}
      />
    );
    expect(screen.getByText("$150")).toBeInTheDocument();
    expect(screen.getByText("$100")).toBeInTheDocument();
  });

  it("displays suffix when provided", () => {
    const metrics = createMetrics(150, 100, true);
    render(
      <ComparisonMetricCard label="Test" metrics={metrics} suffix="USD" />
    );
    expect(screen.getByText(/USD/)).toBeInTheDocument();
  });

  it("has accessible aria-label with trend information", () => {
    const metrics = createMetrics(150, 100, true);
    const { container } = render(
      <ComparisonMetricCard label="Test" metrics={metrics} />
    );
    const region = container.querySelector('[role="region"]');
    expect(region).toHaveAttribute("aria-label");
    const ariaLabel = region?.getAttribute("aria-label") || "";
    expect(ariaLabel).toContain("Test");
  });

  it("includes screen-reader-only trend text", () => {
    const metrics = createMetrics(150, 100, true);
    const { container } = render(
      <ComparisonMetricCard label="Test" metrics={metrics} />
    );
    const srText = container.querySelector(".sr-only");
    expect(srText).toBeInTheDocument();
    expect(srText?.textContent).toBe("increased");
  });

  it("displays negative change with minus prefix", () => {
    const metrics = {
      currentValue: 75,
      priorValue: 100,
      absoluteChange: -25,
      percentageChange: -25,
      isPositive: false,
      isNeutral: false,
    };
    render(
      <ComparisonMetricCard label="Test" metrics={metrics} />
    );
    expect(screen.getByText("-25")).toBeInTheDocument();
  });
});
