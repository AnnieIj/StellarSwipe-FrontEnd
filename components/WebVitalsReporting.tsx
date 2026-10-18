"use client";

/**
 * WebVitalsReporting
 *
 * Reports Core Web Vitals (LCP, CLS, INP, FCP, TTFB) to the analytics service
 * in production builds only. Uses Next.js's built-in useReportWebVitals hook.
 *
 * Features:
 * - Production-only reporting (no-op in development)
 * - Configurable sampling rate via NEXT_PUBLIC_WEB_VITALS_SAMPLING_RATE
 * - Routes metrics through existing analytics service
 * - Includes page/route information with each metric
 */

import { useReportWebVitals } from "next/web-vitals";
import analyticsService from "@/services/analytics";
import { useAnalyticsConsentStore } from "@/store/useAnalyticsConsentStore";

// Sampling rate configuration (default: 10% of page loads)
const SAMPLING_RATE =
  typeof process.env.NEXT_PUBLIC_WEB_VITALS_SAMPLING_RATE === "string"
    ? parseFloat(process.env.NEXT_PUBLIC_WEB_VITALS_SAMPLING_RATE)
    : 0.1;

// Only report in production
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function shouldReport(): boolean {
  if (!IS_PRODUCTION) return false;
  if (SAMPLING_RATE >= 1) return true;
  if (SAMPLING_RATE <= 0) return false;
  return Math.random() < SAMPLING_RATE;
}

export function WebVitalsReporting() {
  const analyticsEnabled = useAnalyticsConsentStore((s) => s.analyticsEnabled);

  useReportWebVitals((metric) => {
    if (!shouldReport() || !analyticsEnabled) return;

    // Map Next.js metric names to more readable names
    const metricNameMap: Record<string, string> = {
      LCP: "Largest Contentful Paint",
      FCP: "First Contentful Paint",
      CLS: "Cumulative Layout Shift",
      INP: "Interaction to Next Paint",
      TTFB: "Time to First Byte",
      FID: "First Input Delay",
    };

    const readableName = metricNameMap[metric.name] || metric.name;
    const route = metric.id || window.location.pathname;

    // Send metric through analytics service
    analyticsService.track("web_vital", {
      metric_name: readableName,
      metric_id: metric.name,
      value: metric.value,
      rating: metric.rating, // "good" | "needs-improvement" | "poor"
      delta: metric.delta,
      route: route,
      navigation_type: metric.navigationType,
      timestamp: Date.now(),
    });
  });

  return null;
}
