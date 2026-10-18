import type { Span } from "@/src/tracing/worker-tracing.service";
import {
  getDeviceSnapshot,
  getMemoryUsageMb,
  resolveNetworkType,
} from "@/lib/performance/device";
import type {
  ApiResponseMetric,
  CrashReport,
  HeatmapPoint,
  RouteLoadMetric,
  SessionEvent,
} from "@/lib/performance/types";
import {
  getSessionSnapshot,
  isMonitoringEnabled,
  usePerformanceMonitoringStore,
} from "@/store/usePerformanceMonitoringStore";

let fetchPatched = false;
let initialized = false;
let memoryInterval: ReturnType<typeof setInterval> | null = null;
let batteryInterval: ReturnType<typeof setInterval> | null = null;

function now(): string {
  return new Date().toISOString();
}

function getCurrentRoute(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname;
}

function recordSession(
  type: SessionEvent["type"],
  label: string,
  metadata?: SessionEvent["metadata"]
): void {
  if (!isMonitoringEnabled()) return;
  usePerformanceMonitoringStore.getState().recordSessionEvent({
    type,
    label,
    timestamp: now(),
    metadata,
  });
}

export function recordRouteLoad(route: string, loadTimeMs: number): void {
  if (!isMonitoringEnabled()) return;

  const metric: RouteLoadMetric = {
    route,
    loadTimeMs,
    timestamp: now(),
  };

  usePerformanceMonitoringStore.getState().recordRouteLoad(metric);
  recordSession("navigation", route, { loadTimeMs });
}

export function recordApiResponse(
  url: string,
  method: string,
  durationMs: number,
  status: number | null
): void {
  if (!isMonitoringEnabled()) return;

  const metric: ApiResponseMetric = {
    url,
    method,
    durationMs,
    status,
    networkType: resolveNetworkType(),
    timestamp: now(),
  };

  usePerformanceMonitoringStore.getState().recordApiResponse(metric);
  recordSession("api", `${method} ${url}`, {
    durationMs,
    status: status ?? -1,
  });
}

export function recordCrash(
  message: string,
  stack?: string,
  componentStack?: string
): void {
  if (!isMonitoringEnabled()) return;

  const store = usePerformanceMonitoringStore.getState();
  const device = store.device;

  const report: CrashReport = {
    id: `crash_${Date.now().toString(36)}`,
    message,
    stack,
    componentStack,
    route: getCurrentRoute(),
    timestamp: now(),
    sessionSnapshot: getSessionSnapshot(),
    device: device ?? {
      userAgent: "",
      platform: "",
      os: "Unknown",
      deviceType: "desktop",
      screenWidth: 0,
      screenHeight: 0,
      memoryMb: null,
      batteryLevel: null,
      batteryCharging: null,
      networkType: resolveNetworkType(),
    },
  };

  store.recordCrash(report);
  recordSession("error", message);
}

export function recordHeatmapPoint(x: number, y: number, route: string): void {
  if (!isMonitoringEnabled()) return;

  const point: HeatmapPoint = {
    x: Math.round(x),
    y: Math.round(y),
    route,
    timestamp: now(),
  };

  usePerformanceMonitoringStore.getState().recordHeatmapPoint(point);
  recordSession("click", route, { x: point.x, y: point.y });
}

export function recordTracingSpan(span: Span): void {
  if (!isMonitoringEnabled()) return;

  recordApiResponse(
    span.name,
    "TRACE",
    span.durationMs ?? 0,
    span.status === "error" ? 500 : 200
  );
}

function patchFetch(): void {
  if (fetchPatched || typeof window === "undefined") return;
  fetchPatched = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const start = performance.now();
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;
    const method = init?.method ?? "GET";

    try {
      const response = await originalFetch(input, init);
      recordApiResponse(
        url,
        method,
        Math.round(performance.now() - start),
        response.status
      );
      return response;
    } catch (err) {
      recordApiResponse(
        url,
        method,
        Math.round(performance.now() - start),
        null
      );
      throw err;
    }
  };
}

function startResourceObserver(): void {
  if (typeof PerformanceObserver === "undefined") return;

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntriesByType(
        "navigation"
      ) as PerformanceNavigationTiming[];
      for (const entry of entries) {
        if (entry.entryType === "navigation") {
          recordRouteLoad(
            getCurrentRoute(),
            Math.round(entry.loadEventEnd - entry.startTime)
          );
        }
      }
    });
    observer.observe({ type: "navigation", buffered: true });
  } catch {
    // PerformanceObserver not supported
  }
}

function startMemorySampling(): void {
  if (memoryInterval) return;

  memoryInterval = setInterval(() => {
    if (!isMonitoringEnabled()) return;
    const { usedMb, totalMb } = getMemoryUsageMb();
    usePerformanceMonitoringStore.getState().recordMemorySample({
      usedMb,
      totalMb,
      timestamp: now(),
    });
  }, 30_000);
}

async function sampleBattery(): Promise<void> {
  if (!isMonitoringEnabled()) return;

  const nav = navigator as Navigator & {
    getBattery?: () => Promise<{ level: number; charging: boolean }>;
  };

  if (!nav.getBattery) return;

  try {
    const battery = await nav.getBattery();
    usePerformanceMonitoringStore.getState().recordBatterySample({
      level: Math.round(battery.level * 100),
      charging: battery.charging,
      timestamp: now(),
    });
  } catch {
    // Battery API unavailable
  }
}

function startBatterySampling(): void {
  if (batteryInterval) return;
  void sampleBattery();
  batteryInterval = setInterval(() => {
    void sampleBattery();
  }, 60_000);
}

function attachGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    recordCrash(event.message, event.error?.stack);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : String(reason ?? "Unhandled rejection");
    const stack = reason instanceof Error ? reason.stack : undefined;
    recordCrash(message, stack);
  });

  window.addEventListener("app-error", ((event: CustomEvent) => {
    const detail = event.detail as {
      message?: string;
      stack?: string;
      componentStack?: string;
    };
    recordCrash(
      detail.message ?? "React error",
      detail.stack,
      detail.componentStack
    );
  }) as EventListener);
}

function attachHeatmapListeners(): void {
  if (typeof window === "undefined") return;

  const handler = (event: MouseEvent | TouchEvent) => {
    if (!isMonitoringEnabled()) return;

    let clientX = 0;
    let clientY = 0;

    if ("touches" in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if ("clientX" in event) {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    const x = (clientX / window.innerWidth) * 100;
    const y = (clientY / window.innerHeight) * 100;
    recordHeatmapPoint(x, y, getCurrentRoute());
  };

  window.addEventListener("click", handler, { passive: true });
  window.addEventListener("touchstart", handler, { passive: true });
}

export async function initPerformanceMonitoring(): Promise<void> {
  if (initialized || typeof window === "undefined") return;
  if (!isMonitoringEnabled()) return;

  initialized = true;

  const device = await getDeviceSnapshot();
  usePerformanceMonitoringStore.getState().setDevice(device);

  patchFetch();
  startResourceObserver();
  startMemorySampling();
  startBatterySampling();
  attachGlobalErrorHandlers();
  attachHeatmapListeners();
}

export function teardownPerformanceMonitoring(): void {
  if (memoryInterval) {
    clearInterval(memoryInterval);
    memoryInterval = null;
  }
  if (batteryInterval) {
    clearInterval(batteryInterval);
    batteryInterval = null;
  }
  initialized = false;
}

export function onConsentChanged(granted: boolean): void {
  if (granted) {
    void initPerformanceMonitoring();
  } else {
    teardownPerformanceMonitoring();
  }
}
