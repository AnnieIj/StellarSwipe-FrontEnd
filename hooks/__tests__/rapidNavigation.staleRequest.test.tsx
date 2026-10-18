/**
 * @jest-environment jsdom
 *
 * Rapid-navigation regression coverage for stale-request handling.
 *
 * When a user navigates quickly between data-heavy views keyed by route
 * param (provider profile, leaderboard time range, signal page, ...), an
 * in-flight request for the view the user has already left must never be
 * allowed to overwrite the state of the view the user landed on. This
 * mirrors the `useQuery({ queryKey: [name, param], queryFn })` pattern used
 * throughout the app's data hooks (useProviderProfile, useLeaderboard,
 * useSignals, ...).
 */

import { useState } from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { http, HttpResponse, delay } from "msw";
import { server } from "@/src/mocks/server";
import { fetchSignals } from "@/lib/api";

function makeItem(id: string) {
  return {
    id,
    asset: `${id}/USDC`,
    action: "BUY" as const,
    confidence: 80,
    timestamp: "2024-01-15T10:00:00Z",
    rationale: "test",
    stats: { entryPrice: 1, targetPrice: 1.1, stopLoss: 0.9, riskReward: "1.0" },
    providerId: "provider-1",
    providerName: "TestBot",
  };
}

/** A stand-in for a data-heavy view keyed by a route param (e.g. providerId, page). */
function PageView({ page }: { page: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["rapid-nav-signals", page],
    queryFn: ({ signal }) => fetchSignals({ page, pageSize: 1, signal }),
  });

  return (
    <div data-testid="page-content">
      {isLoading ? "loading" : data?.items?.[0]?.id ?? "empty"}
    </div>
  );
}

function NavigationHarness() {
  const [page, setPage] = useState(1);
  return (
    <div>
      <button onClick={() => setPage(2)}>Go to page 2</button>
      <PageView page={page} />
    </div>
  );
}

describe("rapid navigation – stale request handling", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("the active page always wins even when the abandoned page's request resolves later", async () => {
    server.use(
      http.get("*/api/signals", async ({ request }) => {
        const url = new URL(request.url);
        const page = url.searchParams.get("page");

        if (page === "1") {
          // Slow response for the page the user is about to navigate away from.
          await delay(300);
          return HttpResponse.json({
            items: [makeItem("page-1-signal")],
            page: 1,
            pageSize: 1,
            nextPage: null,
            hasMore: false,
          });
        }

        // Fast response for the page the user actually lands on.
        await delay(10);
        return HttpResponse.json({
          items: [makeItem("page-2-signal")],
          page: 2,
          pageSize: 1,
          nextPage: null,
          hasMore: false,
        });
      })
    );

    const user = userEvent.setup({ delay: null });

    render(
      <QueryClientProvider client={queryClient}>
        <NavigationHarness />
      </QueryClientProvider>
    );

    expect(screen.getByTestId("page-content")).toHaveTextContent("loading");

    // Navigate away before the slow page-1 request resolves.
    await user.click(screen.getByRole("button", { name: /go to page 2/i }));

    await waitFor(() =>
      expect(screen.getByTestId("page-content")).toHaveTextContent(
        "page-2-signal"
      )
    );

    // Let the abandoned page-1 request resolve in the background.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

    // The now-active view must still show page 2's data — the stale,
    // late-arriving page-1 response must never have overwritten it.
    expect(screen.getByTestId("page-content")).toHaveTextContent(
      "page-2-signal"
    );
  });
});
