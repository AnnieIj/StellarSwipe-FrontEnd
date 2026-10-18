import {
  buildSamplePayload,
  sendTestWebhook,
  dispatchWebhookEvent,
} from "../webhookService";
import { useWebhookStore } from "@/store/useWebhookStore";

const HOOK_URL = "https://example.com/webhook";

function ok200() {
  return Promise.resolve(new Response(null, { status: 200 }));
}

function err500() {
  return Promise.resolve(
    new Response(null, { status: 500, statusText: "Internal Server Error" })
  );
}

function networkError() {
  return Promise.reject(new Error("Network failure"));
}

function abortError(
  url: string | URL | globalThis.Request,
  options?: RequestInit
): Promise<Response> {
  return new Promise((_, reject) => {
    if (options?.signal) {
      options.signal.addEventListener("abort", () => {
        reject(
          Object.assign(new Error("The user aborted a request"), {
            name: "AbortError",
          })
        );
      });
    }
  });
}

describe("webhookService", () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    useWebhookStore.setState({ webhooks: [] });
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  // ── buildSamplePayload ────────────────────────────────────────────────────

  describe("buildSamplePayload", () => {
    it.each(["new_signal", "trade_execution", "portfolio_alert"] as const)(
      "returns a well-formed payload for %s",
      (event) => {
        const payload = buildSamplePayload(event);
        expect(payload.event).toBe(event);
        expect(payload.test).toBe(true);
        expect(typeof payload.timestamp).toBe("string");
        expect(payload.data).toBeDefined();
      }
    );

    it("new_signal payload includes signalId and asset", () => {
      const { data } = buildSamplePayload("new_signal");
      expect(data.signalId).toBe("sig_test_demo");
      expect(data.asset).toBe("XLM/USDC");
      expect(data.direction).toBe("BUY");
    });

    it("trade_execution payload includes tradeId and txHash", () => {
      const { data } = buildSamplePayload("trade_execution");
      expect(data.tradeId).toBe("trade_test_demo");
      expect(data.txHash).toBe("test_tx_hash");
      expect(data.status).toBe("confirmed");
    });

    it("portfolio_alert payload includes threshold and current drawdown", () => {
      const { data } = buildSamplePayload("portfolio_alert");
      expect(data.threshold).toBe(5);
      expect(data.current).toBe(6.2);
    });
  });

  // ── sendTestWebhook ───────────────────────────────────────────────────────

  describe("sendTestWebhook", () => {
    it("returns a failed delivery when the webhook id does not exist", async () => {
      const delivery = await sendTestWebhook("nonexistent-id");

      expect(delivery.status).toBe("failed");
      expect(delivery.error).toMatch(/no webhook url configured/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("returns a success delivery on HTTP 200", async () => {
      const webhook = useWebhookStore
        .getState()
        .addWebhook(HOOK_URL, ["new_signal"]);
      fetchSpy.mockImplementationOnce(ok200);

      const delivery = await sendTestWebhook(webhook.id);

      expect(delivery.status).toBe("success");
      expect(delivery.statusCode).toBe(200);
    });

    it("sets X-StellarSwipe-Test: true on test requests", async () => {
      const webhook = useWebhookStore
        .getState()
        .addWebhook(HOOK_URL, ["new_signal"]);
      fetchSpy.mockImplementationOnce(ok200);

      await sendTestWebhook(webhook.id);

      const [, init] = fetchSpy.mock.calls[0];
      const headers = init?.headers as Record<string, string>;
      expect(headers["X-StellarSwipe-Test"]).toBe("true");
    });

    it("sends Content-Type: application/json", async () => {
      const webhook = useWebhookStore
        .getState()
        .addWebhook(HOOK_URL, ["new_signal"]);
      fetchSpy.mockImplementationOnce(ok200);

      await sendTestWebhook(webhook.id);

      const [, init] = fetchSpy.mock.calls[0];
      const headers = init?.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("records the delivery in the webhook store on success", async () => {
      const webhook = useWebhookStore
        .getState()
        .addWebhook(HOOK_URL, ["new_signal"]);
      fetchSpy.mockImplementationOnce(ok200);

      await sendTestWebhook(webhook.id);

      const stored = useWebhookStore
        .getState()
        .webhooks.find((w) => w.id === webhook.id);
      expect(stored?.deliveries).toHaveLength(1);
      expect(stored?.deliveries[0].status).toBe("success");
    });

    it("returns a failed delivery with statusCode on non-2xx response", async () => {
      const webhook = useWebhookStore
        .getState()
        .addWebhook(HOOK_URL, ["new_signal"]);
      fetchSpy.mockImplementationOnce(err500);

      // sendTestWebhook uses attempts=1, so a single 500 response is a final failure
      const delivery = await sendTestWebhook(webhook.id);

      expect(delivery.status).toBe("failed");
      expect(delivery.statusCode).toBe(500);
      expect(delivery.error).toContain("HTTP 500");
    });

    it("reports a timeout message when the request aborts", async () => {
      const webhook = useWebhookStore
        .getState()
        .addWebhook(HOOK_URL, ["new_signal"]);
      fetchSpy.mockImplementationOnce(() =>
        Promise.reject(
          Object.assign(new Error("timeout"), { name: "AbortError" })
        )
      );

      const delivery = await sendTestWebhook(webhook.id);

      expect(delivery.status).toBe("failed");
      expect(delivery.error).toMatch(/timed out after 10s/i);
    });

    it("reports a network error message on connection failure", async () => {
      const webhook = useWebhookStore
        .getState()
        .addWebhook(HOOK_URL, ["new_signal"]);
      fetchSpy.mockImplementationOnce(networkError);

      const delivery = await sendTestWebhook(webhook.id);

      expect(delivery.status).toBe("failed");
      expect(delivery.error).toMatch(/network error/i);
    });

    it("uses the first subscribed event type for the sample payload", async () => {
      const webhook = useWebhookStore
        .getState()
        .addWebhook(HOOK_URL, ["trade_execution"]);
      fetchSpy.mockImplementationOnce(ok200);

      await sendTestWebhook(webhook.id);

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.event).toBe("trade_execution");
    });
  });

  // ── dispatchWebhookEvent ──────────────────────────────────────────────────

  describe("dispatchWebhookEvent", () => {
    it("does not call fetch for webhooks not subscribed to the event", async () => {
      useWebhookStore.getState().addWebhook(HOOK_URL, ["trade_execution"]);

      await dispatchWebhookEvent("new_signal", { test: true });

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("does not call fetch for webhooks with an exhausted rate limit", async () => {
      const webhook = useWebhookStore
        .getState()
        .addWebhook(HOOK_URL, ["new_signal"]);
      useWebhookStore.setState((s) => ({
        webhooks: s.webhooks.map((w) =>
          w.id === webhook.id ? { ...w, rateLimit: 0 } : w
        ),
      }));

      await dispatchWebhookEvent("new_signal", {});

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("dispatches to every subscribed webhook", async () => {
      useWebhookStore.getState().addWebhook(HOOK_URL, ["new_signal"]);
      useWebhookStore
        .getState()
        .addWebhook("https://example.com/hook2", ["new_signal"]);
      fetchSpy.mockImplementation(ok200);

      await dispatchWebhookEvent("new_signal", {});

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it("decrements the rate limit by 1 per dispatched webhook", async () => {
      const webhook = useWebhookStore
        .getState()
        .addWebhook(HOOK_URL, ["new_signal"]);
      fetchSpy.mockImplementationOnce(ok200);

      await dispatchWebhookEvent("new_signal", {});

      const updated = useWebhookStore
        .getState()
        .webhooks.find((w) => w.id === webhook.id);
      expect(updated?.rateLimit).toBe(59);
    });

    it("records a delivery in the store after a successful dispatch", async () => {
      const webhook = useWebhookStore
        .getState()
        .addWebhook(HOOK_URL, ["new_signal"]);
      fetchSpy.mockImplementationOnce(ok200);

      await dispatchWebhookEvent("new_signal", { assetId: "XLM" });

      const updated = useWebhookStore
        .getState()
        .webhooks.find((w) => w.id === webhook.id);
      expect(updated?.deliveries).toHaveLength(1);
      expect(updated?.deliveries[0].status).toBe("success");
    });

    it("does not decrement rate limit or dispatch for non-subscribed events", async () => {
      const webhook = useWebhookStore
        .getState()
        .addWebhook(HOOK_URL, ["portfolio_alert"]);
      fetchSpy.mockImplementation(ok200);

      await dispatchWebhookEvent("trade_execution", {});

      const updated = useWebhookStore
        .getState()
        .webhooks.find((w) => w.id === webhook.id);
      expect(updated?.rateLimit).toBe(60); // unchanged
    });
  });

  // ── Retry and backoff behavior ────────────────────────────────────────────

  describe("retry and backoff", () => {
    beforeEach(() => {
      fetchSpy.mockClear();
      useWebhookStore.setState({ webhooks: [] });
    });

    it("retries up to 3 times on network failure before recording a failed delivery", async () => {
      const webhook = useWebhookStore
        .getState()
        .addWebhook(HOOK_URL, ["new_signal"]);
      useWebhookStore.setState({
        webhooks: useWebhookStore
          .getState()
          .webhooks.map((w) =>
            w.id === webhook.id ? { ...w, backoffInterval: 1 } : w
          ),
      });
      fetchSpy.mockImplementation(networkError);

      await dispatchWebhookEvent("new_signal", {});

      expect(fetchSpy).toHaveBeenCalledTimes(3);

      const stored = useWebhookStore
        .getState()
        .webhooks.find((w) => w.id === webhook.id);
      expect(stored?.deliveries[0].status).toBe("failed");
      expect(stored?.deliveries[0].error).toMatch(/network error/i);
    });

    it("succeeds and stops retrying on a 200 response after one failure", async () => {
      const webhook = useWebhookStore
        .getState()
        .addWebhook(HOOK_URL, ["new_signal"]);
      useWebhookStore.setState({
        webhooks: useWebhookStore
          .getState()
          .webhooks.map((w) =>
            w.id === webhook.id ? { ...w, backoffInterval: 1 } : w
          ),
      });
      fetchSpy
        .mockImplementationOnce(networkError)
        .mockImplementationOnce(ok200);

      await dispatchWebhookEvent("new_signal", {});

      expect(fetchSpy).toHaveBeenCalledTimes(2);

      const stored = useWebhookStore
        .getState()
        .webhooks.find((w) => w.id === webhook.id);
      expect(stored?.deliveries[0].status).toBe("success");
    });

    it("records a timeout error when all retry attempts abort", async () => {
      const webhook = useWebhookStore
        .getState()
        .addWebhook(HOOK_URL, ["new_signal"]);
      useWebhookStore.setState({
        webhooks: useWebhookStore
          .getState()
          .webhooks.map((w) =>
            w.id === webhook.id ? { ...w, backoffInterval: 1 } : w
          ),
      });
      fetchSpy.mockImplementation(() =>
        Promise.reject(
          Object.assign(new Error("timeout"), { name: "AbortError" })
        )
      );

      await dispatchWebhookEvent("new_signal", {});

      const stored = useWebhookStore
        .getState()
        .webhooks.find((w) => w.id === webhook.id);
      expect(stored?.deliveries[0].status).toBe("failed");
      expect(stored?.deliveries[0].error).toMatch(/timed out/i);
    });

    it("makes exactly 3 fetch attempts when the server consistently returns 500", async () => {
      const webhook = useWebhookStore
        .getState()
        .addWebhook(HOOK_URL, ["new_signal"]);
      useWebhookStore.setState({
        webhooks: useWebhookStore
          .getState()
          .webhooks.map((w) =>
            w.id === webhook.id ? { ...w, backoffInterval: 1 } : w
          ),
      });
      fetchSpy.mockImplementation(err500);

      await dispatchWebhookEvent("new_signal", {});

      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });
  });
});
