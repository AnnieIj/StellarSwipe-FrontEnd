"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useQueryClient } from "@tanstack/react-query";

const LOST_FEATURES = [
  "Unlimited premium signal access",
  "Priority signal alerts & push notifications",
  "Advanced analytics dashboard",
  "Backtesting simulator",
  "Provider comparison tools",
];

interface CancelSubscriptionModalProps {
  subscriptionId: string;
  open: boolean;
  onClose: () => void;
  /** Called after successful cancellation with the updated status */
  onCancelled: () => void;
}

export function CancelSubscriptionModal({
  subscriptionId,
  open,
  onClose,
  onCancelled,
}: CancelSubscriptionModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const focusTrapRef = useFocusTrap({ isActive: open });
  const queryClient = useQueryClient();

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to cancel subscription");
      }
      // Invalidate subscription cache so UI reflects new state immediately
      await queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      onCancelled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-modal flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-overlay/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            ref={focusTrapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-sub-title"
            aria-describedby="cancel-sub-desc"
            className="relative z-overlay w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-accent-warning shrink-0" aria-hidden="true" />
                <h2 id="cancel-sub-title" className="text-lg font-semibold text-foreground">
                  Cancel subscription?
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="rounded-full p-1 text-foreground-muted hover:text-foreground hover:bg-foreground/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            {/* Description */}
            <p id="cancel-sub-desc" className="text-sm text-foreground-muted mb-4">
              You will immediately lose access to the following premium features at the end of your
              current billing period:
            </p>

            {/* Lost features list */}
            <ul className="mb-5 space-y-2" aria-label="Features you will lose">
              {LOST_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent-danger" aria-hidden="true" />
                  <span className="text-foreground-muted">{feature}</span>
                </li>
              ))}
            </ul>

            {error && (
              <p role="alert" className="mb-4 rounded-lg border border-accent-danger/30 bg-accent-danger/10 px-3 py-2 text-sm text-accent-danger">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Keep subscription
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={submitting}
                aria-busy={submitting}
                className="bg-accent-danger hover:bg-accent-danger/90 text-white"
              >
                {submitting ? "Cancelling…" : "Yes, cancel subscription"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
