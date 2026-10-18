export const PULL_THRESHOLD_PX = 80;
export const PULL_DAMPING_FACTOR = 0.5;
export const PULL_MAX_INDICATOR_PX = 120;

export type PullPhase = "idle" | "pulling" | "armed" | "refreshing";

export interface PullInput {
  distance: number;
  isRefreshing: boolean;
  isEnabled?: boolean;
  atTop?: boolean;
  threshold?: number;
}

export interface PullState {
  phase: PullPhase;
  pullDistance: number;
  canRefresh: boolean;
  progress: number;
  indicatorOffset: number;
  shouldCapture: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function dampPullDistance(
  distance: number,
  factor: number = PULL_DAMPING_FACTOR,
): number {
  if (!Number.isFinite(distance) || distance <= 0) return 0;
  const safeFactor = Number.isFinite(factor) ? Math.max(0, factor) : PULL_DAMPING_FACTOR;
  return distance * safeFactor;
}

export function derivePullState(input: PullInput): PullState {
  const threshold =
    input.threshold !== undefined && input.threshold > 0
      ? input.threshold
      : PULL_THRESHOLD_PX;
  const enabled = input.isEnabled !== false;
  const atTop = input.atTop !== false;
  const damped = dampPullDistance(input.distance);

  if (!enabled || !atTop) {
    return {
      phase: "idle",
      pullDistance: 0,
      canRefresh: false,
      progress: 0,
      indicatorOffset: 0,
      shouldCapture: false,
    };
  }

  if (input.isRefreshing) {
    return {
      phase: "refreshing",
      pullDistance: damped,
      canRefresh: false,
      progress: 1,
      indicatorOffset: Math.min(damped, PULL_MAX_INDICATOR_PX),
      shouldCapture: false,
    };
  }

  if (damped <= 0) {
    return {
      phase: "idle",
      pullDistance: 0,
      canRefresh: false,
      progress: 0,
      indicatorOffset: 0,
      shouldCapture: false,
    };
  }

  const canRefresh = damped >= threshold;
  return {
    phase: canRefresh ? "armed" : "pulling",
    pullDistance: damped,
    canRefresh,
    progress: clamp(damped / threshold, 0, 1),
    indicatorOffset: Math.min(damped, PULL_MAX_INDICATOR_PX),
    shouldCapture: true,
  };
}
