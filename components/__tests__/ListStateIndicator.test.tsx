/** @jest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/react";
import { ListStateIndicator } from "@/components/ListStateIndicator";

describe("ListStateIndicator", () => {
  it("renders nothing when state is idle", () => {
    const { container } = render(
      <ListStateIndicator state="idle" />
    );
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  it("shows loading spinner when loading", () => {
    render(<ListStateIndicator state="loading" />);
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Loading more items"
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows end-of-list message with item count", () => {
    render(
      <ListStateIndicator
        state="end-of-list"
        itemCount={42}
      />
    );
    expect(screen.getByText("You've viewed all 42 items")).toBeInTheDocument();
  });

  it("shows error message with retry button", () => {
    const onRetry = jest.fn();
    render(
      <ListStateIndicator
        state="error"
        onRetry={onRetry}
      />
    );
    expect(screen.getByText(/Failed to load items/)).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /Retry/ });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows has-more indicator with item counts", () => {
    render(
      <ListStateIndicator
        state="has-more"
        itemCount={30}
        totalCount={150}
      />
    );
    expect(screen.getByText("Showing 30 of 150 items")).toBeInTheDocument();
  });
});
