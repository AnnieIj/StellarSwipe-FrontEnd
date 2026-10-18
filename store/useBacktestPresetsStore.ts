import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BacktestParams } from "@/lib/backtest";

export interface BacktestPreset {
  id: string;
  name: string;
  params: BacktestParams;
  createdAt: number;
}

interface BacktestPresetsState {
  presets: BacktestPreset[];
  savePreset: (name: string, params: BacktestParams) => void;
  overwritePreset: (id: string, params: BacktestParams) => void;
  renamePreset: (id: string, name: string) => void;
  deletePreset: (id: string) => void;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_BPS = 10;

function toBps(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_BPS;
}

/** Normalises persisted params, dropping presets that cannot be recovered. */
export function sanitizePreset(raw: unknown): BacktestPreset | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<BacktestPreset>;
  const params = (p.params ?? {}) as Partial<BacktestParams>;
  if (typeof p.name !== "string" || !p.name.trim()) return null;
  if (typeof params.from !== "string" || !DATE_RE.test(params.from)) return null;
  if (typeof params.to !== "string" || !DATE_RE.test(params.to)) return null;
  return {
    id: typeof p.id === "string" && p.id ? p.id : `${p.name}-${Date.now()}`,
    name: p.name.trim(),
    createdAt: typeof p.createdAt === "number" ? p.createdAt : Date.now(),
    params: {
      from: params.from,
      to: params.to,
      signals: Array.isArray(params.signals)
        ? params.signals.filter((s): s is string => typeof s === "string")
        : [],
      slippageBps: toBps(params.slippageBps),
      feeBps: toBps(params.feeBps),
    },
  };
}

export const useBacktestPresetsStore = create<BacktestPresetsState>()(
  persist(
    (set) => ({
      presets: [],
      savePreset: (name, params) =>
        set((state) => ({
          presets: [
            ...state.presets,
            {
              id: `${name}-${Date.now()}-${state.presets.length}`,
              name,
              params,
              createdAt: Date.now(),
            },
          ],
        })),
      overwritePreset: (id, params) =>
        set((state) => ({
          presets: state.presets.map((p) => (p.id === id ? { ...p, params } : p)),
        })),
      renamePreset: (id, name) =>
        set((state) => ({
          presets: state.presets.map((p) => (p.id === id ? { ...p, name } : p)),
        })),
      deletePreset: (id) =>
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
        })),
    }),
    {
      name: "backtest-presets-store",
      // Sanitise on hydrate so invalid legacy values never reach the form.
      merge: (persisted, current) => {
        const presets = (persisted as { presets?: unknown })?.presets;
        return {
          ...current,
          presets: Array.isArray(presets)
            ? presets.map(sanitizePreset).filter((p): p is BacktestPreset => p !== null)
            : current.presets,
        };
      },
    }
  )
);
