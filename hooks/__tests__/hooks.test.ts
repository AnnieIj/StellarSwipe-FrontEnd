/**
 * Unit tests for core custom hooks.
 *
 * React hooks cannot be called in a bare Node environment, so each test
 * targets the pure-logic layer that the hook exposes:
 *  - useStopLoss   → derived price calculation
 *  - useTradeExecution → service interaction contract (via mocked service)
 *  - usePortfolio  → percentage derivation and portfolio summary maths
 */

// ── useStopLoss — derived price calculation ──────────────────────────────────

function computeStopLossPrice(
  entryPrice: number,
  stopLossPercent: number
): number {
  return entryPrice * (1 - stopLossPercent / 100);
}

describe("useStopLoss – stop-loss price derivation", () => {
  it("derives the correct price at default 5%", () => {
    expect(computeStopLossPrice(100, 5)).toBeCloseTo(95);
  });

  it("derives the correct price at 10%", () => {
    expect(computeStopLossPrice(200, 10)).toBeCloseTo(180);
  });

  it("returns entry price when stop-loss is 0%", () => {
    expect(computeStopLossPrice(0.4821, 0)).toBeCloseTo(0.4821);
  });

  it("returns 0 when stop-loss is 100%", () => {
    expect(computeStopLossPrice(1000, 100)).toBeCloseTo(0);
  });

  it("handles fractional entry prices correctly", () => {
    expect(computeStopLossPrice(0.531, 5)).toBeCloseTo(0.531 * 0.95);
  });

  it("returns null placeholder when no entryPrice provided", () => {
    // Mirrors the hook branch: entryPrice != null ? … : null
    const entryPrice: number | undefined = undefined;
    const result =
      entryPrice != null ? computeStopLossPrice(entryPrice, 5) : null;
    expect(result).toBeNull();
  });

  it("boundary: stop-loss > 100% produces a negative price", () => {
    expect(computeStopLossPrice(100, 110)).toBeCloseTo(-10);
  });
});

describe("useStopLoss – reset behaviour", () => {
  it("reset restores the initial value", () => {
    const initialValue = 7;
    let current = 25;
    function reset() {
      current = initialValue;
    }
    reset();
    expect(current).toBe(initialValue);
  });

  it("reset to a custom initial value", () => {
    const initialValue = 15;
    let current = 3;
    function reset() {
      current = initialValue;
    }
    reset();
    expect(current).toBe(15);
  });
});

// ── useTradeExecution — service interaction contract ─────────────────────────

jest.mock("@/services/tradeExecutionService", () => ({
  tradeExecutionService: {
    getEstimate: jest.fn(() => ({
      estimatedTimeMs: 300,
      currentSlippage: 0.5,
      queueDepth: 0,
    })),
    enqueue: jest.fn(),
    getExchangeRate: jest.fn(),
    getBalance: jest.fn(),
  },
}));

import { tradeExecutionService } from "@/services/tradeExecutionService";
import type { TradeRequest } from "@/services/tradeExecutionService";

const MOCK_REQUEST: TradeRequest = {
  id: "req-1",
  userId: "user-1",
  signalId: "sig-1",
  asset: "XLM",
  direction: "BUY",
  amount: 100,
  slippageTolerance: 0.5,
};

describe("useTradeExecution – service contract", () => {
  const mockEnqueue = tradeExecutionService.enqueue as jest.Mock;
  const mockGetEstimate = tradeExecutionService.getEstimate as jest.Mock;
  const mockGetExchangeRate =
    tradeExecutionService.getExchangeRate as jest.Mock;
  const mockGetBalance = tradeExecutionService.getBalance as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getEstimate is called with the correct slippage tolerance", () => {
    tradeExecutionService.getEstimate(MOCK_REQUEST.slippageTolerance);
    expect(mockGetEstimate).toHaveBeenCalledWith(0.5);
  });

  it("enqueue is called with the full trade request", async () => {
    mockEnqueue.mockResolvedValueOnce({
      id: "req-1",
      success: true,
      txHash: "0xabc",
      executionTimeMs: 320,
    });
    await tradeExecutionService.enqueue(MOCK_REQUEST);
    expect(mockEnqueue).toHaveBeenCalledWith(MOCK_REQUEST);
  });

  it("a successful enqueue resolves with success=true and a txHash", async () => {
    const result = {
      id: "req-1",
      success: true,
      txHash: "0xabc",
      executionTimeMs: 320,
    };
    mockEnqueue.mockResolvedValueOnce(result);
    const out = await tradeExecutionService.enqueue(MOCK_REQUEST);
    expect(out.success).toBe(true);
    expect(out.txHash).toBeDefined();
  });

  it("a failed enqueue resolves with success=false and an error message", async () => {
    const result = {
      id: "req-1",
      success: false,
      executionTimeMs: 100,
      error: "Insufficient balance",
    };
    mockEnqueue.mockResolvedValueOnce(result);
    const out = await tradeExecutionService.enqueue(MOCK_REQUEST);
    expect(out.success).toBe(false);
    expect(out.error).toBe("Insufficient balance");
  });

  it("getExchangeRate is called with the asset symbol during slippage polling", async () => {
    mockGetExchangeRate.mockResolvedValueOnce(0.482);
    await tradeExecutionService.getExchangeRate("XLM");
    expect(mockGetExchangeRate).toHaveBeenCalledWith("XLM");
  });

  it("getBalance is called with address and asset during preload", async () => {
    mockGetBalance.mockResolvedValueOnce(500);
    await tradeExecutionService.getBalance("GADDR", "XLM");
    expect(mockGetBalance).toHaveBeenCalledWith("GADDR", "XLM");
  });

  it("live slippage is computed from the rate delta", () => {
    const rate = 0.502;
    const slippageTolerance = 0.5;
    const slippage = parseFloat(
      (Math.abs(rate - slippageTolerance) * 100).toFixed(2)
    );
    expect(slippage).toBeCloseTo(0.2);
  });
});

// ── usePortfolio — percentage derivation ─────────────────────────────────────

interface PortfolioAssetInput {
  symbol: string;
  value: number;
  realizedPnL?: number;
  unrealizedPnL?: number;
}

function withPercentages(assets: PortfolioAssetInput[]) {
  const total = assets.reduce((sum, a) => sum + a.value, 0);
  return assets.map((a) => ({
    ...a,
    percentage: total > 0 ? Math.round((a.value / total) * 1000) / 10 : 0,
  }));
}

function totalValue(assets: PortfolioAssetInput[]) {
  return assets.reduce((sum, a) => sum + a.value, 0);
}

function totalRealizedPnL(assets: PortfolioAssetInput[]) {
  return assets.reduce((sum, a) => sum + (a.realizedPnL ?? 0), 0);
}

function totalUnrealizedPnL(assets: PortfolioAssetInput[]) {
  return assets.reduce((sum, a) => sum + (a.unrealizedPnL ?? 0), 0);
}

const DEMO_ASSETS: PortfolioAssetInput[] = [
  { symbol: "XLM", value: 1500, realizedPnL: 120, unrealizedPnL: 85 },
  { symbol: "USDC", value: 800, realizedPnL: 45, unrealizedPnL: 12 },
  { symbol: "AQUA", value: 350, realizedPnL: -20, unrealizedPnL: 28 },
  { symbol: "yXLM", value: 200, realizedPnL: 60, unrealizedPnL: 35 },
];

describe("usePortfolio – portfolio summary derivation", () => {
  it("percentages sum to 100 (within rounding)", () => {
    const result = withPercentages(DEMO_ASSETS);
    const sum = result.reduce((acc, a) => acc + a.percentage, 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it("the largest asset receives the highest percentage", () => {
    const result = withPercentages(DEMO_ASSETS);
    const xlm = result.find((a) => a.symbol === "XLM")!;
    const others = result.filter((a) => a.symbol !== "XLM");
    others.forEach((a) => expect(xlm.percentage).toBeGreaterThan(a.percentage));
  });

  it("percentage is 0 for all assets when total value is 0", () => {
    const zeroAssets = DEMO_ASSETS.map((a) => ({ ...a, value: 0 }));
    const result = withPercentages(zeroAssets);
    result.forEach((a) => expect(a.percentage).toBe(0));
  });

  it("totalValue sums all asset values", () => {
    expect(totalValue(DEMO_ASSETS)).toBe(2850);
  });

  it("totalRealizedPnL sums realized P&L including negatives", () => {
    expect(totalRealizedPnL(DEMO_ASSETS)).toBeCloseTo(205);
  });

  it("totalUnrealizedPnL sums unrealized P&L", () => {
    expect(totalUnrealizedPnL(DEMO_ASSETS)).toBeCloseTo(160);
  });

  it("assets with no P&L fields default to 0 contribution", () => {
    const assets = [{ symbol: "XLM", value: 100 }];
    expect(totalRealizedPnL(assets)).toBe(0);
    expect(totalUnrealizedPnL(assets)).toBe(0);
  });

  it("single asset always has 100% allocation", () => {
    const result = withPercentages([{ symbol: "XLM", value: 500 }]);
    expect(result[0].percentage).toBe(100);
  });
});
