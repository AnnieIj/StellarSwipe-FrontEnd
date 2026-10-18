/** @jest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/react";
import { ComparisonErrorBoundary } from "@/components/ComparisonErrorBoundary";

jest.mock("@sentry/nextjs", () => ({
  withScope: jest.fn((cb) => cb({ setContext: jest.fn() })),
  captureException: jest.fn(),
}));

const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Comparison render failure");
  }
  return <div>Comparison content</div>;
};

describe("ComparisonErrorBoundary", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders children when there is no error", () => {
    render(
      <div>
        <button>Share Link</button>
        <ComparisonErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ComparisonErrorBoundary>
      </div>
    );

    expect(screen.getByText("Comparison content")).toBeInTheDocument();
  });

  it("isolates a crash to the comparison content — surrounding page controls stay interactive", () => {
    render(
      <div>
        <button>Share Link</button>
        <ComparisonErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ComparisonErrorBoundary>
      </div>
    );

    // The rest of the page (outside the boundary) is untouched.
    expect(screen.getByRole("button", { name: /share link/i })).toBeEnabled();
    expect(screen.getByText("Comparison tool unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Comparison content")).not.toBeInTheDocument();
  });

  it("allows retrying after an error", () => {
    const { rerender } = render(
      <ComparisonErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ComparisonErrorBoundary>
    );

    expect(screen.getByText("Comparison tool unavailable")).toBeInTheDocument();

    rerender(
      <ComparisonErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ComparisonErrorBoundary>
    );

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(screen.queryByText("Comparison tool unavailable")).not.toBeInTheDocument();
    expect(screen.getByText("Comparison content")).toBeInTheDocument();
  });
});
