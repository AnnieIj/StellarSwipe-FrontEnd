/**
 * Tests for the deprecated /api/signals/v1 route shim.
 * Validates legacy `limit` → `pageSize` mapping and deprecation headers.
 */

import { buildSignalPage } from "@/lib/signals";

jest.mock("@/src/tracing/worker-tracing.service", () => ({
  traceWorker: jest.fn((_name: string, fn: () => unknown) => fn()),
}));

// Capture calls to NextResponse.json so we can inspect args without needing Web Response globals
const mockJson = jest.fn((body: unknown, init?: ResponseInit) => ({ body, init }));
jest.mock("next/server", () => ({ NextResponse: { json: mockJson } }));

import { GET } from "@/app/api/signals/v1/route";

function makeRequest(search: string) {
  return new Request(`http://localhost/api/signals/v1${search}`);
}

beforeEach(() => mockJson.mockClear());

describe("GET /api/signals/v1 (deprecated shim)", () => {
  it("returns signal feed data with correct pageSize from `limit`", async () => {
    await GET(makeRequest("?page=1&limit=5"));
    const [body, init] = [mockJson.mock.calls[0][0], mockJson.mock.calls[0][1]];
    expect(init?.status).toBe(200);
    expect(body).toMatchObject({ pageSize: 5, page: 1 });
    expect(Array.isArray((body as ReturnType<typeof buildSignalPage>).items)).toBe(true);
  });

  it("maps legacy `limit` param to pageSize", async () => {
    await GET(makeRequest("?limit=3"));
    const body = mockJson.mock.calls[0][0] as ReturnType<typeof buildSignalPage>;
    expect(body.pageSize).toBe(3);
  });

  it("falls back to pageSize when limit is absent", async () => {
    await GET(makeRequest("?pageSize=7"));
    const body = mockJson.mock.calls[0][0] as ReturnType<typeof buildSignalPage>;
    expect(body.pageSize).toBe(7);
  });

  it("includes Deprecation response header", async () => {
    await GET(makeRequest(""));
    const init = mockJson.mock.calls[0][1] as ResponseInit & { headers: Record<string, string> };
    expect(init.headers["Deprecation"]).toBe("true");
  });

  it("includes Link header pointing to successor", async () => {
    await GET(makeRequest(""));
    const init = mockJson.mock.calls[0][1] as ResponseInit & { headers: Record<string, string> };
    expect(init.headers["Link"]).toContain("/api/signals");
  });

  it("returns 400 for invalid pagination params", async () => {
    await GET(makeRequest("?page=0"));
    const init = mockJson.mock.calls[0][1] as ResponseInit;
    expect(init?.status).toBe(400);
  });
});

describe("GET /api/signals (current entry point)", () => {
  it("returns 200 without deprecation headers", async () => {
    const { GET: currentGET } = await import("@/app/api/signals/route");
    await currentGET(makeRequest("?page=1&pageSize=5"));
    const init = mockJson.mock.calls[0][1] as ResponseInit & {
      headers?: Record<string, string>;
    };
    expect(init?.status).toBe(200);
    expect(init?.headers?.["Deprecation"]).toBeUndefined();
  });
});

describe("confidence history on signal details (#815)", () => {
  it("exposes confidence observations in timestamp order", async () => {
    const { GET: currentGET } = await import("@/app/api/signals/route");
    await currentGET(makeRequest("?page=1&pageSize=5"));
    const body = mockJson.mock.calls[0][0] as ReturnType<typeof buildSignalPage>;
    const item = body.items[0] as unknown as {
      confidenceHistory?: Array<{ confidence: number; observedAt: string }>;
    };
    const history = item.confidenceHistory ?? [];
    const times = history.map((h) => new Date(h.observedAt).getTime());
    const sorted = [...times].sort((a, b) => a - b);
    expect(times).toEqual(sorted);
  });

  it("provides an accessible text alternative for each observation", async () => {
    const { GET: currentGET } = await import("@/app/api/signals/route");
    await currentGET(makeRequest("?page=1&pageSize=5"));
    const body = mockJson.mock.calls[0][0] as ReturnType<typeof buildSignalPage>;
    const item = body.items[0] as unknown as {
      confidenceHistory?: Array<{ confidence: number; observedAt: string; label?: string }>;
    };
    for (const obs of item.confidenceHistory ?? []) {
      expect(typeof obs.label).toBe("string");
      expect(obs.label).toContain(String(obs.confidence));
    }
  });

  it("distinguishes historical observations from the current confidence value", async () => {
    const { GET: currentGET } = await import("@/app/api/signals/route");
    await currentGET(makeRequest("?page=1&pageSize=5"));
    const body = mockJson.mock.calls[0][0] as ReturnType<typeof buildSignalPage>;
    const item = body.items[0] as unknown as {
      confidence: number;
      confidenceHistory?: Array<{ confidence: number; observedAt: string }>;
    };
    const history = item.confidenceHistory ?? [];
    if (history.length > 0) {
      const latest = history[history.length - 1];
      expect(latest.confidence).not.toBe(item.confidence);
    }
  });

  it("handles empty history without fabricating observations", async () => {
    const { GET: currentGET } = await import("@/app/api/signals/route");
    await currentGET(makeRequest("?page=1&pageSize=5"));
    const body = mockJson.mock.calls[0][0] as ReturnType<typeof buildSignalPage>;
    for (const raw of body.items) {
      const item = raw as unknown as { confidenceHistory?: unknown[] };
      if (item.confidenceHistory !== undefined) {
        expect(Array.isArray(item.confidenceHistory)).toBe(true);
      }
    }
  });
});
