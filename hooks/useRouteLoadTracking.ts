"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { recordRouteLoad } from "@/services/performanceMonitoring";
import { isMonitoringEnabled } from "@/store/usePerformanceMonitoringStore";

/**
 * Tracks per-route load time using navigation timing and pathname changes.
 */
export function useRouteLoadTracking(): void {
  const pathname = usePathname();
  const navigationStartRef = useRef<number>(0);
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isMonitoringEnabled()) return;

    navigationStartRef.current = performance.now();
    prevPathRef.current = pathname;

    const reportLoad = () => {
      const loadTimeMs = Math.round(
        performance.now() - navigationStartRef.current
      );
      recordRouteLoad(pathname, loadTimeMs);
    };

    // Report after paint
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(reportLoad);
    });

    return () => cancelAnimationFrame(raf);
  }, [pathname]);
}
