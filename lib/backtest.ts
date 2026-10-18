export type BacktestParams = {
  from: string;
  to: string;
  signals: string[];
  slippageBps?: number;
  feeBps?: number;
};

export type BacktestResult = {
  totalReturn: number;
  winRate: number;
  maxDrawdown: number;
  trades: Array<{ time: string; pnl: number }>;
};

export async function runBacktest(
  params: BacktestParams
): Promise<BacktestResult> {
  // Placeholder: implement historical price fetching and simulation engine
  await new Promise((r) => setTimeout(r, 500));
  return {
    totalReturn: 0,
    winRate: 0,
    maxDrawdown: 0,
    trades: [],
  };
}
