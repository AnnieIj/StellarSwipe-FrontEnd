"use client";

import { AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlossaryTerm } from "@/components/GlossaryTerm";

interface SlippageWarningProps {
  /** Slippage percentage, e.g. 1.8 means 1.8% */
  slippage: number;
  /** Safe threshold above which the warning is shown (default 1%) */
  threshold?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Non-blocking inline slippage warning shown inside the trade flow when
 * estimated slippage exceeds the safe threshold.
 *
 * Accessibility:
 * - role="alert" so screen readers announce it immediately on mount.
 * - Confirm / Cancel buttons are keyboard-operable and have clear labels.
 */
export function SlippageWarning({
  slippage,
  threshold = 1,
  onConfirm,
  onCancel,
}: SlippageWarningProps) {
  const isVisible = slippage > threshold;

  // Severity: warn (1–3%) vs danger (>3%)
  const isDanger = slippage > 3;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="slippage-warning"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className={`rounded-xl border p-3 text-sm
            ${
              isDanger
                ? "border-accent-danger/40 bg-accent-danger/10"
                : "border-accent-warning/40 bg-accent-warning/10"
            }`}
        >
          {/* Header row */}
          <div className="flex items-start gap-2">
            <AlertTriangle
              size={16}
              className={`mt-0.5 shrink-0 ${
                isDanger ? "text-accent-danger" : "text-accent-warning"
              }`}
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <p
                className={`font-semibold leading-snug ${
                  isDanger ? "text-accent-danger" : "text-accent-warning"
                }`}
              >
                {isDanger ? (
                  <>
                    High <GlossaryTerm term="slippage">slippage</GlossaryTerm>{" "}
                    detected
                  </>
                ) : (
                  <>
                    <GlossaryTerm term="slippage">Slippage</GlossaryTerm>{" "}
                    warning
                  </>
                )}
              </p>
              <p className="mt-0.5 text-xs text-foreground-muted leading-relaxed">
                Estimated slippage is{" "}
                <strong
                  className={
                    isDanger ? "text-accent-danger" : "text-accent-warning"
                  }
                >
                  {slippage.toFixed(2)}%
                </strong>
                {isDanger
                  ? " — market movement is significant. You may receive considerably less than expected."
                  : " — market conditions have shifted slightly. Your fill price may differ from the displayed price."}
              </p>
            </div>
          </div>

          {/* Action row */}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onConfirm}
              aria-label={`Confirm trade despite ${slippage.toFixed(
                2
              )}% slippage`}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface
                ${
                  isDanger
                    ? "bg-accent-danger/20 text-accent-danger hover:bg-accent-danger/30"
                    : "bg-accent-warning/20 text-accent-warning hover:bg-accent-warning/30"
                }`}
            >
              Confirm anyway
            </button>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel trade and review order"
              className="flex-1 rounded-lg py-2 text-xs font-semibold bg-foreground/8 text-foreground-muted hover:bg-foreground/15 transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
