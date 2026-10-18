import type { PricePoint } from "@/hooks/usePriceHistory";

export interface PortfolioValuePoint {
  timestamp: number;
  value: number;
}

export interface BenchmarkSeries {
  portfolio: PortfolioValuePoint[];
  benchmark: PortfolioValuePoint[];
}

export function computeBenchmarkSeries(
  portfolioHistory: PortfolioValuePoint[],
  xlmHistory: PricePoint[],
  initialPortfolioValue: number
): BenchmarkSeries {
  if (portfolioHistory.length === 0 || xlmHistory.length === 0) {
    return { portfolio: [], benchmark: [] };
  }

  const sortedPortfolio = [...portfolioHistory].sort(
    (a, b) => a.timestamp - b.timestamp
  );
  const sortedXLM = [...xlmHistory].sort((a, b) => a.timestamp - b.timestamp);

  const benchmarkValues = sortedXLM.map((point) => {
    const startPrice = sortedXLM[0].price;
    const priceRatio = point.price / startPrice;
    return {
      timestamp: point.timestamp,
      value: parseFloat((initialPortfolioValue * priceRatio).toFixed(2)),
    };
  });

  return {
    portfolio: sortedPortfolio,
    benchmark: benchmarkValues,
  };
}

export function generateMockPortfolioHistory(
  initialValue: number,
  points: number,
  intervalMs: number
): PortfolioValuePoint[] {
  const history: PortfolioValuePoint[] = [];
  let value = initialValue;
  const now = Date.now();

  history.push({
    timestamp: now - (points - 1) * intervalMs,
    value: initialValue,
  });

  for (let i = 1; i < points; i++) {
    const delta = (Math.random() - 0.48) * 0.15;
    value = Math.max(0, value + delta * value);
    history.push({
      timestamp: now - (points - 1 - i) * intervalMs,
      value: parseFloat(value.toFixed(2)),
    });
  }

  return history;
}

export function computePerformanceDelta(
  portfolioHistory: PortfolioValuePoint[],
  xlmHistory: PricePoint[]
): {
  portfolioReturn: number;
  benchmarkReturn: number;
  outperformance: number;
} | null {
  if (portfolioHistory.length === 0 || xlmHistory.length === 0) {
    return null;
  }

  const sortedPortfolio = [...portfolioHistory].sort(
    (a, b) => a.timestamp - b.timestamp
  );
  const sortedXLM = [...xlmHistory].sort((a, b) => a.timestamp - b.timestamp);

  const startPortfolio = sortedPortfolio[0].value;
  const endPortfolio = sortedPortfolio[sortedPortfolio.length - 1].value;
  const startXLM = sortedXLM[0].price;
  const endXLM = sortedXLM[sortedXLM.length - 1].price;

  const portfolioReturn =
    ((endPortfolio - startPortfolio) / startPortfolio) * 100;
  const benchmarkReturn = ((endXLM - startXLM) / startXLM) * 100;

  return {
    portfolioReturn: parseFloat(portfolioReturn.toFixed(2)),
    benchmarkReturn: parseFloat(benchmarkReturn.toFixed(2)),
    outperformance: parseFloat((portfolioReturn - benchmarkReturn).toFixed(2)),
  };
}
