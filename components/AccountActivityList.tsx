"use client";

import { History } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { type AccountActivity, formatTimestamp } from "@/lib/sessionUtils";

export interface AccountActivityListProps {
  /** undefined while loading; null when the service could not provide history */
  activity?: AccountActivity[] | null;
}

/**
 * Recent sign-in and session events, shown separately from the active
 * session list. Device and location appear only when the service reports them.
 */
export function AccountActivityList({ activity }: AccountActivityListProps) {
  return (
    <Card role="region" aria-labelledby="account-activity-heading">
      <CardHeader>
        <h2
          id="account-activity-heading"
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <History size={14} aria-hidden="true" />
          Recent account activity
        </h2>
        <p className="text-xs text-foreground-muted mt-0.5">
          Past sign-in and session events. This is history, not a list of
          devices that are signed in now.
        </p>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {activity === undefined ? (
          <p className="text-sm text-foreground-muted" aria-busy="true">
            Loading activity…
          </p>
        ) : activity === null ? (
          <p className="text-sm text-foreground-muted" data-testid="activity-unavailable">
            Activity history is unavailable right now.
          </p>
        ) : activity.length === 0 ? (
          <p className="text-sm text-foreground-muted" data-testid="activity-empty">
            No recent account activity recorded.
          </p>
        ) : (
          <ul aria-label="Recent account activity" className="divide-y divide-border">
            {activity.map((item) => {
              const when = formatTimestamp(item.occurredAt);
              const details = [item.device, item.location].filter(Boolean);
              return (
                <li key={item.id} className="py-2 text-xs">
                  <p className="text-sm text-foreground">{item.description}</p>
                  <p className="text-foreground-muted">
                    {when ? (
                      <time dateTime={item.occurredAt}>{when}</time>
                    ) : (
                      "Time unavailable"
                    )}
                    {details.length > 0 && ` · ${details.join(" · ")}`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
