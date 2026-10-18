"use client";

/**
 * AccountDeletionDialog.tsx
 *
 * Multi-step, accessible dialog that walks the user through confirming their
 * intent to delete their account and drives the Zustand deletion state machine.
 *
 * Steps
 * ──────
 *  1. WARNING   – explains what is irreversible and what is retained.
 *  2. CONFIRM   – user must type DELETION_CONFIRM_PHRASE to unlock the button.
 *  3. PROCESSING – spinner while the DELETE request is in flight.
 *  4. SUCCESS   – confirmation that deletion has been queued.
 *  5. ERROR     – error detail with retry option.
 *
 * Accessibility
 * ─────────────
 * • role="alertdialog" with aria-modal, aria-labelledby, aria-describedby.
 * • Focus-trap via useFocusTrap.
 * • Keyboard: Escape closes (except during PROCESSING).
 * • Live region announces status changes to screen readers.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Trash2,
  X,
  CheckCircle2,
  RefreshCw,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useAccountDeletionStore } from "@/store/useAccountDeletionStore";
import {
  DELETION_CONFIRM_PHRASE,
  DEFAULT_RETENTION_POLICY,
  RETENTION_CATEGORIES,
} from "@/lib/accountDeletion";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AccountDeletionDialogProps {
  /** Whether the dialog is visible. */
  open: boolean;
  /** Stellar public key of the authenticated user. */
  publicKey: string;
  /** Called when the dialog should be hidden (after close/cancel or on success). */
  onClose: () => void;
  /**
   * Optional callback after the deletion request is confirmed by the server.
   * Use this to sign the user out and redirect.
   */
  onDeleted?: () => void;
}

// ─── Local types ──────────────────────────────────────────────────────────────

type DialogStep = "WARNING" | "CONFIRM" | "PROCESSING" | "SUCCESS" | "ERROR";

// ─── Component ────────────────────────────────────────────────────────────────

export function AccountDeletionDialog({
  open,
  publicKey,
  onClose,
  onDeleted,
}: AccountDeletionDialogProps) {
  const store = useAccountDeletionStore();
  const [step, setStep] = useState<DialogStep>("WARNING");
  const [confirmInput, setConfirmInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const focusTrapRef = useFocusTrap({
    isActive: open,
    initialFocus: '[data-autofocus="true"]',
  });

  // ── Sync store state → local step ──────────────────────────────────────────
  useEffect(() => {
    if (store.state === "PENDING") setStep("PROCESSING");
    else if (store.state === "COMPLETED") setStep("SUCCESS");
    else if (store.state === "FAILED") setStep("ERROR");
  }, [store.state]);

  // ── ESC to close (not during processing) ──────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step !== "PROCESSING") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  // ── Auto-focus input when CONFIRM step becomes visible ─────────────────────
  useEffect(() => {
    if (step === "CONFIRM") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [step]);

  // ── Reset on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setStep("WARNING");
      setConfirmInput("");
      if (store.state !== "IDLE") store.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleClose() {
    if (step === "PROCESSING") return; // block close while in-flight
    if (step === "SUCCESS") {
      store.reset();
      onDeleted?.();
    } else {
      store.reset();
    }
    onClose();
  }

  function handleProceedToConfirm() {
    store.requestDeletion(publicKey);
    setStep("CONFIRM");
  }

  async function handleSubmit() {
    setStep("PROCESSING");
    await store.submitDeletion();
    // store state change → useEffect above updates step
  }

  async function handleRetry() {
    await store.retryDeletion();
  }

  // ── Computed ───────────────────────────────────────────────────────────────

  const isConfirmValid =
    confirmInput.trim().toLowerCase() === DELETION_CONFIRM_PHRASE;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={step !== "PROCESSING" ? handleClose : undefined}
            aria-hidden="true"
          />

          {/* Dialog panel */}
          <motion.div
            ref={focusTrapRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="del-dialog-title"
            aria-describedby="del-dialog-desc"
            className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/30 bg-background shadow-2xl"
            initial={{ scale: 0.93, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
          >
            {/* Live region for screen reader announcements */}
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="sr-only"
            >
              {step === "PROCESSING" && "Deletion request is being processed."}
              {step === "SUCCESS" && "Account deletion has been confirmed."}
              {step === "ERROR" && `Error: ${store.lastErrorMessage ?? "Deletion failed."}`}
            </div>

            {/* Close button — hidden during processing */}
            {step !== "PROCESSING" && (
              <button
                onClick={handleClose}
                aria-label="Close account deletion dialog"
                className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <X size={18} />
              </button>
            )}

            {/* ── WARNING step ──────────────────────────────────────────────── */}
            {step === "WARNING" && (
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30">
                    <ShieldAlert size={22} className="text-red-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h2
                      id="del-dialog-title"
                      className="text-base font-semibold text-foreground"
                    >
                      Delete Account
                    </h2>
                    <p
                      id="del-dialog-desc"
                      className="mt-1 text-sm text-gray-400"
                    >
                      This action is irreversible. Please read the following carefully.
                    </p>
                  </div>
                </div>

                {/* What will be deleted */}
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                    What will be removed
                  </p>
                  <ul className="space-y-1.5">
                    {["Your profile and wallet association", "Notification preferences", "Session data and UI settings"].map(
                      (item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-300">
                          <Trash2 size={12} className="shrink-0 text-red-400" aria-hidden="true" />
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </div>

                {/* What is retained */}
                <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    What is retained (anonymised, {DEFAULT_RETENTION_POLICY.retentionDays / 365} yrs)
                  </p>
                  <ul className="space-y-1.5">
                    {RETENTION_CATEGORIES.map((cat) => (
                      <li key={cat} className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckCircle2 size={12} className="shrink-0 text-blue-400" aria-hidden="true" />
                        {formatCategory(cat)}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-500 mt-1">
                    Required by financial regulations. All identifiers are replaced with
                    anonymous tokens.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" size="sm" onClick={handleClose} className="text-gray-400 hover:text-white">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    data-autofocus="true"
                    onClick={handleProceedToConfirm}
                    className="gap-1.5"
                    aria-label="Proceed to deletion confirmation step"
                  >
                    <AlertTriangle size={13} aria-hidden="true" />
                    I understand, continue
                  </Button>
                </div>
              </div>
            )}

            {/* ── CONFIRM step ──────────────────────────────────────────────── */}
            {step === "CONFIRM" && (
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30">
                    <Trash2 size={20} className="text-red-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h2
                      id="del-dialog-title"
                      className="text-base font-semibold text-foreground"
                    >
                      Confirm Deletion
                    </h2>
                    <p
                      id="del-dialog-desc"
                      className="mt-1 text-sm text-gray-400"
                    >
                      Type{" "}
                      <span className="font-mono text-red-400 select-all">
                        {DELETION_CONFIRM_PHRASE}
                      </span>{" "}
                      to confirm.
                    </p>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="del-confirm-input"
                    className="sr-only"
                  >
                    Type {DELETION_CONFIRM_PHRASE} to confirm account deletion
                  </label>
                  <input
                    id="del-confirm-input"
                    ref={inputRef}
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    onPaste={(e) => e.preventDefault()}
                    placeholder={DELETION_CONFIRM_PHRASE}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    aria-describedby="del-confirm-hint"
                    className={[
                      "w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground",
                      "placeholder:text-gray-600 focus:outline-none focus:ring-2",
                      isConfirmValid
                        ? "border-red-500/60 focus:ring-red-500/40"
                        : "border-border focus:ring-blue-500/40",
                    ].join(" ")}
                  />
                  <p id="del-confirm-hint" className="mt-1 text-xs text-gray-500">
                    Pasting is disabled — you must type the phrase manually.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setStep("WARNING"); setConfirmInput(""); store.reset(); }}
                    className="text-gray-400 hover:text-white"
                  >
                    Back
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!isConfirmValid}
                    onClick={handleSubmit}
                    aria-disabled={!isConfirmValid}
                    className="gap-1.5"
                    aria-label="Permanently delete my account"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    Delete my account
                  </Button>
                </div>
              </div>
            )}

            {/* ── PROCESSING step ───────────────────────────────────────────── */}
            {step === "PROCESSING" && (
              <div className="p-8 flex flex-col items-center gap-4 text-center">
                <Loader2
                  size={36}
                  className="animate-spin text-red-400"
                  aria-hidden="true"
                />
                <div>
                  <h2
                    id="del-dialog-title"
                    className="text-base font-semibold text-foreground"
                  >
                    Processing
                  </h2>
                  <p id="del-dialog-desc" className="mt-1 text-sm text-gray-400">
                    Submitting your deletion request…
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  Attempt {store.attemptCount} of 3 — do not close this window.
                </p>
              </div>
            )}

            {/* ── SUCCESS step ──────────────────────────────────────────────── */}
            {step === "SUCCESS" && (
              <div className="p-8 flex flex-col items-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15 border border-green-500/30">
                  <CheckCircle2 size={28} className="text-green-400" aria-hidden="true" />
                </div>
                <div>
                  <h2
                    id="del-dialog-title"
                    className="text-base font-semibold text-foreground"
                  >
                    Deletion Requested
                  </h2>
                  <p id="del-dialog-desc" className="mt-1 text-sm text-gray-400">
                    Your account has been scheduled for deletion. Financial records have
                    been anonymised per our retention policy.
                  </p>
                </div>
                {store.completedAt && (
                  <p className="text-xs text-gray-500">
                    Confirmed at{" "}
                    {new Date(store.completedAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
                <Button
                  data-autofocus="true"
                  onClick={handleClose}
                  className="mt-2 w-full gap-2"
                  aria-label="Close dialog and sign out"
                >
                  Close
                </Button>
              </div>
            )}

            {/* ── ERROR step ────────────────────────────────────────────────── */}
            {step === "ERROR" && (
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30">
                    <AlertTriangle size={20} className="text-red-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h2
                      id="del-dialog-title"
                      className="text-base font-semibold text-foreground"
                    >
                      Deletion Failed
                    </h2>
                    <p
                      id="del-dialog-desc"
                      className="mt-1 text-sm text-gray-400"
                    >
                      {store.lastErrorMessage ?? "An unexpected error occurred."}
                    </p>
                  </div>
                </div>

                {/* Error code detail */}
                {store.lastErrorCode && (
                  <div className="rounded-xl border border-border bg-surface p-3">
                    <p className="text-xs text-gray-500">
                      Error code:{" "}
                      <span className="font-mono text-gray-300">
                        {store.lastErrorCode}
                      </span>
                    </p>
                    {store.lastErrorCode === "PENDING_TRANSACTIONS" && (
                      <p className="mt-1 text-xs text-yellow-400">
                        Close all open positions before deleting your account.
                      </p>
                    )}
                    {store.lastErrorCode === "RATE_LIMITED" && (
                      <p className="mt-1 text-xs text-yellow-400">
                        Too many requests. Please wait a few minutes before retrying.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  {store.lastErrorCode !== "PENDING_TRANSACTIONS" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      data-autofocus="true"
                      onClick={handleRetry}
                      disabled={store.attemptCount >= 3}
                      className="gap-1.5"
                      aria-label="Retry account deletion"
                    >
                      <RefreshCw size={13} aria-hidden="true" />
                      {store.attemptCount >= 3 ? "Max retries reached" : "Retry"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCategory(cat: string): string {
  return cat
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
