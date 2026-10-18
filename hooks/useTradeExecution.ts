"use client";

import { useState, useCallback, useRef } from "react";
import {
  tradeExecutionService,
  type TradeRequest,
  type TradeResult,
  type ExecutionEstimate,
} from "@/services/tradeExecutionService";

interface TradeExecutionState {
  isExecuting: boolean;
  result: TradeResult | null;
  error: string | null;
  executionTimeMs: number | null;
  estimate: ExecutionEstimate | null;
  liveSlippage: number;
}

/**
 * Hook for optimized trade execution (#165)
 * - Queues burst trades
 * - Tracks execution time
 * - Polls live slippage during execution
 * - Handles timeout with retry
 */
export function useTradeExecution() {
  const [state, setState] = useState<TradeExecutionState>({
    isExecuting: false,
    result: null,
    error: null,
    executionTimeMs: null,
    estimate: null,
    liveSlippage: 0,
  });

  const slippagePollRef = useRef<NodeJS.Timeout | null>(null);

  /** Pre-warm caches before user confirms trade */
  const preload = useCallback(async (asset: string, address: string) => {
    await Promise.all([
      tradeExecutionService.getExchangeRate(asset),
      tradeExecutionService.getBalance(address, asset),
    ]);
  }, []);

  const stopSlippagePoll = () => {
    if (slippagePollRef.current) {
      clearInterval(slippagePollRef.current);
      slippagePollRef.current = null;
    }
  };

  const executeTrade = useCallback(async (request: TradeRequest) => {
    const estimate = tradeExecutionService.getEstimate(
      request.slippageTolerance
    );
    setState((s) => ({
      ...s,
      isExecuting: true,
      error: null,
      result: null,
      estimate,
    }));

    // Poll slippage every 500ms during execution
    slippagePollRef.current = setInterval(async () => {
      const rate = await tradeExecutionService.getExchangeRate(request.asset);
      const slippage = Math.abs(rate - request.slippageTolerance) * 100;
      setState((s) => ({
        ...s,
        liveSlippage: parseFloat(slippage.toFixed(2)),
      }));
    }, 500);

    try {
      const result = await tradeExecutionService.enqueue(request);
      stopSlippagePoll();
      setState((s) => ({
        ...s,
        isExecuting: false,
        result,
        executionTimeMs: result.executionTimeMs,
        error: result.success ? null : result.error ?? "Trade failed",
      }));
      return result;
    } catch (err) {
      stopSlippagePoll();
      const message = (err as Error).message;
      setState((s) => ({ ...s, isExecuting: false, error: message }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    stopSlippagePoll();
    setState({
      isExecuting: false,
      result: null,
      error: null,
      executionTimeMs: null,
      estimate: null,
      liveSlippage: 0,
    });
  }, []);

  return { ...state, executeTrade, preload, reset };
}
