"use client";

import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, RefreshCw, X, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTransactionStore } from "@/store/useTransactionStore";
import { showNotification } from "@/lib/notifications";
import { useNotificationPreference } from "@/hooks/useNotificationPreference";
import analyticsService from "@/services/analytics";

interface TransactionFailureProps {
  onRetry?: (preservedInput: Record<string, unknown> | null) => void;
}

export function TransactionFailure({ onRetry }: TransactionFailureProps) {
  const { error, showError, clearError, preservedInput, setPreservedInput } =
    useTransactionStore();
  const { alertsEnabled, toggleAlerts, categoryPreferences } =
    useNotificationPreference();

  const handleRetry = useCallback(() => {
    const input = preservedInput;
    clearError();
    setPreservedInput(null);
    onRetry?.(input);
  }, [clearError, preservedInput, setPreservedInput, onRetry]);

  const handleDismiss = useCallback(() => {
    clearError();
    setPreservedInput(null);
  }, [clearError, setPreservedInput]);

  useEffect(() => {
    if (!showError || !error) return;
    if (alertsEnabled && categoryPreferences.systemUpdates) {
      showNotification("Trade Failed", {
        body:
          error.message || "Something went wrong during the trade execution.",
        icon: "⚠️",
        category: "systemUpdates",
        critical: true,
      });
    }
    analyticsService.track("trade_confirmation_failed", {
      error_message: error.message || "unknown_error",
      error_code: error.code || undefined,
    });
  }, [showError, error, alertsEnabled, categoryPreferences.systemUpdates]);

  if (!error) return null;

  return (
    <AnimatePresence>
      {showError && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="absolute inset-0 bg-overlay/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
          />

          <motion.div
            className="relative w-full max-w-md rounded-2xl border border-red-500/20 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 shadow-2xl shadow-red-500/10 sm:p-6"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="absolute right-4 top-4 flex gap-2">
              <button
                onClick={() => toggleAlerts(!alertsEnabled)}
                aria-label={
                  alertsEnabled
                    ? "Disable outcome alerts"
                    : "Enable outcome alerts"
                }
                className="rounded-full p-1 text-foreground-subtle transition-colors hover:bg-surface-high hover:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title={alertsEnabled ? "Alerts enabled" : "Alerts disabled"}
              >
                {alertsEnabled ? (
                  <Bell className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <BellOff className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              <button
                onClick={handleDismiss}
                aria-label="Close"
                className="rounded-full p-1 text-foreground-subtle transition-colors hover:bg-surface-high hover:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mb-4 flex justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.1,
                }}
              >
                <div className="relative">
                  <motion.div
                    className="absolute -inset-2 rounded-full bg-accent-danger/20 blur-xl"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <motion.div
                    animate={{ rotate: [0, -8, 8, -8, 0] }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <AlertTriangle className="relative h-14 w-14 text-accent-danger" />
                  </motion.div>
                </div>
              </motion.div>
            </div>

            <motion.h2
              id="tx-failure-title"
              className="mb-1 text-center text-xl font-semibold text-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Transaction Failed
            </motion.h2>
            <motion.p
              className="mb-6 text-center text-sm text-foreground-muted"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              {error.message ||
                "Something went wrong during the trade execution."}
            </motion.p>

            {(error.reason || error.code) && (
              <motion.div
                className="mb-6 space-y-2 rounded-xl bg-accent-danger/10 border border-accent-danger/10 p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {error.code && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground-subtle">
                      Error Code
                    </span>
                    <span className="text-xs font-mono text-accent-danger">
                      {error.code}
                    </span>
                  </div>
                )}
                {error.reason && (
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs text-foreground-subtle shrink-0">
                      Reason
                    </span>
                    <span className="text-xs text-right text-foreground-muted">
                      {error.reason}
                    </span>
                  </div>
                )}
              </motion.div>
            )}

            <motion.div
              className="flex flex-col gap-2 sm:flex-row"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Button
                onClick={handleRetry}
                className="flex-1 gap-2 bg-accent-danger text-foreground hover:opacity-90"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                className="flex-1 gap-2"
              >
                Dismiss
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
