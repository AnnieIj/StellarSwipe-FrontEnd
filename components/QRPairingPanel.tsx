"use client";

/**
 * QRPairingPanel
 *
 * Displays a scannable QR code and status UI for mobile wallet pairing.
 * Rendered inside WalletSelectionModal when the user picks the QR option.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Smartphone,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  useQRPairing,
  formatCountdown,
  describeCountdown,
} from "@/hooks/useQRPairing";
import { renderQRCode } from "@/lib/qrcode";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as Sentry from "@sentry/nextjs";

/** Remaining-time thresholds (seconds) announced to screen readers. */
const ANNOUNCE_AT = new Set([60, 30, 10]);

interface QRPairingPanelProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function QRPairingPanel({ onSuccess, onCancel }: QRPairingPanelProps) {
  const {
    status,
    uri,
    secondsLeft,
    ttlMs,
    errorMessage,
    startSession,
    regenerate,
    cancel,
  } = useQRPairing();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previousUriRef = useRef<string | null>(null);
  // True once a renewed code has replaced an earlier one in this panel.
  const [renewed, setRenewed] = useState(false);

  // Start session on mount
  useEffect(() => {
    startSession();
    return () => cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Note when a new code replaces the previous one so users know to rescan.
  useEffect(() => {
    if (uri && previousUriRef.current && previousUriRef.current !== uri) {
      setRenewed(true);
    }
    if (uri) previousUriRef.current = uri;
  }, [uri]);

  // Render QR onto canvas whenever URI changes
  useEffect(() => {
    if (!uri || !canvasRef.current) return;
    try {
      renderQRCode(canvasRef.current, uri, {
        size: 220,
        margin: 3,
        darkColor: "#0f172a",
        lightColor: "#ffffff",
      });
    } catch (err) {
      Sentry.captureException(err);
    }
  }, [uri]);

  // Close modal on successful pairing
  useEffect(() => {
    if (status === "paired") {
      const t = setTimeout(onSuccess, 1200); // brief "paired" feedback delay
      return () => clearTimeout(t);
    }
  }, [status, onSuccess]);

  const handleCancel = useCallback(() => {
    cancel();
    onCancel();
  }, [cancel, onCancel]);

  const progressPercent = (secondsLeft / (ttlMs / 1000)) * 100;
  const isExpiredOrError =
    status === "expired" || status === "rejected" || status === "error";
  const isActive = status === "pending" || status === "scanning";
  const ttlMinutes = Math.round(ttlMs / 60_000);

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {/* Instructions */}
      <div className="flex items-center gap-2 text-center text-sm text-foreground-muted">
        <Smartphone
          size={16}
          className="shrink-0 text-blue-400"
          aria-hidden="true"
        />
        <p>Open your mobile wallet app and scan this code to connect.</p>
      </div>

      {/* QR canvas area */}
      <div className="relative">
        {/* Canvas */}
        <div
          className={cn(
            "relative rounded-xl border-2 p-2 transition-colors",
            status === "paired"
              ? "border-green-500/60 bg-green-500/10"
              : status === "expired" ||
                status === "rejected" ||
                status === "error"
              ? "border-red-500/40 bg-red-500/5"
              : "border-border bg-white"
          )}
          aria-label={
            status === "pending" || status === "scanning"
              ? "QR code for wallet pairing"
              : undefined
          }
        >
          <canvas
            ref={canvasRef}
            width={220}
            height={220}
            role="img"
            aria-label="Wallet pairing QR code"
            className={cn(
              "block rounded-lg transition-opacity",
              isExpiredOrError || status === "paired"
                ? "opacity-30"
                : "opacity-100",
              status === "expired" && "blur-[3px]"
            )}
          />

          {/* Overlay states */}
          <AnimatePresence>
            {status === "paired" && (
              <motion.div
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <CheckCircle2 size={48} className="text-green-400" />
                <span className="text-sm font-semibold text-green-300">
                  Wallet paired!
                </span>
              </motion.div>
            )}

            {(status === "expired" ||
              status === "rejected" ||
              status === "error") && (
              <motion.div
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {status === "rejected" ? (
                  <XCircle size={40} className="text-red-400" />
                ) : status === "expired" ? (
                  <Clock size={40} className="text-amber-400" />
                ) : (
                  <AlertCircle size={40} className="text-red-400" />
                )}
                <p className="text-xs text-center text-foreground-muted max-w-[160px] leading-snug">
                  {errorMessage}
                </p>
              </motion.div>
            )}

            {status === "scanning" && (
              <motion.div
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/30 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Loader2 size={36} className="text-blue-400 animate-spin" />
                <span className="text-xs text-blue-200">
                  Waiting for approval…
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Expiry countdown — only show while code is active */}
      {isActive && (
        <div className="w-full max-w-[220px] space-y-1">
          <div
            role="timer"
            aria-label={`Pairing code expires in ${describeCountdown(secondsLeft)}`}
            className="flex items-center justify-between text-xs text-foreground-muted"
          >
            <span className="flex items-center gap-1" aria-hidden="true">
              <Clock size={11} aria-hidden="true" />
              Expires in
            </span>
            <span className="tabular-nums font-medium" aria-hidden="true">
              {formatCountdown(secondsLeft)}
            </span>
          </div>
          {/* Announce only at a few thresholds rather than every second. */}
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {ANNOUNCE_AT.has(secondsLeft)
              ? `${describeCountdown(secondsLeft)} left to scan the pairing code`
              : ""}
          </p>
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-foreground/10"
            aria-hidden="true"
          >
            <motion.div
              className={cn(
                "h-full rounded-full transition-colors",
                secondsLeft > 30 ? "bg-blue-500" : "bg-amber-400"
              )}
              style={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.9, ease: "linear" }}
            />
          </div>
        </div>
      )}

      {/* Renewed code notice */}
      {isActive && renewed && (
        <p
          className="text-center text-xs text-foreground-muted"
          role="status"
          aria-live="polite"
        >
          New code ready — the previous code no longer works.
        </p>
      )}

      {/* Explicit expired state */}
      {status === "expired" && (
        <div
          className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-200"
          data-testid="qr-expired-state"
        >
          <p className="font-semibold text-amber-300">
            This pairing code has expired
          </p>
          <p className="mt-0.5">
            Codes are valid for {ttlMinutes} minute{ttlMinutes === 1 ? "" : "s"}.
            Request a new code to keep connecting — you won&apos;t need to start
            over.
          </p>
        </div>
      )}

      {/* Status badge */}
      <StatusBadge status={status} />

      {/* Actions */}
      <div className="flex w-full gap-2">
        {isExpiredOrError ? (
          <Button
            onClick={regenerate}
            className="flex-1 gap-2"
            aria-label="Generate a new pairing code"
          >
            <RefreshCw size={14} aria-hidden="true" />
            New code
          </Button>
        ) : status !== "paired" ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={regenerate}
            className="gap-1 text-foreground-muted"
            aria-label="Regenerate pairing code"
          >
            <RefreshCw size={13} aria-hidden="true" />
            Regenerate
          </Button>
        ) : null}

        {status !== "paired" && (
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: {
      label: "Waiting for scan…",
      cls: "bg-blue-500/15 text-blue-300",
    },
    scanning: {
      label: "Wallet scanned — approve in app",
      cls: "bg-blue-500/15 text-blue-300",
    },
    paired: {
      label: "Successfully paired",
      cls: "bg-green-500/15 text-green-300",
    },
    expired: { label: "Code expired", cls: "bg-amber-500/15 text-amber-300" },
    rejected: { label: "Pairing rejected", cls: "bg-red-500/15 text-red-300" },
    error: { label: "Pairing error", cls: "bg-red-500/15 text-red-300" },
  };
  const entry = map[status];
  if (!entry) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        entry.cls
      )}
      role="status"
      aria-live="polite"
    >
      {entry.label}
    </span>
  );
}
