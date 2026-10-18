"use client";

/**
 * NetworkMismatchBanner
 *
 * Detects the connected Freighter wallet's current network and compares it
 * against the network this app expects (configured via
 * NEXT_PUBLIC_STELLAR_NETWORK, defaulting to "TESTNET").
 *
 * Shows a prominent, dismissible-but-persistent-until-resolved warning banner
 * when a mismatch is found. The banner auto-dismisses once the wallet's
 * network is corrected, without requiring a page reload.
 *
 * Trade-affecting actions in TradeModal / SignalCard are disabled via the
 * `useNetworkMismatch` hook that other components can import.
 */

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, X, ExternalLink, RefreshCw } from "lucide-react";
import { getNetworkDetails } from "@stellar/freighter-api";
import { useWalletStore } from "@/store/useWalletStore";
import { cn } from "@/lib/utils";

/** The Stellar network the app expects. Override via env var. */
const APP_NETWORK: string =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "TESTNET";

/** How often (ms) to re-check the wallet's network while connected. */
const POLL_INTERVAL_MS = 5_000;

export type NetworkMismatchState =
  | { status: "idle" }
  | { status: "match" }
  | { status: "mismatch"; walletNetwork: string; appNetwork: string }
  | { status: "error"; message: string };

// ---------------------------------------------------------------------------
// Shared state — module-level so any component can read it via the hook below
// without a Context provider.
// ---------------------------------------------------------------------------
type Listener = (s: NetworkMismatchState) => void;
let _state: NetworkMismatchState = { status: "idle" };
const _listeners = new Set<Listener>();

function setState(next: NetworkMismatchState) {
  _state = next;
  _listeners.forEach((l) => l(next));
}

/**
 * useNetworkMismatch
 *
 * Lightweight hook — returns the current network mismatch state so any
 * component (e.g. TradeModal) can disable trade actions while a mismatch
 * persists.
 */
export function useNetworkMismatch() {
  const [state, setLocal] = useState<NetworkMismatchState>(_state);
  useEffect(() => {
    setLocal(_state);
    _listeners.add(setLocal);
    return () => {
      _listeners.delete(setLocal);
    };
  }, []);
  return {
    isMismatch: state.status === "mismatch",
    walletNetwork: state.status === "mismatch" ? state.walletNetwork : null,
    appNetwork: state.status === "mismatch" ? state.appNetwork : APP_NETWORK,
    state,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function NetworkMismatchBanner() {
  const isConnected = useWalletStore((s) => s.isConnected);
  const [localState, setLocalState] = useState<NetworkMismatchState>(_state);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);

  // Subscribe to shared state changes
  useEffect(() => {
    setLocalState(_state);
    _listeners.add(setLocalState);
    return () => {
      _listeners.delete(setLocalState);
    };
  }, []);

  const checkNetwork = useCallback(async () => {
    if (!isConnected) {
      setState({ status: "idle" });
      return;
    }
    setChecking(true);
    try {
      const details = await getNetworkDetails();
      // Freighter returns e.g. { network: "TESTNET", networkPassphrase: "..." }
      const walletNet: string =
        (details as { network?: string })?.network?.toUpperCase() ?? "UNKNOWN";
      const appNet = APP_NETWORK.toUpperCase();

      if (walletNet === appNet) {
        setState({ status: "match" });
        setDismissed(false); // reset so banner shows again if it mismatches later
      } else {
        setState({
          status: "mismatch",
          walletNetwork: walletNet,
          appNetwork: appNet,
        });
        setDismissed(false);
      }
    } catch {
      // Freighter not available or not responding — don't block the UI
      setState({ status: "idle" });
    } finally {
      setChecking(false);
    }
  }, [isConnected]);

  // Initial check + polling while connected
  useEffect(() => {
    checkNetwork();
    if (!isConnected) return;
    const id = window.setInterval(checkNetwork, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isConnected, checkNetwork]);

  // Also re-check when the user reconnects a wallet
  useEffect(() => {
    function onWalletConnected() {
      checkNetwork();
    }
    window.addEventListener("wallet-connected", onWalletConnected);
    return () =>
      window.removeEventListener("wallet-connected", onWalletConnected);
  }, [checkNetwork]);

  const visible = !dismissed && localState.status === "mismatch" && isConnected;

  if (!visible) return null;

  const { walletNetwork, appNetwork } = localState as Extract<
    NetworkMismatchState,
    { status: "mismatch" }
  >;

  const freighterSettingsUrl = "https://www.freighter.app";

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        "sticky top-14 z-50 w-full",
        "border-b border-amber-500/40 bg-amber-950/90 backdrop-blur-sm",
        "text-amber-100"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 sm:items-center sm:px-6">
        {/* Icon */}
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-400 sm:mt-0"
          aria-hidden="true"
        />

        {/* Message */}
        <div className="flex-1 text-sm">
          <p className="font-semibold text-amber-300">
            Wallet network mismatch
          </p>
          <p className="mt-0.5 text-amber-200/80">
            Your wallet is on{" "}
            <strong className="text-amber-200">{walletNetwork}</strong> but this
            app expects <strong className="text-amber-200">{appNetwork}</strong>
            . Trades are disabled until you switch networks.
          </p>

          {/* How to switch guidance */}
          <details className="mt-2 group">
            <summary className="cursor-pointer list-none text-xs font-medium text-amber-400 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded">
              How to switch networks in Freighter ▾
            </summary>
            <ol className="mt-2 space-y-1 ps-4 text-xs text-amber-200/70 list-decimal">
              <li>Open the Freighter browser extension.</li>
              <li>
                Click the network selector at the top of the extension (shows
                the current network name).
              </li>
              <li>
                Select <strong className="text-amber-200">{appNetwork}</strong>{" "}
                from the dropdown.
              </li>
              <li>
                Return to this page — the banner will disappear automatically.
              </li>
            </ol>
            <a
              href={freighterSettingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline"
            >
              Freighter website
              <ExternalLink size={11} aria-hidden="true" />
            </a>
          </details>
        </div>

        {/* Re-check button */}
        <button
          onClick={checkNetwork}
          disabled={checking}
          aria-label="Re-check wallet network"
          className="shrink-0 rounded-md p-1.5 text-amber-400 hover:text-amber-200 hover:bg-amber-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            aria-hidden="true"
            className={checking ? "animate-spin" : ""}
          />
        </button>

        {/* Dismiss — warning persists until network is fixed or manually dismissed;
            but it will re-appear on next mismatch detection. */}
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss network mismatch warning"
          className="shrink-0 rounded-md p-1.5 text-amber-400 hover:text-amber-200 hover:bg-amber-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
