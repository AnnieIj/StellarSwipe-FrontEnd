"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Wallet,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ChevronLeft,
} from "lucide-react";
import { isConnected } from "@stellar/freighter-api";
import { useWallet } from "@/hooks/useWallet";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { isTopOverlay } from "@/hooks/overlayManager";
import { WalletConnectErrorModal } from "@/components/WalletConnectErrorModal";
import { QRPairingPanel } from "@/components/QRPairingPanel";
import { WalletOriginConfirmation } from "@/components/WalletOriginConfirmation";

interface WalletSelectionModalProps {
  open: boolean;
  onClose: () => void;
}

interface WalletOption {
  id: string;
  name: string;
  description: string;
  installUrl: string;
}

const WALLET_OPTIONS: WalletOption[] = [
  {
    id: "freighter",
    name: "Freighter",
    description:
      "The official browser extension wallet for the Stellar network, built by the Stellar Development Foundation.",
    installUrl: "https://www.freighter.app",
  },
];

type DetectionState = "idle" | "detecting" | "detected" | "not-found";
type ModalView = "select" | "qr" | "confirm";

export function WalletSelectionModal({
  open,
  onClose,
}: WalletSelectionModalProps) {
  const { connect, isConnecting, connectError, clearConnectError } =
    useWallet();
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [view, setView] = useState<ModalView>("select");
  const [detection, setDetection] = useState<Record<string, DetectionState>>({
    freighter: "idle",
  });
  // The wallet option queued for the origin-confirmation step before connect().
  const [pendingWallet, setPendingWallet] = useState<WalletOption | null>(null);

  const focusTrapRef = useFocusTrap({
    isActive: open,
    initialFocus: 'button[data-wallet-id="freighter"]',
  });

  // Detect installed wallets when modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    setDetection({ freighter: "detecting" });

    isConnected()
      .then((res) => {
        if (cancelled) return;
        setDetection({
          freighter: res?.isConnected ? "detected" : "not-found",
        });
      })
      .catch(() => {
        if (!cancelled) setDetection({ freighter: "not-found" });
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  // ESC to close — only when this modal is the topmost overlay so nested
  // overlays don't close their parents when Esc is pressed.
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

  // Reset selection when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedWallet(null);
      setView("select");
      setPendingWallet(null);
    }
  }, [open]);

  async function handleSelectWallet(wallet: WalletOption) {
    if (isConnecting) return;
    const state = detection[wallet.id];

    if (state === "not-found") {
      window.open(wallet.installUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // Show origin confirmation before connecting (#799).
    setPendingWallet(wallet);
    setView("confirm");
  }

  async function handleConfirmConnect() {
    if (!pendingWallet || isConnecting) return;
    setView("select");
    setSelectedWallet(pendingWallet.id);
    setPendingWallet(null);
    await connect();
    // connect() sets connectError on failure; success is handled by the effect below.
  }

  function handleCancelConfirm() {
    setPendingWallet(null);
    setView("select");
  }

  function handleErrorModalClose() {
    clearConnectError();
    setSelectedWallet(null);
  }

  function handleRetryFromError() {
    clearConnectError();
    setSelectedWallet(null);
    // Re-open the selection modal (it is still mounted; just clear error state)
  }

  // Close selection modal on successful connection
  useEffect(() => {
    if (!isConnecting && !connectError && selectedWallet) {
      // connect() finished without error — wallet connected successfully
      onClose();
      setSelectedWallet(null);
    }
  }, [isConnecting, connectError, selectedWallet, onClose]);

  return (
    <>
      <AnimatePresence>
        {open && (
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
              role="dialog"
              aria-modal="true"
              aria-labelledby="wallet-modal-title"
              aria-describedby="wallet-modal-description"
              className="relative z-overlay w-full max-w-sm rounded-2xl border border-border bg-surface/95 p-6 shadow-2xl"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {(view === "qr" || view === "confirm") && (
                    <button
                      onClick={() => {
                        if (view === "confirm") handleCancelConfirm();
                        else setView("select");
                      }}
                      aria-label="Back to wallet selection"
                      className="rounded-full p-1 text-foreground-muted hover:text-foreground hover:bg-surface-high/40 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <ChevronLeft size={18} className="rtl-flip" />
                    </button>
                  )}
                  <h2
                    id="wallet-modal-title"
                    className="text-lg font-semibold text-foreground"
                  >
                    {view === "qr"
                      ? "Scan to Connect"
                      : view === "confirm"
                      ? "Confirm Connection"
                      : "Connect Wallet"}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close wallet selection modal"
                  className="rounded-full p-1 text-foreground-muted hover:text-foreground hover:bg-surface-high/40 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <X size={18} />
                </button>
              </div>
              <p
                id="wallet-modal-description"
                className="text-sm text-foreground-muted mb-5"
              >
                {view === "qr"
                  ? "Use a mobile wallet app to scan and connect"
                  : view === "confirm"
                  ? "Review the connection request before continuing"
                  : "Choose a wallet to connect to StellarSwipe"}
              </p>

              {/* Confirmation View (#799) */}
              {view === "confirm" && pendingWallet ? (
                <WalletOriginConfirmation
                  open={true}
                  origin={
                    typeof window !== "undefined" ? window.location.origin : null
                  }
                  walletName={pendingWallet.name}
                  onConfirm={handleConfirmConnect}
                  onCancel={handleCancelConfirm}
                  className="border-0 p-0 shadow-none bg-transparent"
                />
              ) : view === "qr" ? (
                <QRPairingPanel
                  onSuccess={onClose}
                  onCancel={() => setView("select")}
                />
              ) : (
                <>
                  {/* Wallet options */}
                  <div className="space-y-3">
                    {WALLET_OPTIONS.map((wallet) => {
                      const state = detection[wallet.id] ?? "idle";
                      const isSelected = selectedWallet === wallet.id;
                      const loading = isSelected && isConnecting;
                      const notFound = state === "not-found";

                      return (
                        <button
                          key={wallet.id}
                          data-wallet-id={wallet.id}
                          onClick={() => handleSelectWallet(wallet)}
                          disabled={isConnecting || state === "detecting"}
                          aria-describedby={`wallet-${wallet.id}-description`}
                          className="w-full flex items-start gap-4 rounded-xl border border-border bg-surface p-4 text-left hover:border-blue-500/50 hover:bg-surface-high/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {/* Icon */}
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/30">
                            {loading || state === "detecting" ? (
                              <Loader2
                                size={20}
                                className="text-blue-400 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <Wallet
                                size={20}
                                className="text-blue-400"
                                aria-hidden="true"
                              />
                            )}
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">
                                {wallet.name}
                              </p>
                              <ProviderStatusBadge state={state} />
                            </div>
                            <p
                              id={`wallet-${wallet.id}-description`}
                              className="mt-0.5 text-xs text-foreground-muted leading-relaxed"
                            >
                              {wallet.description}
                            </p>
                            {loading && (
                              <p
                                className="mt-1.5 text-xs text-accent-primary"
                                aria-live="polite"
                              >
                                Connecting…
                              </p>
                            )}
                            {notFound && (
                              <p className="mt-1.5 text-xs text-accent-warning flex items-center gap-1">
                                <ExternalLink size={11} />
                                Click to install
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}

                    {/* QR Pairing option */}
                    <button
                      onClick={() => setView("qr")}
                      disabled={isConnecting}
                      aria-label="Connect via QR code pairing"
                      className="w-full flex items-start gap-4 rounded-xl border border-border bg-surface p-4 text-left hover:border-blue-500/50 hover:bg-surface-high/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-600/20 border border-purple-500/30">
                        <QrCode
                          size={20}
                          className="text-purple-400"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          Mobile Wallet (QR)
                        </p>
                        <p className="mt-0.5 text-xs text-foreground-muted leading-relaxed">
                          Scan a QR code with your mobile wallet app — no
                          browser extension needed.
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Footer */}
                  <p className="mt-5 text-center text-xs text-gray-500">
                    Don&apos;t have a wallet?{" "}
                    <a
                      href="https://www.freighter.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-primary hover:text-accent-primary/80 inline-flex items-center gap-1 underline-offset-2 hover:underline"
                    >
                      Install Freighter <ExternalLink size={11} />
                    </a>
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wallet connect error modal — shown when connection fails */}
      <WalletConnectErrorModal
        open={!!connectError}
        reason={connectError}
        onClose={handleErrorModalClose}
        onRetry={handleRetryFromError}
      />
    </>
  );
}

function ProviderStatusBadge({ state }: { state: DetectionState }) {
  if (state === "detecting" || state === "idle") return null;

  if (state === "detected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-400">
        <CheckCircle2 size={10} />
        Detected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
      <AlertCircle size={10} />
      Not installed
    </span>
  );
}
