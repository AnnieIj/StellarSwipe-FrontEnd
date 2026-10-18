import { useBacktestHistoryStore } from "@/store/useBacktestHistoryStore"
import type { BacktestParams, BacktestResult } from "@/lib/backtest"

const PARAMS: BacktestParams = {
  from: "2023-01-01",
  to: "2023-12-31",
  signals: ["providerA"],
  slippageBps: 10,
  feeBps: 10,
}

const RESULT: BacktestResult = {
  totalReturn: 0.12,
  winRate: 0.6,
  maxDrawdown: 0.05,
  trades: [{ time: "2023-06-01", pnl: 0.03 }],
}

beforeEach(() => {
  useBacktestHistoryStore.setState({ runs: [] })
})

describe("useBacktestHistoryStore – persistence", () => {
  it("starts with no runs", () => {
    expect(useBacktestHistoryStore.getState().runs).toHaveLength(0)
  })

  it("addRun stores params, result, and timestamp", () => {
    const before = Date.now()
    useBacktestHistoryStore.getState().addRun(PARAMS, RESULT)
    const { runs } = useBacktestHistoryStore.getState()
    expect(runs).toHaveLength(1)
    expect(runs[0].params).toEqual(PARAMS)
    expect(runs[0].result).toEqual(RESULT)
    expect(runs[0].timestamp).toBeGreaterThanOrEqual(before)
  })

  it("addRun returns the new run id", () => {
    const id = useBacktestHistoryStore.getState().addRun(PARAMS, RESULT)
    expect(typeof id).toBe("string")
    expect(id.length).toBeGreaterThan(0)
  })

  it("prepends new runs so list is reverse-chronological", () => {
    useBacktestHistoryStore.getState().addRun(PARAMS, RESULT)
    useBacktestHistoryStore.getState().addRun({ ...PARAMS, from: "2024-01-01" }, RESULT)
    const { runs } = useBacktestHistoryStore.getState()
    expect(runs[0].params.from).toBe("2024-01-01")
    expect(runs[1].params.from).toBe("2023-01-01")
  })

  it("accumulates multiple runs", () => {
    useBacktestHistoryStore.getState().addRun(PARAMS, RESULT)
    useBacktestHistoryStore.getState().addRun(PARAMS, { ...RESULT, totalReturn: 0.2 })
    expect(useBacktestHistoryStore.getState().runs).toHaveLength(2)
  })

  it("clearHistory removes all runs", () => {
    useBacktestHistoryStore.getState().addRun(PARAMS, RESULT)
    useBacktestHistoryStore.getState().clearHistory()
    expect(useBacktestHistoryStore.getState().runs).toHaveLength(0)
  })
})

describe("useBacktestHistoryStore – detail-view retrieval", () => {
  it("getRun returns the correct run by id", () => {
    const id = useBacktestHistoryStore.getState().addRun(PARAMS, RESULT)
    const run = useBacktestHistoryStore.getState().getRun(id)
    expect(run).toBeDefined()
    expect(run!.id).toBe(id)
    expect(run!.result.totalReturn).toBe(0.12)
  })

  it("getRun returns undefined for unknown id", () => {
    expect(useBacktestHistoryStore.getState().getRun("nonexistent")).toBeUndefined()
  })

  it("each run has a unique id", () => {
    useBacktestHistoryStore.getState().addRun(PARAMS, RESULT)
    useBacktestHistoryStore.getState().addRun(PARAMS, RESULT)
    const ids = useBacktestHistoryStore.getState().runs.map((r) => r.id)
    expect(new Set(ids).size).toBe(2)
  })

  it("getRun retrieves full trade list", () => {
    const id = useBacktestHistoryStore.getState().addRun(PARAMS, RESULT)
    const run = useBacktestHistoryStore.getState().getRun(id)
    expect(run!.result.trades).toEqual(RESULT.trades)
  })
})
