/** @jest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/react";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

// Mock Sentry to avoid actually throwing to the console or attempting network requests
jest.mock("@sentry/nextjs", () => ({
  withScope: jest.fn((cb) => cb({ setContext: jest.fn() })),
  captureException: jest.fn(),
}));

const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error!");
  }
  return <div>Normal Content</div>;
};

describe("RouteErrorBoundary", () => {
  beforeEach(() => {
    // Suppress console.error in tests to avoid noisy output from React error boundary logs
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders children when there is no error", () => {
    render(
      <RouteErrorBoundary featureName="Analytics">
        <ThrowingComponent shouldThrow={false} />
      </RouteErrorBoundary>
    );

    expect(screen.getByText("Normal Content")).toBeInTheDocument();
    expect(screen.queryByText("Analytics unavailable")).not.toBeInTheDocument();
  });

  it("catches errors and renders fallback UI", () => {
    render(
      <RouteErrorBoundary featureName="Analytics">
        <ThrowingComponent shouldThrow={true} />
      </RouteErrorBoundary>
    );

    expect(screen.queryByText("Normal Content")).not.toBeInTheDocument();
    expect(screen.getByText("Analytics unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Something went wrong in Analytics. Other sections are unaffected."
      )
    ).toBeInTheDocument();
  });

  it("allows retrying after an error", () => {
    const { rerender } = render(
      <RouteErrorBoundary featureName="Analytics">
        <ThrowingComponent shouldThrow={true} />
      </RouteErrorBoundary>
    );

    expect(screen.getByText("Analytics unavailable")).toBeInTheDocument();

    // To properly test retry, we change the prop so it doesn't immediately throw again
    rerender(
      <RouteErrorBoundary featureName="Analytics">
        <ThrowingComponent shouldThrow={false} />
      </RouteErrorBoundary>
    );

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(screen.queryByText("Analytics unavailable")).not.toBeInTheDocument();
    expect(screen.getByText("Normal Content")).toBeInTheDocument();
  });
});
