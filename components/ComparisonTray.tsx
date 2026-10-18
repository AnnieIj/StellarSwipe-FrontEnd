"use client";

import { X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useComparisonStore, MAX_COMPARISON } from "@/store/useComparisonStore";

export function ComparisonTray() {
  const { signals, limitReached, removeSignal, clearAll, dismissLimitMessage } =
    useComparisonStore();
  const prefersReducedMotion = useReducedMotion();

  // Don't render the tray at all when there's nothing to show
  if (signals.length === 0 && !limitReached) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Signal comparison tray"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-background/95 backdrop-blur border-t border-border shadow-lg",
        // Safe-area insets: keep content above the home indicator on iOS/notched devices
        "px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]"
      )}
    >
      {/* Limit-reached banner */}
      <AnimatePresence>
        {limitReached && (
          <motion.div
            key="limit-banner"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            role="alert"
            aria-live="assertive"
            className={cn(
              "flex items-center justify-between gap-2",
              "mb-3 rounded-md bg-destructive/10 border border-destructive/30",
              "px-3 py-2 text-sm text-destructive"
            )}
          >
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              You can compare up to {MAX_COMPARISON} signals at once. Remove one
              to add another.
            </span>
            <button
              type="button"
              aria-label="Dismiss limit message"
              onClick={dismissLimitMessage}
              className="rounded p-0.5 hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tray items + clear-all row */}
      <div className="flex items-center gap-3 flex-wrap">
        <AnimatePresence initial={false}>
          {signals.map((signal) => (
            <motion.div
              key={signal.id}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.15 }}
              className={cn(
                "flex items-center gap-1.5 rounded-full",
                "bg-secondary text-secondary-foreground",
                "pl-3 pr-1.5 py-1 text-sm font-medium"
              )}
            >
              <span className="max-w-[140px] truncate">{signal.ticker}</span>
              <button
                type="button"
                aria-label={`Remove ${signal.ticker} from comparison`}
                onClick={() => removeSignal(signal.id)}
                className={cn(
                  "rounded-full p-0.5",
                  "hover:bg-foreground/10",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                )}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {signals.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}
