export type NetworkConnectionType =
  | "wifi"
  | "cellular"
  | "ethernet"
  | "unknown"
  | "offline";

export type ConsentStatus = "pending" | "granted" | "denied";

export interface RouteLoadMetric {
  route: string;
  loadTimeMs: number;
  timestamp: string;
}

export interface ApiResponseMetric {
  url: string;
  method: string;
  durationMs: number;
  status: number | null;
  networkType: NetworkConnectionType;
  timestamp: string;
}

export interface CrashReport {
  id: string;
  message: string;
  stack?: string;
  componentStack?: string;
  route: string;
  timestamp: string;
  sessionSnapshot: SessionEvent[];
  device: DeviceSnapshot;
}

export interface SessionEvent {
  type: "navigation" | "click" | "api" | "error" | "custom";
  label: string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface HeatmapPoint {
  x: number;
  y: number;
  route: string;
  timestamp: string;
}

export interface DeviceSnapshot {
  userAgent: string;
  platform: string;
  os: string;
  deviceType: "mobile" | "tablet" | "desktop";
  screenWidth: number;
  screenHeight: number;
  memoryMb: number | null;
  batteryLevel: number | null;
  batteryCharging: boolean | null;
  networkType: NetworkConnectionType;
}

export interface MemorySample {
  usedMb: number | null;
  totalMb: number | null;
  timestamp: string;
}

export interface BatterySample {
  level: number | null;
  charging: boolean | null;
  timestamp: string;
}

export interface PerformanceMetricsSummary {
  routeLoads: RouteLoadMetric[];
  apiResponses: ApiResponseMetric[];
  crashes: CrashReport[];
  heatmap: HeatmapPoint[];
  memorySamples: MemorySample[];
  batterySamples: BatterySample[];
  device: DeviceSnapshot | null;
  networkBreakdown: Record<
    NetworkConnectionType,
    { count: number; avgApiMs: number }
  >;
}

export type PerformanceEventType =
  | "route_load"
  | "api_response"
  | "crash"
  | "heatmap"
  | "memory"
  | "battery"
  | "session";

export interface PerformanceEvent {
  type: PerformanceEventType;
  payload: unknown;
  timestamp: string;
}
