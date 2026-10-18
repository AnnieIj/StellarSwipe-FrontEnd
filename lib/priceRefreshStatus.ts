export const PRICE_STALE_THRESHOLD_MS = 5 * 60 * 1000;

export type PriceSyncState = "synced" | "syncing" | "stale" | "offline" | "never";

export interface PriceRefreshInput {
  online: boolean;
  isFetching: boolean;
  lastSyncedAt: number | null;
  now: number;
  staleThresholdMs?: number;
}

export interface PriceRefreshStatus {
  state: PriceSyncState;
  isLive: boolean;
  isStale: boolean;
  ageMs: number | null;
  i18nKey: string;
}

export interface AgeParts {
  value: number;
  unit: "second" | "minute" | "hour";
}

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

function normalizeTimestamp(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return value;
}

export function ageSince(lastSyncedAt: number | null, now: number): number | null {
  const synced = normalizeTimestamp(lastSyncedAt);
  if (synced === null) return null;
  return Math.max(0, now - synced);
}

export function isPriceStale(
  lastSyncedAt: number | null,
  now: number,
  staleThresholdMs: number = PRICE_STALE_THRESHOLD_MS,
): boolean {
  const age = ageSince(lastSyncedAt, now);
  if (age === null) return false;
  return age >= staleThresholdMs;
}

export function deriveSyncState(input: PriceRefreshInput): PriceSyncState {
  if (!input.online) return "offline";
  const age = ageSince(input.lastSyncedAt, input.now);
  if (age === null) return "never";
  if (input.isFetching) return "syncing";
  const threshold = input.staleThresholdMs ?? PRICE_STALE_THRESHOLD_MS;
  return age >= threshold ? "stale" : "synced";
}

export function derivePriceRefreshStatus(
  input: PriceRefreshInput,
): PriceRefreshStatus {
  const state = deriveSyncState(input);
  const ageMs = ageSince(input.lastSyncedAt, input.now);
  return {
    state,
    isLive: state === "synced",
    isStale: state === "stale" || state === "never",
    ageMs,
    i18nKey: `sync.status.${state}`,
  };
}

export function formatAgeParts(ageMs: number | null): AgeParts | null {
  if (ageMs === null || !Number.isFinite(ageMs) || ageMs < 0) return null;
  if (ageMs < MS_PER_MINUTE) {
    return { value: Math.floor(ageMs / MS_PER_SECOND), unit: "second" };
  }
  if (ageMs < MS_PER_HOUR) {
    return { value: Math.floor(ageMs / MS_PER_MINUTE), unit: "minute" };
  }
  return { value: Math.floor(ageMs / MS_PER_HOUR), unit: "hour" };
}
