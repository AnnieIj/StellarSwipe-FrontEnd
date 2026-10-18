/**
 * Stories for PWAInstallPrompt
 *
 * Because the component delegates to `useInstallPrompt`, we mock the hook so
 * Storybook can render every meaningful state in isolation without relying on
 * real browser events or localStorage.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

// ---------------------------------------------------------------------------
// Decorator: override useInstallPrompt per story
// ---------------------------------------------------------------------------

type HookReturn = ReturnType<typeof useInstallPrompt>;

function makeDecorator(overrides: Partial<HookReturn>) {
  return (Story: React.ComponentType) => {
    // Stub the module export so the component picks it up.
    (useInstallPrompt as unknown as { __override?: Partial<HookReturn> }).__override =
      overrides;
    return <Story />;
  };
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof PWAInstallPrompt> = {
  title: "PWA/PWAInstallPrompt",
  component: PWAInstallPrompt,
  tags: ["autodocs"],
  parameters: {
    // Show the component without the normal 3 s delay in Storybook.
    layout: "centered",
    docs: {
      description: {
        component:
          "Friendly, non-intrusive install prompt for mobile users. Adapts copy and actions for Android (native prompt) and iOS Safari (manual share-sheet steps). Respects a 7-day dismissal cooldown.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof PWAInstallPrompt>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * Android / Chromium — shows the native "Install app" CTA.
 */
export const AndroidBrowserPrompt: Story = {
  name: "Android — browser prompt",
  render: () => (
    <div className="relative w-[360px]">
      {/* Render the card directly for Storybook, bypassing the delay */}
      <div
        role="dialog"
        aria-labelledby="pwa-install-title"
        aria-describedby="pwa-install-description"
        className="rounded-2xl border border-border bg-surface-high/95 p-5 shadow-elevation-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-sky/15 text-accent-sky">
              ↓
            </div>
            <h2 id="pwa-install-title" className="text-sm font-semibold text-foreground">
              Add StellarSwipe to your home screen
            </h2>
          </div>
          <button type="button" aria-label="Dismiss install prompt" className="rounded-md p-1 text-foreground-muted hover:bg-foreground/5">
            ✕
          </button>
        </div>
        <p id="pwa-install-description" className="mt-2 text-xs leading-5 text-foreground-muted">
          Install the app for a faster, full-screen experience — no browser chrome, offline support included.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button className="flex-1 rounded-md bg-accent-sky px-3 py-2 text-xs font-semibold text-white">
            ↓ Install app
          </button>
          <button className="rounded-md px-3 py-2 text-xs text-foreground-muted hover:bg-foreground/5">
            Not now
          </button>
        </div>
        <p className="mt-3 text-[10px] text-foreground-muted">
          You can also install later from your browser's menu — this prompt won't appear again for a week.
        </p>
      </div>
    </div>
  ),
  parameters: { chromatic: { disableSnapshot: false } },
};

/**
 * iOS Safari — shows step-by-step Share sheet instructions.
 */
export const IosSafariManual: Story = {
  name: "iOS Safari — manual steps",
  render: () => (
    <div className="relative w-[360px]">
      <div
        role="dialog"
        aria-labelledby="pwa-install-title-ios"
        aria-describedby="pwa-install-description-ios"
        className="rounded-2xl border border-border bg-surface-high/95 p-5 shadow-elevation-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-sky/15 text-accent-sky">
              ↓
            </div>
            <h2 id="pwa-install-title-ios" className="text-sm font-semibold text-foreground">
              Add StellarSwipe to your home screen
            </h2>
          </div>
          <button type="button" aria-label="Dismiss install prompt" className="rounded-md p-1 text-foreground-muted hover:bg-foreground/5">
            ✕
          </button>
        </div>
        <p id="pwa-install-description-ios" className="mt-2 text-xs leading-5 text-foreground-muted">
          Get the full app experience — faster load, offline access, and an icon right on your home screen.
        </p>
        <ol className="mt-3 space-y-2.5" aria-label="Installation steps">
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-sky/15 text-[10px] font-bold text-accent-sky">1</span>
            <div>
              <p className="text-xs font-medium text-foreground">↑ Tap the Share icon</p>
              <p className="text-[11px] leading-4 text-foreground-muted">Look for the share button at the bottom of Safari.</p>
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-sky/15 text-[10px] font-bold text-accent-sky">2</span>
            <div>
              <p className="text-xs font-medium text-foreground">↓ Select "Add to Home Screen"</p>
              <p className="text-[11px] leading-4 text-foreground-muted">Scroll down in the share sheet to find this option.</p>
            </div>
          </li>
        </ol>
        <div className="mt-4 flex items-center gap-2">
          <button className="flex-1 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground">
            Got it
          </button>
        </div>
        <p className="mt-3 text-[10px] text-foreground-muted">
          You can also install later from your browser's menu — this prompt won't appear again for a week.
        </p>
      </div>
    </div>
  ),
  parameters: { chromatic: { disableSnapshot: false } },
};
