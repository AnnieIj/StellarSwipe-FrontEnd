/**
 * @jest-environment jsdom
 *
 * Verifies that navigating away from the signal feed (unmounting it)
 * actually cancels its in-flight request at the network layer, rather than
 * just discarding the eventual response. Also verifies the resulting
 * cancellation is never surfaced as a user-facing error.
 */

import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/src/mocks/server";
import { SignalFeed } from "@/components/signal/SignalFeed";

describe("SignalFeed – abandoned-view request cancellation", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // SignalFeed queries this on mount for its desktop split-view layout.
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it("aborts the in-flight /api/signals request when the feed unmounts", async () => {
    let capturedSignal: AbortSignal | undefined;
    let resolveRequest: (() => void) | undefined;
    const requestReceived = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    server.use(
      http.get("*/api/signals", ({ request }) => {
        capturedSignal = request.signal;
        resolveRequest?.();
        // Only settles once the client aborts — resolving (rather than
        // leaving the promise dangling) keeps the test process from
        // hanging regardless of how the abort propagates.
        return new Promise<Response>((resolve) => {
          request.signal.addEventListener("abort", () => {
            resolve(HttpResponse.error());
          });
        });
      })
    );

    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <SignalFeed />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByRole("feed")).toBeInTheDocument());
    await requestReceived;
    expect(capturedSignal?.aborted).toBe(false);

    // Simulate navigating away from this view.
    unmount();

    await waitFor(() => expect(capturedSignal?.aborted).toBe(true));

    // Cancellation must not be reported as an application error.
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("AbortError")
    );

    consoleError.mockRestore();
  });
});
