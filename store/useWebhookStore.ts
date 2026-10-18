import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WebhookEventType =
  | "new_signal"
  | "trade_execution"
  | "portfolio_alert";

export interface WebhookDelivery {
  id: string;
  timestamp: string;
  status: "success" | "failed";
  statusCode?: number;
  error?: string;
  attemptNumber?: number;
}

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  createdAt: string;
  deliveries: WebhookDelivery[];
  rateLimit: number; // remaining calls this minute
  maxRetries: number;
  backoffInterval: number; // base backoff in milliseconds
}

interface WebhookStore {
  webhooks: Webhook[];
  addWebhook: (url: string, events: WebhookEventType[]) => Webhook;
  removeWebhook: (id: string) => void;
  updateEvents: (id: string, events: WebhookEventType[]) => void;
  recordDelivery: (webhookId: string, delivery: WebhookDelivery) => void;
  decrementRateLimit: (id: string) => void;
  resetRateLimits: () => void;
  updateRetryConfig: (
    id: string,
    maxRetries: number,
    backoffInterval: number
  ) => void;
}

function generateSecret(): string {
  const arr = new Uint8Array(20);
  if (typeof crypto !== "undefined") crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const useWebhookStore = create<WebhookStore>()(
  persist(
    (set) => ({
      webhooks: [],

      addWebhook: (url, events) => {
        const webhook: Webhook = {
          id: `wh_${Date.now()}`,
          url,
          events,
          secret: generateSecret(),
          createdAt: new Date().toISOString(),
          deliveries: [],
          rateLimit: 60,
          maxRetries: 3,
          backoffInterval: 1000,
        };
        set((s) => ({ webhooks: [...s.webhooks, webhook] }));
        return webhook;
      },

      removeWebhook: (id) =>
        set((s) => ({ webhooks: s.webhooks.filter((w) => w.id !== id) })),

      updateEvents: (id, events) =>
        set((s) => ({
          webhooks: s.webhooks.map((w) => (w.id === id ? { ...w, events } : w)),
        })),

      recordDelivery: (webhookId, delivery) =>
        set((s) => ({
          webhooks: s.webhooks.map((w) =>
            w.id === webhookId
              ? { ...w, deliveries: [delivery, ...w.deliveries].slice(0, 50) }
              : w
          ),
        })),

      decrementRateLimit: (id) =>
        set((s) => ({
          webhooks: s.webhooks.map((w) =>
            w.id === id ? { ...w, rateLimit: Math.max(0, w.rateLimit - 1) } : w
          ),
        })),

      resetRateLimits: () =>
        set((s) => ({
          webhooks: s.webhooks.map((w) => ({ ...w, rateLimit: 60 })),
        })),

      updateRetryConfig: (id, maxRetries, backoffInterval) =>
        set((s) => ({
          webhooks: s.webhooks.map((w) =>
            w.id === id ? { ...w, maxRetries, backoffInterval } : w
          ),
        })),
    }),
    { name: "stellarswipe:webhooks" }
  )
);
