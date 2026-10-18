"use client";

import { useMemo } from "react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { type ComparisonGranularity } from "@/lib/comparison";

export interface PriorPeriodSnapshot {
  pnl: number | null;
  winRate: number | null;
  totalTrades: number | null;
  granularity: ComparisonGranularity;
  capturedAt: Date;
}

/**
 * Hook that derives period-over-period comparison metrics from the portfolio store.
 *
 * Features:
 * - Gets current P&L, win rate, and total trades from the portfolio store
 * - Falls back to deterministic demo prior-period values (keyed by granularity)
 * - Supports optional external prior snapshot for real API integration
 * - Returns `isDemo` flag for UI badge display
 *
 * @param priorSnapshot Optional external prior period data (from API)
 * @returns Object containing current metrics, prior metrics, and metadata
 */
export function usePeriodComparison(priorSnapshot?: PriorPeriodSnapshot) {
  const { totalRealizedPnL, totalUnrealizedPnL, totalValue, assets } = usePortfolioStore();

  // Calculate current period metrics
  const currentPnl = totalRealizedPnL + totalUnrealizedPnL;
  const currentWinRate = useMemo(() => {
    // Simplified win rate calculation - in a real app this would come from trade history
    const winningTrades = assets.filter(a => (a.realizedPnL ?? 0) > 0).length;
    const totalTrades = assets.length;
    return totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  }, [assets]);
  const currentTotalTrades = assets.length;

  // If external prior snapshot is provided, use it
  if (priorSnapshot) {
    return {
      pnl: currentPnl,
      winRate: currentWinRate,
      totalTrades: currentTotalTrades,
      priorPnl: priorSnapshot.pnl,
      priorWinRate: priorSnapshot.winRate,
      priorTotalTrades: priorSnapshot.totalTrades,
      isDemo: false,
    };
  }

  // Fallback to deterministic demo prior values based on granularity
  // In a real implementation, this would fetch from an API endpoint
  const getDemoPriorValues = (granularity: ComparisonGranularity = "month") => {
    const baseValues = {
      pnl: currentPnl * 0.8, // 20% increase from prior
      winRate: Math.max(0, currentWinRate * 0.9), // 10% improvement from prior
      totalTrades: Math.max(1, currentTotalTrades - 2), // 2 more trades than prior
    };

    // Adjust demo values based on granularity for realism
    switch (granularity) {
      case "week":
        return {
          pnl: currentPnl * 0.95, // 5% increase from prior week
          winRate: Math.max(0, currentWinRate * 0.98), // 2% improvement
          totalTrades: Math.max(1, currentTotalTrades - 1), // 1 more trade
        };
      case "quarter":
        return {
          pnl: currentPnl * 0.7, // 30% increase from prior quarter
          winRate: Math.max(0, currentWinRate * 0.85), // 15% improvement
          totalTrades: Math.max(1, currentTotalTrades - 5), // 5 more trades
        };
      case "year":
        return {
          pnl: currentPnl * 0.6, // 40% increase from prior year
          winRate: Math.max(0, currentWinRate * 0.8), // 20% improvement
          totalTrades: Math.max(1, currentTotalTrades - 10), // 10 more trades
        };
      default: // month
        return baseValues;
    }
  };

  // Default to month granularity for demo
  const demoPrior = getDemoPriorValues("month");

  return {
    pnl: currentPnl,
    winRate: currentWinRate,
    totalTrades: currentTotalTrades,
    priorPnl: demoPrior.pnl,
    priorWinRate: demoPrior.winRate,
    priorTotalTrades: demoPrior.totalTrades,
    isDemo: true,
  };
}