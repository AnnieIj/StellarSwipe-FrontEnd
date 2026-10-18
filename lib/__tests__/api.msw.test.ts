/**
 * Tests for lib/api.ts using MSW to intercept real fetch calls.
 * Demonstrates the MSW setup pattern: import server, override per-test for error cases.
 *
 * Adding MSW to a new test file:
 *   1. Import { server } from '@/src/mocks/server'
 *   2. server.use(...) inside a test to override the default handler
 *   3. Lifecycle (listen/reset/close) is handled by src/mocks/jest.setup.ts
 *
 * @jest-environment node
 */

import { http, HttpResponse } from "msw";
import { server } from "@/src/mocks/server";
import {
  fetchSignals,
  fetchSubscriptions,
  NetworkError,
  ServerError,
} from "@/lib/api";

// Server lifecycle is managed by jest.setup.ts

describe("fetchSignals – MSW integration", () => {
  it("returns a SignalFeedPage with an items array", async () => {
    const feed = await fetchSignals();
    expect(Array.isArray(feed.items)).toBe(true);
    expect(typeof feed.page).toBe("number");
    expect(typeof feed.total).toBe("number");
  });

  it("passes page / pageSize query params", async () => {
    let capturedUrl = "";
    server.use(
      http.get("*/api/signals", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          signals: [],
          page: 2,
          pageSize: 5,
          total: 0,
          nextPage: null,
          hasMore: false,
        });
      })
    );
    await fetchSignals({ page: 2, pageSize: 5 }).catch(() => {});
    expect(capturedUrl).toContain("page=2");
    expect(capturedUrl).toContain("pageSize=5");
  });

  it("throws ServerError when the endpoint responds with 500", async () => {
    server.use(
      http.get("*/api/signals", () =>
        HttpResponse.json({ error: "Internal server error" }, { status: 500 })
      )
    );

    await expect(fetchSignals()).rejects.toThrow(ServerError);
  });

  it("throws NetworkError when fetch itself fails (network down)", async () => {
    server.use(http.get("*/api/signals", () => HttpResponse.error()));

    await expect(fetchSignals()).rejects.toThrow(NetworkError);
  });

  it("throws ServerError with correct status code on 404", async () => {
    server.use(
      http.get("*/api/signals", () =>
        HttpResponse.json({ error: "Not found" }, { status: 404 })
      )
    );

    const err = await fetchSignals().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ServerError);
    expect((err as ServerError).status).toBe(404);
  });
});

describe("fetchSubscriptions – MSW integration", () => {
  it("returns subscriptions array without status filter", async () => {
    const result = await fetchSubscriptions();
    expect(Array.isArray(result.subscriptions)).toBe(true);
  });

  it("passes status query param when provided", async () => {
    let capturedUrl = "";
    server.use(
      http.get("*/api/subscriptions", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ subscriptions: [] });
      })
    );
    await fetchSubscriptions({ status: "active" });
    expect(capturedUrl).toContain("status=active");
  });

  it("throws ServerError on non-ok response", async () => {
    server.use(
      http.get("*/api/subscriptions", () =>
        HttpResponse.json({ error: "Bad request" }, { status: 400 })
      )
    );
    await expect(fetchSubscriptions({ status: "active" })).rejects.toThrow(
      ServerError
    );
  });
});
