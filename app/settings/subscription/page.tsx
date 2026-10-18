"use client";

import { useState } from "react";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { SubscriptionStatus } from "@/lib/subscriptionStatus";
import { CancelSubscriptionModal } from "@/components/CancelSubscriptionModal";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_ICON: Record<SubscriptionStatus, React.ReactNode> = {
  [SubscriptionStatus.Active]:    <CheckCircle size={16} className="text-accent-success" aria-hidden="true" />,
  [SubscriptionStatus.Cancelled]: <XCircle     size={16} className="text-accent-danger"  aria-hidden="true" />,
  [SubscriptionStatus.Expired]:   <XCircle     size={16} className="text-foreground-muted" aria-hidden="true" />,
  [SubscriptionStatus.Pending]:   <Clock       size={16} className="text-accent-warning" aria-hidden="true" />,
  [SubscriptionStatus.Inactive]:  <XCircle     size={16} className="text-foreground-muted" aria-hidden="true" />,
};

export default function SubscriptionSettingsPage() {
  const { data: subscriptions, isLoading, error, refetch } = useSubscriptions();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const activeSubscription = subscriptions?.find(
    (s) => s.status === SubscriptionStatus.Active
  );

  if (isLoading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12">
        <p className="text-sm text-foreground-muted">Loading subscription details…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12">
        <p role="alert" className="text-sm text-accent-danger">
          Failed to load subscription. Please try again.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Subscription settings</h1>

      {subscriptions?.length === 0 && (
        <p className="text-sm text-foreground-muted">No subscriptions found.</p>
      )}

      <ul className="space-y-3" aria-label="Your subscriptions">
        {subscriptions?.map((sub) => (
          <li
            key={sub.id}
            className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
          >
            <div className="flex items-center gap-2">
              {STATUS_ICON[sub.status]}
              <div>
                <p className="text-sm font-medium text-foreground capitalize">{sub.status}</p>
                <p className="text-xs text-foreground-subtle">ID: {sub.id}</p>
              </div>
            </div>

            {sub.status === SubscriptionStatus.Active && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancellingId(sub.id)}
                className="text-accent-danger border-accent-danger/40 hover:bg-accent-danger/10"
                aria-label={`Cancel subscription ${sub.id}`}
              >
                Cancel
              </Button>
            )}
          </li>
        ))}
      </ul>

      {cancellingId && (
        <CancelSubscriptionModal
          subscriptionId={cancellingId}
          open={!!cancellingId}
          onClose={() => setCancellingId(null)}
          onCancelled={() => {
            setCancellingId(null);
            refetch();
          }}
        />
      )}
    </main>
  );
}
