/**
 * MSW request handlers for the app's key API endpoints.
 *
 * Usage in tests:
 *   import { server } from '@/src/mocks/server';
 *   import { http, HttpResponse } from 'msw';
 *
 *   // Override a handler for one test:
 *   server.use(
 *     http.get('/api/signals', () => HttpResponse.json({ error: 'Server error' }, { status: 500 }))
 *   );
 *
 * The override is automatically reset after each test via server.resetHandlers().
 */

import { http, HttpResponse } from "msw";

export const mockSignals = [
  {
    id: "sig-1",
    asset: "XLM/USDC",
    action: "BUY" as const,
    confidence: 82,
    timestamp: "2024-01-15T10:00:00Z",
    rationale: "Strong momentum signal",
    stats: {
      entryPrice: 0.4821,
      targetPrice: 0.55,
      stopLoss: 0.44,
      riskReward: "2.1",
    },
    providerId: "provider-1",
    providerName: "AlphaBot",
  },
  {
    id: "sig-2",
    asset: "BTC/USDC",
    action: "SELL" as const,
    confidence: 74,
    timestamp: "2024-01-15T09:30:00Z",
    rationale: "RSI overbought",
    stats: {
      entryPrice: 45000,
      targetPrice: 42000,
      stopLoss: 46500,
      riskReward: "2.0",
    },
    providerId: "provider-2",
    providerName: "BetaSignals",
  },
];

export const mockSubscriptions = [
  {
    id: "sub-1",
    providerId: "provider-1",
    providerName: "AlphaBot",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
  },
];

export const mockSessions = [
  {
    id: "sess_current_001",
    deviceLabel: "Chrome on macOS",
    location: "London, UK",
    lastActiveAt: "2025-07-01T12:00:00Z",
    isCurrent: true,
  },
  {
    id: "sess_002",
    deviceLabel: "Firefox on Windows 11",
    location: "New York, US",
    lastActiveAt: "2025-06-30T10:00:00Z",
    isCurrent: false,
  },
  {
    id: "sess_003",
    deviceLabel: "Safari on iPhone 15",
    location: "Tokyo, JP",
    lastActiveAt: "2025-06-28T08:00:00Z",
    isCurrent: false,
  },
];

export const handlers = [
  http.get("*/api/signals", ({ request }) => {
    const url = new URL(request.url, "http://localhost");
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "10");

    if (isNaN(page) || page < 1 || isNaN(pageSize) || pageSize < 1) {
      return HttpResponse.json(
        { error: "Invalid pagination parameters." },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      items: mockSignals,
      page,
      pageSize,
      total: mockSignals.length,
      hasMore: false,
      nextPage: null,
    });
  }),

  http.get("*/api/subscriptions", ({ request }) => {
    const url = new URL(request.url, "http://localhost");
    const status = url.searchParams.get("status");

    const filtered = status
      ? mockSubscriptions.filter((s) => s.status === status)
      : mockSubscriptions;

    return HttpResponse.json({ subscriptions: filtered });
  }),

  http.post("*/api/trade", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      success: true,
      txHash: "mock-tx-hash-abc123",
      asset: body.asset,
      amount: body.amount,
    });
  }),

  // ── Sessions ──────────────────────────────────────────────────────────────

  http.get("*/api/sessions", () => {
    return HttpResponse.json(mockSessions);
  }),

  http.delete("*/api/sessions/:sessionId", ({ params }) => {
    const { sessionId } = params as { sessionId: string };
    const exists = mockSessions.some((s) => s.id === sessionId);
    if (!exists) {
      return HttpResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("*/api/sessions/revoke-others", () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
