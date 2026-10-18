"use client";

import { BarChart2 } from "lucide-react";
import { useAnalyticsConsentStore } from "@/store/useAnalyticsConsentStore";

export function AnalyticsConsentToggle() {
  const { analyticsEnabled, setAnalyticsEnabled } = useAnalyticsConsentStore();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <BarChart2
            size={13}
            className="text-foreground-muted"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-foreground">
            Analytics Tracking
          </span>
        </div>
        <p className="text-xs text-foreground-muted">
          Allow non-essential usage analytics to be collected. Disabling this
          stops all analytics events and web vitals reporting immediately.
        </p>
      </div>
      <button
        role="switch"
        aria-checked={analyticsEnabled}
        aria-label="Toggle analytics tracking"
        onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          analyticsEnabled ? "bg-blue-500" : "bg-foreground-muted/30"
        }`}
      >
        <span
          className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            analyticsEnabled ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
