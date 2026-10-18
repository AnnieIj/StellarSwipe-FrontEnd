/**
 * @jest-environment jsdom
 *
 * Tests for PullToRefreshIndicator component.
 * Verifies visual feedback, accessibility, and state transitions.
 */

import { render, screen } from "@testing-library/react";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";

describe("PullToRefreshIndicator – visual feedback for pull-to-refresh", () => {
  it("renders with correct initial state", () => {
    render(<PullToRefreshIndicator pullDistance={0} isRefreshing={false} />);

    const indicator = screen.getByTestId("pull-to-refresh-indicator");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveAttribute("role", "status");
    expect(screen.getByText("Pull to refresh")).toBeInTheDocument();
  });

  it("shows 'Release to refresh' message when threshold reached", () => {
    render(
      <PullToRefreshIndicator
        pullDistance={80}
        isRefreshing={false}
        threshold={80}
      />
    );

    expect(screen.getByText("Release to refresh")).toBeInTheDocument();
  });

  it("shows 'Refreshing…' message during refresh", () => {
    render(<PullToRefreshIndicator pullDistance={0} isRefreshing={true} />);

    expect(screen.getByText("Refreshing…")).toBeInTheDocument();
  });

  it("shows spinner icon", () => {
    const { container } = render(
      <PullToRefreshIndicator pullDistance={0} isRefreshing={false} />
    );

    // RefreshCw icon from lucide-react
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("has proper accessibility attributes", () => {
    const { rerender } = render(
      <PullToRefreshIndicator pullDistance={40} isRefreshing={false} />
    );

    let indicator = screen.getByTestId("pull-to-refresh-indicator");
    expect(indicator).toHaveAttribute("aria-live", "polite");
    expect(indicator).toHaveAttribute("role", "status");
    expect(indicator).toHaveAttribute("aria-label", "Pull to refresh");

    // During refresh
    rerender(<PullToRefreshIndicator pullDistance={0} isRefreshing={true} />);

    indicator = screen.getByTestId("pull-to-refresh-indicator");
    expect(indicator).toHaveAttribute("aria-label", "Refreshing signals");
  });

  it("updates aria-label when threshold is reached", () => {
    const { rerender } = render(
      <PullToRefreshIndicator
        pullDistance={40}
        isRefreshing={false}
        threshold={80}
      />
    );

    let indicator = screen.getByTestId("pull-to-refresh-indicator");
    expect(indicator).toHaveAttribute("aria-label", "Pull to refresh");

    rerender(
      <PullToRefreshIndicator
        pullDistance={80}
        isRefreshing={false}
        threshold={80}
      />
    );

    indicator = screen.getByTestId("pull-to-refresh-indicator");
    expect(indicator).toHaveAttribute(
      "aria-label",
      "Pull to refresh — release to refresh"
    );
  });

  it("applies correct styling for visible state", () => {
    const { container } = render(
      <PullToRefreshIndicator
        pullDistance={80}
        isRefreshing={false}
        threshold={80}
      />
    );

    const indicator = container.querySelector(
      "[data-testid='pull-to-refresh-indicator']"
    );
    expect(indicator).toHaveClass(
      "rounded-3xl",
      "border",
      "border-white/10",
      "bg-slate-900/80"
    );
  });

  it("uses correct icon color (sky-400)", () => {
    const { container } = render(
      <PullToRefreshIndicator pullDistance={0} isRefreshing={false} />
    );

    const icon = container.querySelector("svg");
    expect(icon).toHaveClass("text-sky-400");
  });

  it("animates spinner during refresh", () => {
    const { container } = render(
      <PullToRefreshIndicator pullDistance={0} isRefreshing={true} />
    );

    const spinnerDiv = screen.getByTestId("refresh-spinner");
    // The spinner should be animated when isRefreshing is true
    // (Framer Motion handles the actual animation)
    expect(spinnerDiv).toBeInTheDocument();
  });

  it("handles edge case of pull distance exceeding threshold", () => {
    render(
      <PullToRefreshIndicator
        pullDistance={150}
        isRefreshing={false}
        threshold={80}
      />
    );

    // Should still show "Release to refresh" even when far beyond threshold
    expect(screen.getByText("Release to refresh")).toBeInTheDocument();
  });

  it("respects custom threshold prop", () => {
    const { rerender } = render(
      <PullToRefreshIndicator
        pullDistance={60}
        isRefreshing={false}
        threshold={100}
      />
    );

    // At 60px with 100px threshold, should show "Pull to refresh"
    expect(screen.getByText("Pull to refresh")).toBeInTheDocument();

    rerender(
      <PullToRefreshIndicator
        pullDistance={100}
        isRefreshing={false}
        threshold={100}
      />
    );

    // At exactly threshold, should show "Release to refresh"
    expect(screen.getByText("Release to refresh")).toBeInTheDocument();
  });
});
