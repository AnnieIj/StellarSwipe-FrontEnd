/** @jest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/react";
import { RouteErrorFallback } from "@/components/RouteErrorFallback";

jest.mock("@sentry/nextjs", () => ({
  withScope: jest.fn((cb) => cb({ setContext: jest.fn() })),
  captureException: jest.fn(),
}));

import * as Sentry from "@sentry/nextjs";

describe("RouteErrorFallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("identifies the affected area without exposing implementation details", () => {
    render(
      <RouteErrorFallback
        error={new Error("TypeError: Cannot read properties of undefined (reading 'foo') at ProviderProfilePage")}
        reset={jest.fn()}
        areaName="Provider profile"
        parentHref="/leaderboard"
        parentLabel="Back to leaderboard"
      />
    );

    expect(screen.getByText("Provider profile unavailable")).toBeInTheDocument();
    // Only the friendly description is shown — never the raw error message/stack.
    expect(
      screen.queryByText(/Cannot read properties of undefined/)
    ).not.toBeInTheDocument();
  });

  it("reports the error to Sentry for observability", () => {
    const error = new Error("boom");
    render(
      <RouteErrorFallback
        error={error}
        reset={jest.fn()}
        areaName="Leaderboard"
        parentHref="/app"
        parentLabel="Back to dashboard"
      />
    );

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it("lets the user retry the route", () => {
    const reset = jest.fn();
    render(
      <RouteErrorFallback
        error={new Error("boom")}
        reset={reset}
        areaName="Signal comparison"
        parentHref="/app"
        parentLabel="Back to dashboard"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("offers a way back to a stable parent view", () => {
    render(
      <RouteErrorFallback
        error={new Error("boom")}
        reset={jest.fn()}
        areaName="Active sessions"
        parentHref="/security"
        parentLabel="Back to Account Security"
      />
    );

    const backLink = screen.getByRole("link", { name: /back to account security/i });
    expect(backLink).toHaveAttribute("href", "/security");
  });

  it("surfaces guidance and keeps retrying usable across repeated failures", () => {
    const reset = jest.fn();
    const { rerender } = render(
      <RouteErrorFallback
        error={new Error("first failure")}
        reset={reset}
        areaName="Leaderboard"
        parentHref="/app"
        parentLabel="Back to dashboard"
      />
    );

    expect(
      screen.queryByText(/still having trouble/i)
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);

    // Next.js remounts error.tsx with a new error instance when the retried
    // render fails again — simulate that here.
    rerender(
      <RouteErrorFallback
        error={new Error("second failure")}
        reset={reset}
        areaName="Leaderboard"
        parentHref="/app"
        parentLabel="Back to dashboard"
      />
    );

    expect(screen.getByText(/still having trouble/i)).toBeInTheDocument();
    expect(Sentry.captureException).toHaveBeenCalledTimes(2);

    // Retry remains functional on repeated failure — not stuck/disabled.
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(2);
  });
});
