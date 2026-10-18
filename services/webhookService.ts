/**
 * Webhook dispatch service (#170)
 * - HMAC-SHA256 signing
 * - Retry on failure (up to 3 attempts)
 * - Rate limiting check
 */
import {
  useWebhookStore,
  type WebhookEventType,
  type WebhookDelivery,
} from "@/store/useWebhookStore";

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  test?: boolean;
  data: Record<string, unknown>;
}

/** Compute HMAC-SHA256 signature using SubtleCrypto */
async function sign(secret: string, body: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) return "";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Build sample payload for test dispatch */
export function buildSamplePayload(event: WebhookEventType): WebhookPayload {
  const samples: Record<WebhookEventType, Record<string, unknown>> = {
    new_signal: {
      signalId: "sig_test_demo",
      asset: "XLM/USDC",
      direction: "BUY",
      confidence: 85,
    },
    trade_execution: {
      tradeId: "trade_test_demo",
      asset: "XLM/USDC",
      status: "confirmed",
      txHash: "test_tx_hash",
    },
    portfolio_alert: {
      type: "test_drawdown",
      threshold: 5,
      current: 6.2,
      asset: "XLM",
    },
  };
  return {
    event,
    timestamp: new Date().toISOString(),
    test: true,
    data: samples[event],
  };
}

/** Payload schema version per supported event, used for previews (#830). */
const EVENT_SCHEMA_VERSIONS: Record<WebhookEventType, string> = {
  new_signal: "1.0",
  trade_execution: "1.0",
  portfolio_alert: "1.0",
};

/** Returns a sample payload and schema version, or null for unknown events. */
export function getSamplePayloadPreview(
  event: string
): { version: string; payload: WebhookPayload } | null {
  if (!Object.prototype.hasOwnProperty.call(EVENT_SCHEMA_VERSIONS, event)) {
    return null;
  }
  const key = event as WebhookEventType;
  return { version: EVENT_SCHEMA_VERSIONS[key], payload: buildSamplePayload(key) };
}

export async function sendTestWebhook(
  webhookId: string
): Promise<WebhookDelivery> {
  const { webhooks, recordDelivery } = useWebhookStore.getState();
  const webhook = webhooks.find((item) => item.id === webhookId);

  if (!webhook?.url) {
    return {
      id: `del_${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: "failed",
      error: "No webhook URL configured",
    };
  }

  const event = webhook.events[0] ?? "new_signal";
  const body = JSON.stringify(buildSamplePayload(event));
  const signature = await sign(webhook.secret, body);
  const delivery = await sendWithRetry(
    webhook.url,
    body,
    signature,
    webhook.id,
    1,
    10000,
    true,
    webhook.backoffInterval ?? 1000
  );
  recordDelivery(webhook.id, delivery);
  return delivery;
}

/** Dispatch an event to all registered webhooks that subscribe to it */
export async function dispatchWebhookEvent(
  event: WebhookEventType,
  data: Record<string, unknown>
) {
  const { webhooks, recordDelivery, decrementRateLimit } =
    useWebhookStore.getState();
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };
  const body = JSON.stringify(payload);

  for (const webhook of webhooks) {
    if (!webhook.events.includes(event)) continue;
    if (webhook.rateLimit <= 0) continue;

    decrementRateLimit(webhook.id);
    const signature = await sign(webhook.secret, body);
    const delivery = await sendWithRetry(
      webhook.url,
      body,
      signature,
      webhook.id,
      webhook.maxRetries ?? 3,
      10000,
      false,
      webhook.backoffInterval ?? 1000
    );
    recordDelivery(webhook.id, delivery);
  }
}

async function sendWithRetry(
  url: string,
  body: string,
  signature: string,
  webhookId: string,
  attempts = 3,
  timeoutMs = 10000,
  isTest = false,
  backoffInterval = 1000
): Promise<WebhookDelivery> {
  const deliveryId = `del_${Date.now()}`;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-StellarSwipe-Signature": signature,
          ...(isTest ? { "X-StellarSwipe-Test": "true" } : {}),
        },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        return {
          id: deliveryId,
          timestamp: new Date().toISOString(),
          status: "success",
          statusCode: res.status,
          attemptNumber: i + 1,
        };
      }
      if (i === attempts - 1) {
        return {
          id: deliveryId,
          timestamp: new Date().toISOString(),
          status: "failed",
          statusCode: res.status,
          error: `HTTP ${res.status}: ${res.statusText || "non-2xx response"}`,
          attemptNumber: i + 1,
        };
      }
    } catch (err) {
      clearTimeout(timeout);
      if (i === attempts - 1) {
        const error = err instanceof Error ? err : new Error(String(err));
        return {
          id: deliveryId,
          timestamp: new Date().toISOString(),
          status: "failed",
          error:
            error.name === "AbortError"
              ? `Request timed out after ${timeoutMs / 1000}s`
              : `Network error: ${error.message}`,
          attemptNumber: i + 1,
        };
      }
    }
    await new Promise((r) => setTimeout(r, backoffInterval * (i + 1)));
  }
  return {
    id: deliveryId,
    timestamp: new Date().toISOString(),
    status: "failed",
    error: "Max retries exceeded",
    attemptNumber: attempts,
  };
}
