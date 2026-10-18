"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ToastProvider } from "@/components/ui/toast";
import { initI18n, getCurrentLocale, isRTL } from "@/lib/i18n";
import { PerformanceMonitoringProvider } from "@/components/performance/PerformanceMonitoringProvider";
import { useCrossTabSync } from "@/hooks/useCrossTabSync";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { IdleSessionGuard } from "@/components/IdleSessionGuard";
import { NetworkMismatchBanner } from "@/components/NetworkMismatchBanner";
import { startSettingsHistoryTracking } from "@/lib/settingsRegistry";

// React Query Devtools are only useful while developing locally. Gating the
// dynamic import on NODE_ENV means the `development` branch is statically
// dead-code-eliminated by the bundler in production builds, so the devtools
// chunk never ships to users. No manual toggling required — it follows the env.
const ReactQueryDevtools: React.ComponentType<{ initialIsOpen?: boolean }> =
  process.env.NODE_ENV === "development"
    ? dynamic(
        () =>
          import("@tanstack/react-query-devtools").then((mod) => ({
            default: mod.ReactQueryDevtools,
          })),
        { ssr: false }
      )
    : () => null;

export function Providers({ children }: { children: React.ReactNode }) {
  useCrossTabSync();
  useServiceWorker();

  // Record preference changes from any surface for the settings history (#900).
  useEffect(() => startSettingsHistoryTracking(), []);

  useEffect(() => {
    initI18n().then(() => {
      // Sync dir/lang on the <html> element after i18n is ready
      const locale = getCurrentLocale();
      document.documentElement.lang = locale;
      document.documentElement.dir = isRTL(locale) ? "rtl" : "ltr";
    });

    // Keep dir/lang in sync whenever the user switches locale at runtime
    function onLocaleChanged(e: Event) {
      const { locale } = (e as CustomEvent<{ locale: string }>).detail;
      document.documentElement.lang = locale;
      document.documentElement.dir = isRTL(
        locale as Parameters<typeof isRTL>[0]
      )
        ? "rtl"
        : "ltr";
    }
    window.addEventListener("locale-changed", onLocaleChanged);
    return () => window.removeEventListener("locale-changed", onLocaleChanged);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PerformanceMonitoringProvider>
        <NetworkMismatchBanner />
        <IdleSessionGuard />
        {children}
      </PerformanceMonitoringProvider>
      <ToastProvider
        // Issue #774: bound the toast viewport so bursts of messages stack
        // predictably instead of overlapping. The region is anchored below the
        // fixed navigation and above primary form actions, and is scrollable
        // when the queue exceeds the visible area.
        position="bottom-right"
        maxVisible={3}
        gap={8}
        offset={{ top: 72, bottom: 96, right: 16 }}
        // Coalesce duplicate/equivalent messages so repeated feedback does not
        // flood the queue.
        dedupe
        // Allow keyboard users to dismiss individual toasts and reach actions.
        dismissible
        keyboardDismiss
        aria-live="polite"
      />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
