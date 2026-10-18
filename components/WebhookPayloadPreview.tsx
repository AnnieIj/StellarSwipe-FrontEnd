"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSamplePayloadPreview } from "@/services/webhookService";

export interface WebhookPayloadPreviewProps {
  events: { value: string; label: string }[];
}

/** Shows a labeled sample payload and schema version for a selected event. */
export function WebhookPayloadPreview({ events }: WebhookPayloadPreviewProps) {
  const [event, setEvent] = useState(events[0]?.value ?? "");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const preview = getSamplePayloadPreview(event);
  const json = preview ? JSON.stringify(preview.payload, null, 2) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopyStatus("Sample payload copied to clipboard.");
    } catch {
      setCopyStatus("Could not copy the sample payload. Select and copy it manually.");
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="font-medium text-sm">Event payload preview</h3>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Event type
        <select
          value={event}
          onChange={(e) => {
            setEvent(e.target.value);
            setCopyStatus(null);
          }}
          className="rounded-md border bg-background px-2 py-1 text-sm text-foreground"
        >
          {events.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {preview ? (
        <>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              Sample data · Schema version {preview.version}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copy}
              aria-label="Copy sample payload"
              className="gap-1 text-xs"
            >
              <Copy size={12} /> Copy
            </Button>
          </div>
          <pre
            aria-label="Sample webhook payload"
            tabIndex={0}
            className="max-h-64 overflow-auto rounded bg-muted p-3 text-xs font-mono"
          >
            {json}
          </pre>
          {copyStatus && (
            <p role="status" className="text-xs text-muted-foreground">
              {copyStatus}
            </p>
          )}
        </>
      ) : (
        <p role="status" className="text-xs text-muted-foreground">
          No sample payload is available for this event yet. Check the webhook
          documentation or send a test webhook to inspect a live payload.
        </p>
      )}
    </div>
  );
}
