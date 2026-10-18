"use client";

/**
 * useQRPairing
 *
 * Manages a QR-code based wallet pairing session:
 *  - Generates a unique pairing token (UUID + origin) encoded as a deep-link URI
 *  - Tracks expiry with a countdown
 *  - Polls for pairing completion (mobile wallet signals back via the /api/qr-pair endpoint)
 *  - Exposes helpers to regenerate the code and cancel the session
 *  - Ignores late poll responses: a response is only applied while its session
 *    is still the live one and has not expired (#801), so an expired code can
 *    never be "restored" and a replaced session can never mark the wallet
 *    connected
 *
 * The pairing URI is intentionally kept minimal so it encodes into a short
 * QR code (version 3-5). Real WalletConnect sessions would use a relay server;
 * here we simulate the handshake so the full UX flow is in place.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useWalletStore } from "@/store/useWalletStore";
import { walletToast } from "@/lib/walletToast";
import analyticsService from "@/services/analytics";

/** How long (ms) each pairing code is valid before it expires. */
const QR_TTL_MS = 120_000; // 2 minutes

/** How often (ms) to poll for a completed pairing. */
const POLL_MS = 2_000;

export type QRPairingStatus =
  | "idle"
  | "pending" // code displayed, waiting for scan
  | "scanning" // mobile wallet opened the URI
  | "paired" // handshake complete, publicKey available
  | "expired" // TTL elapsed without pairing
  | "rejected" // mobile wallet explicitly rejected
  | "error"; // unexpected error

/** "1:05" style countdown label. */
export function formatCountdown(secondsLeft: number): string {
  const s = Math.max(0, Math.floor(secondsLeft));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Spoken form of the countdown, e.g. "1 minute 5 seconds". */
export function describeCountdown(secondsLeft: number): string {
  const s = Math.max(0, Math.floor(secondsLeft));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  const parts: string[] = [];
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  if (seconds > 0 || minutes === 0) {
    parts.push(`${seconds} ${seconds === 1 ? "second" : "seconds"}`);
  }
  return parts.join(" ");
}

export interface QRPairingState {
  status: QRPairingStatus;
  uri: string | null; // the string encoded in the QR
  sessionId: string | null; // unique id for this pairing attempt
  secondsLeft: number; // countdown to expiry
  publicKey: string | null; // set on successful pairing
  errorMessage: string | null;
  expiresAt: number | null; // epoch ms when the current code expires
}

function generateSessionId(): string {
  // crypto.randomUUID is available in all modern browsers and Node ≥ 14.17
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function buildPairingURI(sessionId: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://stellarswipe.app";
  // stellarswipe://pair?session=<id>&origin=<origin>
  // Intentionally short to keep QR code small
  return `stellarswipe://pair?s=${sessionId}&o=${encodeURIComponent(origin)}`;
}

/**
 * Simulate polling the pairing API.
 * In production this would be a real fetch to /api/qr-pair?session=<id>.
 * Returns null (still pending), a publicKey string (success),
 * "rejected" or "error" strings.
 */
async function pollPairingStatus(
  sessionId: string
): Promise<"pending" | "scanning" | "rejected" | "error" | string> {
  try {
    const res = await fetch(
      `/api/qr-pair?session=${encodeURIComponent(sessionId)}`,
      { cache: "no-store" }
    );
    if (res.status === 404) return "pending"; // not yet scanned
    if (!res.ok) return "error";
    const json = (await res.json()) as {
      status: "pending" | "scanning" | "paired" | "rejected";
      publicKey?: string;
    };
    if (json.status === "paired" && json.publicKey) return json.publicKey;
    if (json.status === "rejected") return "rejected";
    if (json.status === "scanning") return "scanning";
    return "pending";
  } catch {
    // API not implemented yet — keep showing the QR (demo mode)
    return "pending";
  }
}

export function useQRPairing() {
  const { addWallet, setPublicKey, setConnected } = useWalletStore();

  const [state, setState] = useState<QRPairingState>({
    status: "idle",
    uri: null,
    sessionId: null,
    secondsLeft: Math.ceil(QR_TTL_MS / 1000),
    publicKey: null,
    errorMessage: null,
    expiresAt: null,
  });

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /**
   * The session whose responses may still be applied. Cleared on expiry,
   * cancel, and terminal results; replaced on regenerate. Any poll response
   * for a session that is not live is discarded.
   */
  const sessionIdRef = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startSession = useCallback(() => {
    clearTimers();

    const sessionId = generateSessionId();
    const uri = buildPairingURI(sessionId);
    const startTime = Date.now();
    const expiresAt = startTime + QR_TTL_MS;
    sessionIdRef.current = sessionId;

    setState({
      status: "pending",
      uri,
      sessionId,
      secondsLeft: Math.ceil(QR_TTL_MS / 1000),
      publicKey: null,
      errorMessage: null,
      expiresAt,
    });

    analyticsService.track("qr_pairing_started", { sessionId });

    /** True while this session may still change state. */
    const isLive = () =>
      sessionIdRef.current === sessionId && Date.now() < expiresAt;

    /** Apply an update only if state still belongs to this session. */
    const updateOwn = (
      updater: (prev: QRPairingState) => QRPairingState
    ) =>
      setState((prev) => (prev.sessionId === sessionId ? updater(prev) : prev));

    const expire = () => {
      if (sessionIdRef.current !== sessionId) return;
      sessionIdRef.current = null;
      clearTimers();
      updateOwn((prev) =>
        prev.status === "pending" || prev.status === "scanning"
          ? {
              ...prev,
              secondsLeft: 0,
              status: "expired",
              errorMessage: "Pairing code expired. Generate a new one.",
            }
          : prev
      );
      analyticsService.track("qr_pairing_expired", { sessionId });
    };

    // Countdown timer
    countdownRef.current = setInterval(() => {
      if (sessionIdRef.current !== sessionId) return; // stale session
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((QR_TTL_MS - elapsed) / 1000));
      updateOwn((prev) => ({ ...prev, secondsLeft: remaining }));
      if (remaining === 0) expire();
    }, 1_000);

    // Poll for pairing completion. Only one request is in flight per session
    // so a slow response can't race a newer one from the same session.
    let inFlight = false;
    pollRef.current = setInterval(async () => {
      if (!isLive() || inFlight) return;
      inFlight = true;
      const result = await pollPairingStatus(sessionId).finally(() => {
        inFlight = false;
      });

      // Late response: the session was replaced, cancelled, or expired while
      // the request was in flight. Never let it change the UI or the wallet.
      if (!isLive()) {
        if (sessionIdRef.current === sessionId) expire();
        return;
      }

      if (result === "pending") return;
      if (result === "scanning") {
        updateOwn((prev) =>
          prev.status === "pending" ? { ...prev, status: "scanning" } : prev
        );
        return;
      }

      // Terminal result — this session can no longer change state.
      sessionIdRef.current = null;
      clearTimers();
      if (result === "rejected") {
        updateOwn((prev) => ({
          ...prev,
          status: "rejected",
          errorMessage: "Pairing was rejected by the mobile wallet.",
        }));
        analyticsService.track("qr_pairing_rejected", { sessionId });
      } else if (result === "error") {
        updateOwn((prev) => ({
          ...prev,
          status: "error",
          errorMessage: "An error occurred during pairing. Please try again.",
        }));
        analyticsService.track("qr_pairing_error", { sessionId });
      } else {
        // result is a publicKey
        const publicKey = result;
        addWallet(publicKey);
        setPublicKey(publicKey);
        setConnected(true);
        walletToast.connected(publicKey);
        updateOwn((prev) => ({ ...prev, status: "paired", publicKey }));
        analyticsService.track("qr_pairing_success", {
          sessionId,
          wallet_type: "qr",
        });
        window.dispatchEvent(
          new CustomEvent("wallet-connected", { detail: { publicKey } })
        );
      }
    }, POLL_MS);
  }, [clearTimers, addWallet, setPublicKey, setConnected]);

  const cancel = useCallback(() => {
    clearTimers();
    sessionIdRef.current = null;
    setState({
      status: "idle",
      uri: null,
      sessionId: null,
      secondsLeft: Math.ceil(QR_TTL_MS / 1000),
      publicKey: null,
      errorMessage: null,
      expiresAt: null,
    });
  }, [clearTimers]);

  // Cleanup on unmount — also invalidate the session so an in-flight poll
  // resolving after unmount is ignored.
  useEffect(
    () => () => {
      sessionIdRef.current = null;
      clearTimers();
    },
    [clearTimers]
  );

  return {
    ...state,
    ttlMs: QR_TTL_MS,
    startSession,
    regenerate: startSession,
    /** Request a fresh code (e.g. after expiry) without leaving the QR flow. */
    requestNewCode: startSession,
    cancel,
  };
}
