import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { BacktestParams, BacktestResult } from "@/lib/backtest"

export interface BacktestRun {
  id: string
  params: BacktestParams
  result: BacktestResult
  timestamp: number
}

interface BacktestHistoryState {
  runs: BacktestRun[]
  addRun: (params: BacktestParams, result: BacktestResult) => string
  getRun: (id: string) => BacktestRun | undefined
  clearHistory: () => void
}

export const useBacktestHistoryStore = create<BacktestHistoryState>()(
  persist(
    (set, get) => ({
      runs: [],
      addRun: (params, result) => {
        const id = `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        set((state) => ({
          runs: [{ id, params, result, timestamp: Date.now() }, ...state.runs],
        }))
        return id
      },
      getRun: (id) => get().runs.find((r) => r.id === id),
      clearHistory: () => set({ runs: [] }),
    }),
    { name: "backtest-history-store" }
  )
)
