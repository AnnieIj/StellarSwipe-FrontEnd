"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ApiResponseMetric,
  BatterySample,
  ConsentStatus,
  CrashReport,
  DeviceSnapshot,
  HeatmapPoint,
  MemorySample,
  NetworkConnectionType,
  PerformanceMetricsSummary,
  RouteLoadMetric,
  SessionEvent,
} from "@/lib/performance/types";

const MAX_ROUTE_LOADS = 100;
const MAX_API_RESPONSES = 200;
const MAX_CRASHES = 50;
const MAX_HEATMAP = 500;
const MAX_MEMORY_SAMPLES = 60;
const MAX_BATTERY_SAMPLES = 60;
const MAX_SESSION_EVENTS = 100;

interface PerformanceMonitoringState {
  consent: ConsentStatus;
  anonymousSessionId: string;
  device: DeviceSnapshot | null;
  routeLoads: RouteLoadMetric[];
  apiResponses: ApiResponseMetric[];
  crashes: CrashReport[];
  heatmap: HeatmapPoint[];
  memorySamples: MemorySample[];
  batterySamples: BatterySample[];
  sessionEvents: SessionEvent[];

  setConsent: (status: ConsentStatus) => void;
  setDevice: (device: DeviceSnapshot) => void;
  recordRouteLoad: (metric: RouteLoadMetric) => void;
  recordApiResponse: (metric: ApiResponseMetric) => void;
  recordCrash: (report: CrashReport) => void;
  recordHeatmapPoint: (point: HeatmapPoint) => void;
  recordMemorySample: (sample: MemorySample) => void;
  recordBatterySample: (sample: BatterySample) => void;
  recordSessionEvent: (event: SessionEvent) => void;
  getSummary: () => PerformanceMetricsSummary;
  clearMetrics: () => void;
}

function createAnonymousId(): string {
  return `anon_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(
    36
  )}`;
}

function trimArray<T>(arr: T[], max: number): T[] {
  return arr.length > max ? arr.slice(arr.length - max) : arr;
}

function buildNetworkBreakdown(
  apiResponses: ApiResponseMetric[]
): PerformanceMetricsSummary["networkBreakdown"] {
  const types: NetworkConnectionType[] = [
    "wifi",
    "cellular",
    "ethernet",
    "unknown",
    "offline",
  ];

  const breakdown = {} as PerformanceMetricsSummary["networkBreakdown"];
  for (const type of types) {
    const entries = apiResponses.filter((e) => e.networkType === type);
    const count = entries.length;
    const avgApiMs =
      count > 0
        ? Math.round(entries.reduce((sum, e) => sum + e.durationMs, 0) / count)
        : 0;
    breakdown[type] = { count, avgApiMs };
  }
  return breakdown;
}

export const usePerformanceMonitoringStore =
  create<PerformanceMonitoringState>()(
    persist(
      (set, get) => ({
        consent: "pending",
        anonymousSessionId: createAnonymousId(),
        device: null,
        routeLoads: [],
        apiResponses: [],
        crashes: [],
        heatmap: [],
        memorySamples: [],
        batterySamples: [],
        sessionEvents: [],

        setConsent: (status) => set({ consent: status }),

        setDevice: (device) => set({ device }),

        recordRouteLoad: (metric) =>
          set((state) => ({
            routeLoads: trimArray(
              [...state.routeLoads, metric],
              MAX_ROUTE_LOADS
            ),
          })),

        recordApiResponse: (metric) =>
          set((state) => ({
            apiResponses: trimArray(
              [...state.apiResponses, metric],
              MAX_API_RESPONSES
            ),
          })),

        recordCrash: (report) =>
          set((state) => ({
            crashes: trimArray([...state.crashes, report], MAX_CRASHES),
          })),

        recordHeatmapPoint: (point) =>
          set((state) => ({
            heatmap: trimArray([...state.heatmap, point], MAX_HEATMAP),
          })),

        recordMemorySample: (sample) =>
          set((state) => ({
            memorySamples: trimArray(
              [...state.memorySamples, sample],
              MAX_MEMORY_SAMPLES
            ),
          })),

        recordBatterySample: (sample) =>
          set((state) => ({
            batterySamples: trimArray(
              [...state.batterySamples, sample],
              MAX_BATTERY_SAMPLES
            ),
          })),

        recordSessionEvent: (event) =>
          set((state) => ({
            sessionEvents: trimArray(
              [...state.sessionEvents, event],
              MAX_SESSION_EVENTS
            ),
          })),

        getSummary: () => {
          const state = get();
          return {
            routeLoads: state.routeLoads,
            apiResponses: state.apiResponses,
            crashes: state.crashes,
            heatmap: state.heatmap,
            memorySamples: state.memorySamples,
            batterySamples: state.batterySamples,
            device: state.device,
            networkBreakdown: buildNetworkBreakdown(state.apiResponses),
          };
        },

        clearMetrics: () =>
          set({
            routeLoads: [],
            apiResponses: [],
            crashes: [],
            heatmap: [],
            memorySamples: [],
            batterySamples: [],
            sessionEvents: [],
          }),
      }),
      {
        name: "stellar-performance-monitoring",
        partialize: (state) => ({
          consent: state.consent,
          anonymousSessionId: state.anonymousSessionId,
          routeLoads: state.routeLoads,
          apiResponses: state.apiResponses,
          crashes: state.crashes,
          heatmap: state.heatmap,
          memorySamples: state.memorySamples,
          batterySamples: state.batterySamples,
        }),
      }
    )
  );

export function isMonitoringEnabled(): boolean {
  return usePerformanceMonitoringStore.getState().consent === "granted";
}

export function getSessionSnapshot(): SessionEvent[] {
  return [...usePerformanceMonitoringStore.getState().sessionEvents];
}
