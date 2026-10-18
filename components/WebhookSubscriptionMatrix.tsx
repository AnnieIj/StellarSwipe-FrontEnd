"use client";

import { useState } from "react";
import type { Webhook, WebhookEventType } from "@/store/useWebhookStore";

type CellState = "pending" | "saved" | "failed";

export interface WebhookSubscriptionMatrixProps {
  webhooks: Webhook[];
  events: { value: WebhookEventType; label: string }[];
  onUpdate: (id: string, events: WebhookEventType[]) => Promise<void> | void;
}

const STATE_TEXT: Record<CellState, string> = {
  pending: "Saving…",
  saved: "Saved",
  failed: "Failed",
};

/** Endpoint × event grid of subscription checkboxes with save feedback. */
export function WebhookSubscriptionMatrix({
  webhooks,
  events,
  onUpdate,
}: WebhookSubscriptionMatrixProps) {
  const [cells, setCells] = useState<Record<string, CellState>>({});

  const toggle = async (wh: Webhook, event: WebhookEventType) => {
    const key = `${wh.id}:${event}`;
    const next = wh.events.includes(event)
      ? wh.events.filter((e) => e !== event)
      : [...wh.events, event];
    setCells((c) => ({ ...c, [key]: "pending" }));
    try {
      await onUpdate(wh.id, next);
      setCells((c) => ({ ...c, [key]: "saved" }));
    } catch {
      setCells((c) => ({ ...c, [key]: "failed" }));
    }
  };

  const failed = Object.values(cells).includes("failed");

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <h3 className="font-medium text-sm">Event subscriptions</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th scope="col" className="text-left font-medium py-1 pr-2">
                Endpoint
              </th>
              {events.map((ev) => (
                <th key={ev.value} scope="col" className="font-medium py-1 px-2">
                  {ev.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {webhooks.map((wh) => (
              <tr key={wh.id} className="border-t">
                <th
                  scope="row"
                  className="text-left font-mono font-normal py-1 pr-2 truncate max-w-[12rem]"
                  title={wh.url}
                >
                  {wh.url}
                </th>
                {events.map((ev) => {
                  const state = cells[`${wh.id}:${ev.value}`];
                  return (
                    <td key={ev.value} className="text-center py-1 px-2">
                      <input
                        type="checkbox"
                        checked={wh.events.includes(ev.value)}
                        disabled={state === "pending"}
                        onChange={() => toggle(wh, ev.value)}
                        aria-label={`${ev.label} events for ${wh.url}`}
                      />
                      {state && (
                        <span
                          className={`block text-[10px] ${
                            state === "failed"
                              ? "text-red-500"
                              : "text-muted-foreground"
                          }`}
                        >
                          {STATE_TEXT[state]}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {failed && (
        <p role="alert" className="text-xs text-red-500">
          Some subscription changes could not be saved. Try again.
        </p>
      )}
    </div>
  );
}
