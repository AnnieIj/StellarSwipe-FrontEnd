"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  type InstallEligibility,
  type InstallEvent,
  type InstallPlatform,
  type InstallState,
  deriveInstallEligibility,
  installReducer,
  isInstallPromptSuppressed,
  markInstallDismissed,
  readInstallDismissal,
} from "@/lib/pwaInstall";

/** The deferred `BeforeInstallPromptEvent` is not in the standard TS lib. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface UseInstallPromptReturn {
  /** Current state of the install lifecycle. */
  state: InstallState;
  /** Resolved eligibility from the current environment. */
  eligibility: InstallEligibility;
  /** Whether the prompt UI should be rendered. */
  shouldShow: boolean;
  /** Trigger the native browser install dialog (no-op on iOS). */
  triggerPrompt(): Promise<void>;
  /** Record a dismissal and start the cooldown timer. */
  dismiss(): void;
}

function detectPlatform(): InstallPlatform {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

/**
 * Manages the full PWA install-prompt lifecycle.
 *
 * - Captures the `beforeinstallprompt` event on Android / Chromium.
 * - Detects iOS Safari to surface manual install guidance instead.
 * - Respects a 7-day dismissal cooldown stored in `localStorage`.
 * - Returns a stable `triggerPrompt` / `dismiss` API that components
 *   can wire directly to buttons.
 */
export function useInstallPrompt(): UseInstallPromptReturn {
  const deferredEvent = useRef<BeforeInstallPromptEvent | null>(null);

  const [state, dispatch] = useReducer(
    (s: InstallState, e: InstallEvent) => installReducer(s, e),
    "unavailable" as InstallState,
  );

  // Derive eligibility once on mount — stable throughout the session.
  const eligibilityRef = useRef<InstallEligibility | null>(null);
  if (eligibilityRef.current === null && typeof window !== "undefined") {
    eligibilityRef.current = deriveInstallEligibility({
      isStandalone:
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
      isSecureContext: window.isSecureContext,
      hasServiceWorker: "serviceWorker" in navigator,
      platform: detectPlatform(),
    });
  }

  const eligibility: InstallEligibility = eligibilityRef.current ?? {
    installable: false,
    state: "unavailable",
    reason: null,
    guidance: "none",
  };

  useEffect(() => {
    // Already installed — nothing to show.
    if (eligibility.state === "installed") {
      dispatch("installed");
      return;
    }
    // Platform or context cannot support install prompts.
    if (eligibility.state === "unsupported") {
      dispatch("unsupported");
      return;
    }
    // iOS Safari — show manual instructions but no browser prompt.
    if (eligibility.guidance === "ios_manual") {
      // Treat availability as "available" so the UI can render.
      dispatch("prompt_available");
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredEvent.current = e as BeforeInstallPromptEvent;
      dispatch("prompt_available");
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => dispatch("installed"));

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [eligibility.guidance, eligibility.state]);

  const triggerPrompt = useCallback(async () => {
    const deferred = deferredEvent.current;
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferredEvent.current = null;
    dispatch(outcome === "accepted" ? "accepted" : "dismissed");
  }, []);

  const dismiss = useCallback(() => {
    markInstallDismissed(localStorage, Date.now());
    dispatch("dismissed");
  }, []);

  // Determine whether the prompt UI should be rendered.
  const shouldShow = (() => {
    if (state !== "available") return false;
    if (eligibility.guidance === "none") return false;
    const storedAt = readInstallDismissal(localStorage);
    if (isInstallPromptSuppressed(storedAt, Date.now())) return false;
    return true;
  })();

  return { state, eligibility, shouldShow, triggerPrompt, dismiss };
}
