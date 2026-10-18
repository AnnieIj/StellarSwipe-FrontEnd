import { create } from "zustand";
import { persist } from "zustand/middleware";

export const TRADE_TYPE_FILTERS = ["ALL", "COPY_TRADE", "SWAP", "MANUAL"] as const;
export const TRADE_STATUS_FILTERS = ["ALL", "PENDING", "SUCCEEDED", "FAILED"] as const;
export const TRADE_SORT_ORDERS = ["newest", "oldest", "amount"] as const;

export type TradeTypeFilter = (typeof TRADE_TYPE_FILTERS)[number];
export type TradeStatusFilter = (typeof TRADE_STATUS_FILTERS)[number];
export type TradeSortOrder = (typeof TRADE_SORT_ORDERS)[number];

export interface TradeFilterSnapshot {
  typeFilter: TradeTypeFilter;
  statusFilter: TradeStatusFilter;
  sortOrder: TradeSortOrder;
}

export interface TradeFilterPreset {
  id: string;
  name: string;
  filter: TradeFilterSnapshot;
  createdAt: number;
}

type MutationResult = { ok: true } | { ok: false; error: string };

const MAX_NAME_LENGTH = 40;

const DEFAULT_TRADE_FILTER: TradeFilterSnapshot = {
  typeFilter: "ALL",
  statusFilter: "ALL",
  sortOrder: "newest",
};

export function isSameTradeFilter(a: TradeFilterSnapshot, b: TradeFilterSnapshot) {
  return (
    a.typeFilter === b.typeFilter &&
    a.statusFilter === b.statusFilter &&
    a.sortOrder === b.sortOrder
  );
}

function isTradeFilterSnapshot(value: unknown): value is TradeFilterSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    (TRADE_TYPE_FILTERS as readonly unknown[]).includes(v.typeFilter) &&
    (TRADE_STATUS_FILTERS as readonly unknown[]).includes(v.statusFilter) &&
    (TRADE_SORT_ORDERS as readonly unknown[]).includes(v.sortOrder)
  );
}

function isTradeFilterPreset(value: unknown): value is TradeFilterPreset {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const name = typeof v.name === "string" ? v.name.trim() : "";
  return (
    typeof v.id === "string" &&
    name.length > 0 &&
    name.length <= MAX_NAME_LENGTH &&
    typeof v.createdAt === "number" &&
    isTradeFilterSnapshot(v.filter)
  );
}

function validateName(name: string, existing: TradeFilterPreset[], excludeId?: string): MutationResult {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` };
  }
  const collides = existing.some(
    (p) => p.id !== excludeId && p.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (collides) return { ok: false, error: "A preset with this name already exists." };
  return { ok: true };
}

interface TradeFilterPresetState {
  presets: TradeFilterPreset[];
  save: (name: string, filter: TradeFilterSnapshot) => MutationResult;
  rename: (id: string, name: string) => MutationResult;
  remove: (id: string) => void;
}

export const useTradeFilterPresetStore = create<TradeFilterPresetState>()(
  persist(
    (set, get) => ({
      presets: [],
      save: (name, filter) => {
        if (isSameTradeFilter(filter, DEFAULT_TRADE_FILTER)) {
          return { ok: false, error: "Set at least one filter before saving a preset." };
        }
        const trimmed = name.trim();
        const result = validateName(trimmed, get().presets);
        if (!result.ok) return result;
        set((state) => ({
          presets: [
            ...state.presets,
            {
              id: `trade-preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              name: trimmed,
              filter,
              createdAt: Date.now(),
            },
          ],
        }));
        return { ok: true };
      },
      rename: (id, name) => {
        if (!get().presets.some((p) => p.id === id)) {
          return { ok: false, error: "Preset not found." };
        }
        const trimmed = name.trim();
        const result = validateName(trimmed, get().presets, id);
        if (!result.ok) return result;
        set((state) => ({
          presets: state.presets.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
        }));
        return { ok: true };
      },
      remove: (id) =>
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
        })),
    }),
    {
      name: "trade-filter-presets-v1",
      partialize: (state) => ({ presets: state.presets }),
      // Drop anything in storage that no longer parses as a valid preset
      // (hand-edited, truncated, or written by an older schema).
      merge: (persisted, current) => {
        const stored = (persisted as Partial<TradeFilterPresetState> | undefined)?.presets;
        return {
          ...current,
          presets: Array.isArray(stored) ? stored.filter(isTradeFilterPreset) : [],
        };
      },
    }
  )
);
