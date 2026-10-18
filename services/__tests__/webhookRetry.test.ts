/**
 * Unit tests for webhook retry/backoff logic (Issue 358).
 *
 * Tests cover:
 *  - Retry attempt counting against a mocked failing endpoint
 *  - Backoff interval timing between attempts
 *  - Attempt number recorded in delivery result
 *  - Success on a later attempt
 */

// ── helpers ──────────────────────────────────────────────────────────────────

/** Simulate the sendWithRetry loop to verify counting and timing. */
async function sendWithRetryMock(
  fetchFn: () => Promise<{ ok: boolean; status: number; statusText: string }>,
  attempts: number,
  backoffInterval: number,
  sleepFn: (ms: number) => Promise<void>
): Promise<{
  status: "success" | "failed";
  statusCode?: number;
  attemptNumber: number;
  error?: string;
}> {
  const deliveryId = `del_test`;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetchFn();
      if (res.ok) {
        return {
          status: "success",
          statusCode: res.status,
          attemptNumber: i + 1,
        };
      }
      if (i === attempts - 1) {
        return {
          status: "failed",
          statusCode: res.status,
          error: `HTTP ${res.status}: ${res.statusText || "non-2xx response"}`,
          attemptNumber: i + 1,
        };
      }
    } catch (err) {
      if (i === attempts - 1) {
        return {
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          attemptNumber: i + 1,
        };
      }
    }
    await sleepFn(backoffInterval * (i + 1));
  }
  return {
    status: "failed",
    error: "Max retries exceeded",
    attemptNumber: attempts,
  };
}

// ── retry attempt counting ────────────────────────────────────────────────────

describe("webhookRetry – attempt counting against a failing endpoint", () => {
  it("makes exactly 1 attempt when maxRetries is 1", async () => {
    let calls = 0;
    const fetchFn = jest.fn().mockImplementation(async () => {
      calls++;
      return { ok: false, status: 500, statusText: "Internal Server Error" };
    });
    const sleep = jest.fn().mockResolvedValue(undefined);

    const result = await sendWithRetryMock(fetchFn, 1, 1000, sleep);

    expect(calls).toBe(1);
    expect(result.status).toBe("failed");
    expect(result.attemptNumber).toBe(1);
    expect(result.statusCode).toBe(500);
  });

  it("makes exactly 3 attempts when maxRetries is 3 and all fail", async () => {
    let calls = 0;
    const fetchFn = jest.fn().mockImplementation(async () => {
      calls++;
      return { ok: false, status: 503, statusText: "Service Unavailable" };
    });
    const sleep = jest.fn().mockResolvedValue(undefined);

    const result = await sendWithRetryMock(fetchFn, 3, 1000, sleep);

    expect(calls).toBe(3);
    expect(result.status).toBe("failed");
    expect(result.attemptNumber).toBe(3);
  });

  it("stops retrying after a successful attempt", async () => {
    let calls = 0;
    const fetchFn = jest.fn().mockImplementation(async () => {
      calls++;
      if (calls < 2) return { ok: false, status: 500, statusText: "Error" };
      return { ok: true, status: 200, statusText: "OK" };
    });
    const sleep = jest.fn().mockResolvedValue(undefined);

    const result = await sendWithRetryMock(fetchFn, 5, 1000, sleep);

    expect(calls).toBe(2);
    expect(result.status).toBe("success");
    expect(result.statusCode).toBe(200);
    expect(result.attemptNumber).toBe(2);
  });

  it("records the correct attemptNumber on first-attempt success", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 201, statusText: "Created" });
    const sleep = jest.fn().mockResolvedValue(undefined);

    const result = await sendWithRetryMock(fetchFn, 3, 1000, sleep);

    expect(result.attemptNumber).toBe(1);
    expect(result.status).toBe("success");
  });

  it("records the last attempt number on exhausted retries", async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    });
    const sleep = jest.fn().mockResolvedValue(undefined);

    const result = await sendWithRetryMock(fetchFn, 4, 500, sleep);

    expect(result.attemptNumber).toBe(4);
    expect(result.status).toBe("failed");
  });
});

// ── backoff timing ────────────────────────────────────────────────────────────

describe("webhookRetry – backoff interval timing", () => {
  it("sleeps backoffInterval * 1 after the first failed attempt", async () => {
    let calls = 0;
    const fetchFn = jest.fn().mockImplementation(async () => {
      calls++;
      return { ok: calls >= 3, status: calls >= 3 ? 200 : 500, statusText: "" };
    });
    const sleepMs: number[] = [];
    const sleep = jest.fn().mockImplementation(async (ms: number) => {
      sleepMs.push(ms);
    });

    await sendWithRetryMock(fetchFn, 5, 2000, sleep);

    expect(sleepMs[0]).toBe(2000); // backoff * (0 + 1)
  });

  it("sleeps backoffInterval * 2 after the second failed attempt", async () => {
    let calls = 0;
    const fetchFn = jest.fn().mockImplementation(async () => {
      calls++;
      return { ok: calls >= 3, status: calls >= 3 ? 200 : 500, statusText: "" };
    });
    const sleepMs: number[] = [];
    const sleep = jest.fn().mockImplementation(async (ms: number) => {
      sleepMs.push(ms);
    });

    await sendWithRetryMock(fetchFn, 5, 2000, sleep);

    expect(sleepMs[1]).toBe(4000); // backoff * (1 + 1)
  });

  it("does not sleep after the final failed attempt", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500, statusText: "Error" });
    const sleep = jest.fn().mockResolvedValue(undefined);

    await sendWithRetryMock(fetchFn, 3, 1000, sleep);

    // 3 attempts → 2 sleeps (after attempt 0 and attempt 1, not after attempt 2)
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("does not sleep at all on a first-attempt success", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200, statusText: "OK" });
    const sleep = jest.fn().mockResolvedValue(undefined);

    await sendWithRetryMock(fetchFn, 3, 1000, sleep);

    expect(sleep).not.toHaveBeenCalled();
  });

  it("respects a custom backoffInterval of 500 ms", async () => {
    let calls = 0;
    const fetchFn = jest.fn().mockImplementation(async () => {
      calls++;
      return { ok: calls >= 2, status: calls >= 2 ? 200 : 500, statusText: "" };
    });
    const sleepMs: number[] = [];
    const sleep = jest.fn().mockImplementation(async (ms: number) => {
      sleepMs.push(ms);
    });

    await sendWithRetryMock(fetchFn, 3, 500, sleep);

    expect(sleepMs[0]).toBe(500);
  });
});

// ── useWebhookStore retry config ──────────────────────────────────────────────

import { useWebhookStore } from "@/store/useWebhookStore";

describe("useWebhookStore – retry configuration", () => {
  beforeEach(() => {
    useWebhookStore.setState({ webhooks: [] });
  });

  it("new webhooks default to maxRetries=3 and backoffInterval=1000", () => {
    const wh = useWebhookStore
      .getState()
      .addWebhook("https://example.com/hook", ["new_signal"]);
    expect(wh.maxRetries).toBe(3);
    expect(wh.backoffInterval).toBe(1000);
  });

  it("updateRetryConfig changes maxRetries", () => {
    const wh = useWebhookStore
      .getState()
      .addWebhook("https://example.com/hook", ["new_signal"]);
    useWebhookStore.getState().updateRetryConfig(wh.id, 5, 1000);
    const updated = useWebhookStore
      .getState()
      .webhooks.find((w) => w.id === wh.id);
    expect(updated?.maxRetries).toBe(5);
  });

  it("updateRetryConfig changes backoffInterval", () => {
    const wh = useWebhookStore
      .getState()
      .addWebhook("https://example.com/hook", ["new_signal"]);
    useWebhookStore.getState().updateRetryConfig(wh.id, 3, 2500);
    const updated = useWebhookStore
      .getState()
      .webhooks.find((w) => w.id === wh.id);
    expect(updated?.backoffInterval).toBe(2500);
  });

  it("updateRetryConfig does not affect other webhooks", () => {
    useWebhookStore.setState({
      webhooks: [
        {
          id: "wh_a",
          url: "https://a.com/hook",
          events: ["new_signal"],
          secret: "secret_a",
          createdAt: new Date().toISOString(),
          deliveries: [],
          rateLimit: 60,
          maxRetries: 3,
          backoffInterval: 1000,
        },
        {
          id: "wh_b",
          url: "https://b.com/hook",
          events: ["trade_execution"],
          secret: "secret_b",
          createdAt: new Date().toISOString(),
          deliveries: [],
          rateLimit: 60,
          maxRetries: 3,
          backoffInterval: 1000,
        },
      ],
    });
    useWebhookStore.getState().updateRetryConfig("wh_a", 7, 3000);
    const unchanged = useWebhookStore
      .getState()
      .webhooks.find((w) => w.id === "wh_b");
    expect(unchanged?.maxRetries).toBe(3);
    expect(unchanged?.backoffInterval).toBe(1000);
  });

  it("deliveries record the attemptNumber field", () => {
    const wh = useWebhookStore
      .getState()
      .addWebhook("https://example.com/hook", ["new_signal"]);
    useWebhookStore.getState().recordDelivery(wh.id, {
      id: "del_1",
      timestamp: new Date().toISOString(),
      status: "failed",
      statusCode: 500,
      error: "HTTP 500",
      attemptNumber: 3,
    });
    const delivery = useWebhookStore
      .getState()
      .webhooks.find((w) => w.id === wh.id)?.deliveries[0];
    expect(delivery?.attemptNumber).toBe(3);
  });

  it("failure history contains only failed deliveries", () => {
    const wh = useWebhookStore
      .getState()
      .addWebhook("https://example.com/hook", ["new_signal"]);
    useWebhookStore.getState().recordDelivery(wh.id, {
      id: "del_ok",
      timestamp: new Date().toISOString(),
      status: "success",
      statusCode: 200,
      attemptNumber: 1,
    });
    useWebhookStore.getState().recordDelivery(wh.id, {
      id: "del_fail",
      timestamp: new Date().toISOString(),
      status: "failed",
      statusCode: 503,
      error: "Service Unavailable",
      attemptNumber: 3,
    });
    const hook = useWebhookStore
      .getState()
      .webhooks.find((w) => w.id === wh.id)!;
    const failures = hook.deliveries.filter((d) => d.status === "failed");
    expect(failures).toHaveLength(1);
    expect(failures[0].id).toBe("del_fail");
    expect(failures[0].attemptNumber).toBe(3);
    expect(failures[0].statusCode).toBe(503);
  });
});
