"use client";

import { useTransactionStore } from "@/store/useTransactionStore";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TradeStatusBanner — #100
 * Persistent banner showing current trade execution status.
 * Displays success/error state, action buttons for retry or view details,
 * and stays visible without disrupting the feed.
 */
export function TradeStatusBanner() {
  const {
    success,
    showSuccess,
    error,
    showError,
    preservedInput,
    clearSuccess,
    clearError,
    setError,
  } = useTransactionStore();

  if (!showSuccess && !showError) return null;

  const isSuccess = showSuccess && !!success;
  const isError = showError && !!error;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={
        isSuccess ? "Trade executed successfully" : "Trade execution failed"
      }
      className={cn(
        "fixed bottom-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-sm transition-all",
        isSuccess
          ? "border-green-500/30 bg-green-950/90 text-green-300"
          : "border-red-500/30 bg-red-950/90 text-red-300"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <span className="mt-0.5 shrink-0" aria-hidden="true">
          {isSuccess ? (
            <CheckCircle2 size={18} className="text-green-400" />
          ) : (
            <XCircle size={18} className="text-red-400" />
          )}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {isSuccess ? "Trade executed" : "Trade failed"}
          </p>

          {isSuccess && success && (
            <p className="mt-0.5 text-xs text-green-400/80 truncate">
              {success.amount} {success.token} · Fee: {success.fee}
            </p>
          )}

          {isError && error && (
            <p className="mt-0.5 text-xs text-red-400/80">
              {error.message}
              {error.code && (
                <span className="ml-1 opacity-60">({error.code})</span>
              )}
            </p>
          )}

          {/* Action buttons */}
          <div className="mt-2 flex items-center gap-3">
            {isSuccess && success?.hash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${success.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View transaction details on Stellar Explorer"
                className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-400 rounded"
              >
                <ExternalLink size={11} aria-hidden="true" />
                View details
              </a>
            )}

            {isError && (
              <button
                onClick={() => {
                  clearError();
                  // Re-surface preserved input so the trade modal can retry
                  if (preservedInput) {
                    setError({ message: "Retrying…", code: "RETRY" });
                    clearError();
                  }
                }}
                aria-label="Retry failed trade"
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400 rounded"
              >
                <RefreshCw size={11} aria-hidden="true" />
                Retry
              </button>
            )}
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={isSuccess ? clearSuccess : clearError}
          aria-label="Dismiss trade status banner"
          className={cn(
            "shrink-0 rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-1",
            isSuccess
              ? "hover:bg-green-800/50 focus-visible:ring-green-400"
              : "hover:bg-red-800/50 focus-visible:ring-red-400"
          )}
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
