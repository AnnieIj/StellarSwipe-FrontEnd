"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

const PROMPT_DELAY_MS = 3000;

/**
 * Step-by-step instructions for iOS Safari users who need to use
 * the browser share sheet to add the app to their home screen.
 */
const IOS_STEPS = [
  {
    icon: Share,
    label: "Tap the Share icon",
    detail: "Look for the share button at the bottom of Safari.",
  },
  {
    icon: Download,
    label: 'Select "Add to Home Screen"',
    detail: "Scroll down in the share sheet to find this option.",
  },
];

/**
 * A friendly, non-intrusive install prompt for mobile users.
 *
 * Behaviour:
 * - Renders nothing on desktop or when the app is already installed.
 * - On Android / Chromium: shows a card with an "Install app" CTA that
 *   triggers the native `beforeinstallprompt` dialog.
 * - On iOS Safari: shows a card with step-by-step share-sheet instructions.
 * - Respects a 7-day dismissal cooldown via `localStorage`.
 * - Appears with a short delay so it never competes with first-paint.
 * - Fully keyboard-accessible and announces itself as a dialog to screen
 *   readers.
 */
export function PWAInstallPrompt() {
  const { shouldShow, eligibility, triggerPrompt, dismiss } =
    useInstallPrompt();
  const [visible, setVisible] = useState(false);

  // Delay appearance so the prompt doesn't fight with page load.
  useEffect(() => {
    if (!shouldShow) return;
    const timer = setTimeout(() => setVisible(true), PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [shouldShow]);

  if (!visible) return null;
  if (eligibility.guidance === "none") return null;

  const isIos = eligibility.guidance === "ios_manual";

  const handleInstall = async () => {
    await triggerPrompt();
    // triggerPrompt dispatches "accepted" or "dismissed" internally;
    // the hook will set shouldShow → false, hiding the prompt.
    setVisible(false);
  };

  const handleDismiss = () => {
    dismiss();
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-description"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] inset-x-4 z-40 mx-auto max-w-sm animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-border bg-surface-high/95 p-5 shadow-elevation-3 backdrop-blur sm:inset-x-auto sm:right-4 sm:left-auto sm:w-[min(92vw,360px)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-sky/15 text-accent-sky">
            <Download size={18} aria-hidden="true" />
          </div>
          <h2
            id="pwa-install-title"
            className="text-sm font-semibold text-foreground leading-snug"
          >
            Add StellarSwipe to your home screen
          </h2>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded-md p-1 text-foreground-muted transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {/* Body */}
      <p
        id="pwa-install-description"
        className="mt-2 text-xs leading-5 text-foreground-muted"
      >
        {isIos
          ? "Get the full app experience — faster load, offline access, and an icon right on your home screen."
          : "Install the app for a faster, full-screen experience — no browser chrome, offline support included."}
      </p>

      {/* iOS manual steps */}
      {isIos && (
        <ol className="mt-3 space-y-2.5" aria-label="Installation steps">
          {IOS_STEPS.map(({ icon: Icon, label, detail }, i) => (
            <li key={label} className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-sky/15 text-[10px] font-bold text-accent-sky"
              >
                {i + 1}
              </span>
              <div>
                <p className="text-xs font-medium text-foreground flex items-center gap-1">
                  <Icon size={12} aria-hidden="true" className="shrink-0" />
                  {label}
                </p>
                <p className="text-[11px] leading-4 text-foreground-muted">
                  {detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        {isIos ? (
          // For iOS there's nothing the app can trigger programmatically; the
          // dismiss button acts as the primary action after reading the steps.
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={handleDismiss}
          >
            Got it
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleInstall}
            >
              <Download size={13} aria-hidden="true" />
              Install app
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Not now
            </Button>
          </>
        )}
      </div>

      <p className="mt-3 text-[10px] text-foreground-muted">
        You can also install later from your browser's menu — this prompt won't
        appear again for a week.
      </p>
    </div>
  );
}
