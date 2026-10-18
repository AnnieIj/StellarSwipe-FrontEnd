import { render, screen } from "@testing-library/react";
import { SignalCardSkeleton } from "@/components/SignalCardSkeleton";

describe("SignalCardSkeleton", () => {
  it("renders skeleton with default density", () => {
    render(<SignalCardSkeleton />);

    const skeleton = screen.getByRole("status", { name: /loading signal/i });
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass("skeleton-shimmer");
    expect(skeleton).toHaveClass("rounded-3xl");
    expect(skeleton).toHaveClass("border");
    expect(skeleton).toHaveClass("bg-slate-900/80");
  });

  it("renders skeleton with compact density", () => {
    render(<SignalCardSkeleton density="compact" />);

    const skeleton = screen.getByRole("status", { name: /loading signal/i });
    expect(skeleton).toHaveClass("p-2");
    expect(skeleton).toHaveClass("sm:p-3");
    expect(skeleton).toHaveClass("mb-2");
  });

  it("renders skeleton with comfortable density", () => {
    render(<SignalCardSkeleton density="comfortable" />);

    const skeleton = screen.getByRole("status", { name: /loading signal/i });
    expect(skeleton).toHaveClass("p-4");
    expect(skeleton).toHaveClass("sm:p-6");
    expect(skeleton).toHaveClass("mb-4");
  });

  it("applies animation delay via CSS variable", () => {
    const { container } = render(<SignalCardSkeleton animationDelay={120} />);

    const skeleton = container.querySelector('[role="status"]');
    expect(skeleton).toHaveStyle("--shimmer-delay: 120ms");
  });

  it("applies custom className", () => {
    render(<SignalCardSkeleton className="custom-skeleton" />);

    const skeleton = screen.getByRole("status", { name: /loading signal/i });
    expect(skeleton).toHaveClass("custom-skeleton");
  });

  it("applies custom style", () => {
    const { container } = render(
      <SignalCardSkeleton style={{ backgroundColor: "red" }} />
    );

    const skeleton = container.querySelector('[role="status"]');
    expect(skeleton).toHaveStyle({ backgroundColor: "red" });
  });

  it("has aria-hidden on visual elements", () => {
    render(<SignalCardSkeleton />);

    const visualContainer = screen.getByRole("status").querySelector("div[aria-hidden='true']");
    expect(visualContainer).toBeInTheDocument();
  });

  it("has sr-only text for screen readers", () => {
    render(<SignalCardSkeleton />);

    expect(screen.getByText("Loading signal…")).toHaveClass("sr-only");
  });
});