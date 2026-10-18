/**
 * @jest-environment jsdom
 *
 * Integration tests for the desktop split-view (resizable feed/detail panes)
 * in SignalFeed — divider keyboard resizing within constraints, ratio
 * persistence, and the mobile single-pane fallback.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignalFeed } from "@/components/signal/SignalFeed";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SIGNAL_FEED_SPLIT_STORAGE_KEY } from "@/lib/splitView";

const mockSignalResponse = {
  items: [
    {
      id: "signal-1",
      ticker: "BTC",
      action: "BUY" as const,
      confidence: 85,
      details: "Momentum building",
      timestamp: "2024-01-15T10:00:00Z",
      provider: "TestProvider",
      status: "Active" as const,
    },
  ],
  page: 1,
  pageSize: 10,
  total: 1,
  nextPage: null,
  hasMore: false,
};

function mockViewport(isDesktop: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: isDesktop && query === "(min-width: 1024px)",
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

describe("SignalFeed – split-view", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders no divider or detail pane on mobile", () => {
    mockViewport(false);
    render(
      <QueryClientProvider client={queryClient}>
        <SignalFeed initialData={mockSignalResponse} />
      </QueryClientProvider>
    );

    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Selected signal details")
    ).not.toBeInTheDocument();
  });

  it("renders a keyboard-adjustable divider with the default ratio on desktop", () => {
    mockViewport(true);
    render(
      <QueryClientProvider client={queryClient}>
        <SignalFeed initialData={mockSignalResponse} />
      </QueryClientProvider>
    );

    const divider = screen.getByRole("separator", {
      name: /resize feed and detail panes/i,
    });
    expect(divider).toHaveAttribute("aria-orientation", "vertical");
    expect(divider).toHaveAttribute("aria-valuenow", "50");
    expect(divider).toHaveAttribute("aria-valuemin", "30");
    expect(divider).toHaveAttribute("aria-valuemax", "70");
    expect(
      screen.getByLabelText("Selected signal details")
    ).toBeInTheDocument();
  });

  it("resizes within constraints via ArrowLeft/ArrowRight and persists the ratio", async () => {
    mockViewport(true);
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <SignalFeed initialData={mockSignalResponse} />
      </QueryClientProvider>
    );

    const divider = screen.getByRole("separator", {
      name: /resize feed and detail panes/i,
    });
    divider.focus();

    await user.keyboard("{ArrowRight}");
    expect(divider).toHaveAttribute("aria-valuenow", "53");
    expect(
      window.localStorage.getItem(SIGNAL_FEED_SPLIT_STORAGE_KEY)
    ).toBe("0.5300");

    // Push well past the upper bound — should clamp at the max, not exceed it.
    for (let i = 0; i < 20; i++) {
      await user.keyboard("{ArrowRight}");
    }
    expect(divider).toHaveAttribute("aria-valuenow", "70");
    expect(
      window.localStorage.getItem(SIGNAL_FEED_SPLIT_STORAGE_KEY)
    ).toBe("0.7000");
  });

  it("restores a previously persisted ratio on mount", () => {
    window.localStorage.setItem(SIGNAL_FEED_SPLIT_STORAGE_KEY, "0.4000");
    mockViewport(true);

    render(
      <QueryClientProvider client={queryClient}>
        <SignalFeed initialData={mockSignalResponse} />
      </QueryClientProvider>
    );

    const divider = screen.getByRole("separator", {
      name: /resize feed and detail panes/i,
    });
    expect(divider).toHaveAttribute("aria-valuenow", "40");
  });
});
