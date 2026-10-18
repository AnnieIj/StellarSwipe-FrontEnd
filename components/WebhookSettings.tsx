"use client";

import { useState } from "react";
import {
  useWebhookStore,
  type WebhookEventType,
} from "@/store/useWebhookStore";
import { sendTestWebhook } from "@/services/webhookService";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Send, Copy } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useValidationSummary } from "@/hooks/useValidationSummary";
import { ValidationSummary } from "@/components/forms/ValidationSummary";
import { WebhookPayloadPreview } from "@/components/WebhookPayloadPreview";
import { WebhookSubscriptionMatrix } from "@/components/WebhookSubscriptionMatrix";

const EVENT_OPTIONS: { value: WebhookEventType; label: string }[] = [
  { value: "new_signal", label: "New Signal" },
  { value: "trade_execution", label: "Trade Execution" },
  { value: "portfolio_alert", label: "Portfolio Alert" },
];

export function WebhookSettings() {
  const {
    webhooks,
    addWebhook,
    removeWebhook,
    updateEvents,
    updateRetryConfig,
  } = useWebhookStore();
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>([
    "new_signal",
  ]);
  const [testStatus, setTestStatus] = useState<
    Record<string, { state: "sending" | "success" | "failed"; message: string }>
  >({});
  const [copied, setCopied] = useState<string | null>(null);
  const { errors } = useValidationSummary();

  const handleAdd = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setUrlError("Enter a webhook URL before adding it.");
      return;
    }
    if (!/^https?:\/\/.+/.test(trimmed)) {
      setUrlError("Webhook URL must start with http:// or https://.");
      return;
    }
    setUrlError(null);
    addWebhook(trimmed, selectedEvents);
    setUrl("");
  };

  const handleTest = async (webhookId: string) => {
    setTestStatus((s) => ({
      ...s,
      [webhookId]: { state: "sending", message: "Sending test webhook..." },
    }));
    try {
      const delivery = await sendTestWebhook(webhookId);
      setTestStatus((s) => ({
        ...s,
        [webhookId]:
          delivery.status === "success"
            ? {
                state: "success",
                message: `Test delivered successfully (${delivery.statusCode})`,
              }
            : {
                state: "failed",
                message: delivery.error ?? "Test delivery failed",
              },
      }));
    } catch (error) {
      setTestStatus((s) => ({
        ...s,
        [webhookId]: {
          state: "failed",
          message:
            error instanceof Error ? error.message : "Test delivery failed",
        },
      }));
    }
  };

  const copySecret = (secret: string, id: string) => {
    navigator.clipboard.writeText(secret);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleEvent = (current: WebhookEventType[], event: WebhookEventType) =>
    current.includes(event)
      ? current.filter((e) => e !== event)
      : [...current, event];

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold">Webhook Integrations</h2>

      {/* Add webhook */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="font-medium text-sm">Add Webhook</h3>
        <ValidationSummary errors={errors} />
        <input
          id="webhook-url"
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (urlError) setUrlError(null);
          }}
          placeholder="https://your-app.com/webhook"
          className={`w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
            urlError ? "border-destructive focus:ring-destructive" : ""
          }`}
          aria-label="Webhook URL"
          aria-invalid={urlError ? "true" : undefined}
          aria-describedby={urlError ? "webhook-url-error" : undefined}
        />
        {urlError && (
          <p
            id="webhook-url-error"
            role="alert"
            className="text-xs text-destructive"
          >
            {urlError}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {EVENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() =>
                setSelectedEvents((ev) => toggleEvent(ev, opt.value))
              }
              className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                selectedEvents.includes(opt.value)
                  ? "bg-blue-500 text-white border-blue-500"
                  : "border-muted-foreground text-muted-foreground hover:border-foreground"
              }`}
              aria-pressed={selectedEvents.includes(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!url.trim()}
          className="gap-1"
        >
          <Plus size={14} /> Add Webhook
        </Button>
      </div>

      <WebhookPayloadPreview events={EVENT_OPTIONS} />

      {webhooks.length > 0 && (
        <WebhookSubscriptionMatrix
          webhooks={webhooks}
          events={EVENT_OPTIONS}
          onUpdate={updateEvents}
        />
      )}

      {/* Webhook list */}
      {webhooks.length === 0 && (
        <EmptyState
          title="No webhooks configured"
          description="Add a webhook URL before sending a test payload."
          className="rounded-lg border-dashed bg-card py-8"
          action={
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled
              aria-describedby="webhook-test-disabled"
            >
              <Send size={12} />
              Send test webhook
            </Button>
          }
          secondaryAction={
            <span
              id="webhook-test-disabled"
              className="text-xs text-muted-foreground"
            >
              Waiting for a webhook URL
            </span>
          }
        />
      )}

      {webhooks.map((wh) => (
        <div key={wh.id} className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-sm font-mono truncate max-w-xs"
              title={wh.url}
            >
              {wh.url}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTest(wh.id)}
                disabled={!wh.url || testStatus[wh.id]?.state === "sending"}
                aria-label={`Send test webhook to ${wh.url}`}
                className="gap-1 text-xs"
              >
                <Send size={12} />
                {testStatus[wh.id]?.state === "sending"
                  ? "Sending..."
                  : "Send test webhook"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeWebhook(wh.id)}
                aria-label="Delete webhook"
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          {testStatus[wh.id] && (
            <p
              role={testStatus[wh.id].state === "failed" ? "alert" : "status"}
              className={`rounded-md px-3 py-2 text-xs ${
                testStatus[wh.id].state === "success"
                  ? "bg-green-500/10 text-green-600"
                  : testStatus[wh.id].state === "failed"
                  ? "bg-red-500/10 text-red-500"
                  : "bg-blue-500/10 text-blue-600"
              }`}
            >
              {testStatus[wh.id].message}
            </p>
          )}

          {/* Secret */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Secret:</span>
            <code className="font-mono bg-muted px-2 py-0.5 rounded truncate max-w-[180px]">
              {wh.secret.slice(0, 8)}••••••••
            </code>
            <button
              onClick={() => copySecret(wh.secret, wh.id)}
              aria-label="Copy signing secret"
              className="hover:text-foreground"
            >
              <Copy size={12} />
            </button>
            {copied === wh.id && (
              <span className="text-green-500">Copied!</span>
            )}
          </div>

          {/* Rate limit */}
          <div className="text-xs text-muted-foreground">
            Rate limit:{" "}
            <span
              className={wh.rateLimit < 10 ? "text-yellow-500 font-medium" : ""}
            >
              {wh.rateLimit}/60
            </span>{" "}
            remaining this minute
          </div>

          {/* Retry configuration */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t pt-3">
            <span className="font-medium text-foreground">Retry config:</span>
            <label className="flex items-center gap-1">
              Max retries:
              <input
                type="number"
                min={0}
                max={10}
                value={wh.maxRetries}
                onChange={(e) =>
                  updateRetryConfig(
                    wh.id,
                    Number(e.target.value),
                    wh.backoffInterval
                  )
                }
                className="ml-1 w-14 rounded border bg-background px-2 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label={`Max retries for ${wh.url}`}
              />
            </label>
            <label className="flex items-center gap-1">
              Backoff (ms):
              <input
                type="number"
                min={100}
                max={60000}
                step={100}
                value={wh.backoffInterval}
                onChange={(e) =>
                  updateRetryConfig(
                    wh.id,
                    wh.maxRetries,
                    Number(e.target.value)
                  )
                }
                className="ml-1 w-20 rounded border bg-background px-2 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label={`Backoff interval for ${wh.url}`}
              />
            </label>
          </div>

          {/* Delivery history */}
          {wh.deliveries.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Delivery history ({wh.deliveries.length})
              </summary>
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {wh.deliveries.map((d) => (
                  <div
                    key={d.id}
                    className={`flex justify-between px-2 py-1 rounded ${
                      d.status === "success"
                        ? "bg-green-500/10 text-green-600"
                        : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    <span>{new Date(d.timestamp).toLocaleTimeString()}</span>
                    <span>
                      {d.status === "success"
                        ? `✓ ${d.statusCode}`
                        : `✗ ${d.error}`}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Failure history */}
          {wh.deliveries.filter((d) => d.status === "failed").length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-red-500 hover:text-red-600">
                Failure history (
                {wh.deliveries.filter((d) => d.status === "failed").length})
              </summary>
              <div
                className="mt-2 space-y-1 max-h-48 overflow-y-auto"
                role="log"
                aria-label="Webhook failure history"
              >
                {wh.deliveries
                  .filter((d) => d.status === "failed")
                  .map((d) => (
                    <div
                      key={d.id}
                      className="grid grid-cols-3 gap-2 px-2 py-1.5 rounded bg-red-500/10 text-red-500"
                    >
                      <span title={d.timestamp}>
                        {new Date(d.timestamp).toLocaleTimeString()}
                      </span>
                      <span>Status: {d.statusCode ?? "N/A"}</span>
                      <span>Attempt #{d.attemptNumber ?? "?"}</span>
                      {d.error && (
                        <span
                          className="col-span-3 truncate text-red-400"
                          title={d.error}
                        >
                          {d.error}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </details>
          )}
        </div>
      ))}
    </section>
  );
}
