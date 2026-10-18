"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useToastStore, type ToastMessage } from "@/store/useToastStore";
import { cn } from "@/lib/utils";

const toneStyles: Record<ToastMessage["tone"], string> = {
  success:
    "border-accent-success/30 bg-accent-success/10 text-foreground shadow-sm",
  error:
    "border-accent-danger/30  bg-accent-danger/10  text-foreground shadow-sm",
  info: "border-accent-sky/30     bg-accent-sky/10     text-foreground shadow-sm",
};

const toneIcons: Record<ToastMessage["tone"], typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

/**
 * ToastProvider — renders the app's global toast notification stack.
 *
 * Reads from `useToastStore` and renders animated toast cards in a fixed
 * overlay. Toasts appear at the bottom of the screen on mobile and at the
 * top-right on larger viewports. Each toast is dismissed via its close button
 * or automatically after its configured `duration`.
 *
 * Three visual tones are supported:
 * - `success` — green, confirms a completed action (e.g. trade submitted)
 * - `error` — red, signals a failure (e.g. network error)
 * - `info` — blue, communicates neutral information (e.g. demo mode active)
 *
 * Mount once in the app root (e.g. `app/layout.tsx`); do **not** nest
 * multiple instances.
 *
 * Toast messages are queued via `useToastStore`:
 * ```ts
 * import { useToastStore } from "@/store/useToastStore";
 *
 * const { push } = useToastStore();
 *
 * // Success toast with optional description and link
 * push({
 *   tone: "success",
 *   title: "Trade confirmed",
 *   description: "Your XLM order was submitted.",
 *   link: { href: "https://stellar.expert/...", label: "View on Explorer" },
 * });
 *
 * // Error toast
 * push({ tone: "error", title: "Network error", description: "Check your connection." });
 * ```
 *
 * @see {@link https://storybook.stellarswipe.dev/?path=/docs/ui-toastprovider--docs Storybook — ToastProvider}
 */
export function ToastProvider() {
  const prefersReducedMotion = useReducedMotion();
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  const pause = useToastStore((state) => state.pause);
  const resume = useToastStore((state) => state.resume);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-toast mx-auto flex max-w-[min(92vw,420px)] flex-col items-center gap-3 px-4 sm:bottom-auto sm:top-4 sm:right-4 sm:left-auto sm:mx-0 sm:items-end"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {toasts.map((toast) => {
          const Icon = toneIcons[toast.tone];
          const ariaLive = toast.tone === "error" ? "assertive" : "polite";

          return (
            <motion.div
              key={toast.id}
              layout
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.98 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.25, ease: "easeOut" }}
              role={toast.tone === "error" ? "alert" : "status"}
              aria-live={ariaLive}
              onMouseEnter={() => pause(toast.id)}
              onMouseLeave={() => resume(toast.id)}
              onFocus={() => pause(toast.id)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  resume(toast.id);
                }
              }}
              aria-atomic="true"
              className={cn(
                "pointer-events-auto w-full overflow-hidden break-words rounded-2xl border p-4 shadow-lg",
                toneStyles[toast.tone]
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-current shadow-sm">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-1 text-sm leading-5 text-current/90">
                      {toast.description}
                    </p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-medium">
                    {toast.link ? (
                      <a
                        href={toast.link.href}
                        className="underline underline-offset-2 hover:opacity-75 transition-opacity"
                      >
                        {toast.link.label} →
                      </a>
                    ) : null}
                    {toast.action ? (
                      <button
                        type="button"
                        onClick={() => {
                          toast.action?.onClick();
                          dismiss(toast.id);
                        }}
                        className="rounded-full border border-current/20 px-2.5 py-1 text-current hover:bg-current/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/50"
                      >
                        {toast.action.label}
                      </button>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Dismiss notification"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-current transition hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/50"
                  onClick={() => dismiss(toast.id)}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
