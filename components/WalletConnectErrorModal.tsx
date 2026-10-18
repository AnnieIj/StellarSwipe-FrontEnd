"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { isTopOverlay } from "@/hooks/overlayManager";

export type WalletConnectErrorReason =
  | "not_found"
  | "error"
  | "timeout"
  | null;

interface WalletConnectErrorModalProps {
  open: boolean;
  reason: WalletConnectErrorReason;
  onClose: () => void;
  onRetry: () => void;
}

const RECOVERY_STEPS: Record<
  NonNullable<WalletConnectErrorReason>,
  { title: string; description: string; steps: string[] }
> = {
  not_found: {
    title: "Freighter Not Found",
    description:
      "The Freighter wallet extension was not detected in your browser.",
    steps: [
      "Install the Freighter extension from freighter.app",
      "Refresh this page after installation",
      "Click \u201cConnect Wallet\u201d and try again",
    ],
  },
  error: {
    title: "Connection Failed",
    description:
      "An unexpected error occurred while connecting to your Freighter wallet.",
    steps: [
      "Ensure Freighter is unlocked and up to date",
      "Check that you are on a supported network",
      "Disable other wallet extensions that may conflict",
      "Try again — if the issue persists, reload the page",
    ],
  },
  timeout: {
    title: "Connection Timed Out",
    description:
      "Your wallet didn't respond within 20 seconds, so the request was cancelled.",
    steps: [
      "Check for a Freighter approval popup that may be hidden behind this window",
      "Make sure Freighter is unlocked",
      "Try connecting again — wait for the prompt to fully load",
    ],
  },
};

export function WalletConnectErrorModal({
  open,
  reason,
  onClose,
  onRetry,
}: WalletConnectErrorModalProps) {
  const focusTrapRef = useFocusTrap({
    isActive: open,
    initialFocus: '[data-autofocus="true"]',
  });

  // ESC to close only if this modal is the topmost overlay (prevents nested
  // modals from closing their parents).
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const el = focusTrapRef.current as HTMLElement | null;
      if (isTopOverlay(el)) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const content = reason ? RECOVERY_STEPS[reason] : null;

  return (
    <AnimatePresence>
      {open && content && (
        <motion.div
          className="fixed inset-0 z-modal flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-overlay/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            ref={focusTrapRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="wallet-error-title"
            aria-describedby="wallet-error-description"
            className="relative z-overlay w-full max-w-sm rounded-2xl border border-red-500/30 bg-surface/95 p-6 shadow-2xl"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close error modal"
              className="absolute right-4 top-4 rounded-full p-1 text-foreground-muted hover:text-foreground hover:bg-surface-high/40 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <X size={18} />
            </button>

            {/* Icon + Title */}
            <div className="flex items-start gap-3 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30">
                <AlertTriangle
                  size={20}
                  className="text-red-400"
                  aria-hidden="true"
                />
              </div>
              <div>
                <h2
                  id="wallet-error-title"
                  className="text-base font-semibold text-foreground"
                >
                  {content.title}
                </h2>
                <p
                  id="wallet-error-description"
                  className="mt-0.5 text-sm text-foreground-muted"
                >
                  {content.description}
                </p>
              </div>
            </div>

            {/* Recovery steps */}
            <div className="mb-5 rounded-xl border border-border bg-surface-high p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Recovery steps
              </p>
              <ol className="space-y-2">
                {content.steps.map((step, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <CheckCircle2
                      size={14}
                      className="mt-0.5 shrink-0 text-accent-primary"
                      aria-hidden="true"
                    />
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {reason === "not_found" ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-gray-400 hover:text-white"
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    data-autofocus="true"
                    onClick={() => {
                      window.open(
                        "https://www.freighter.app",
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }}
                    className="gap-2"
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                    Install Freighter
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-gray-400 hover:text-white"
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    data-autofocus="true"
                    onClick={() => {
                      onClose();
                      onRetry();
                    }}
                    className="gap-2"
                  >
                    <RefreshCw size={14} aria-hidden="true" />
                    Retry Connection
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
