import {
  computeBenchmarkSeries,
  generateMockPortfolioHistory,
  computePerformanceDelta,
  type PortfolioValuePoint,
} from "@/lib/benchmark";
import type { PricePoint } from "@/hooks/usePriceHistory";

describe("computeBenchmarkSeries", () => {
  const mockXLMHistory: PricePoint[] = [
    { timestamp: 0, price: 0.4 },
    { timestamp: 1, price: 0.45 },
    { timestamp: 2, price: 0.5 },
    { timestamp: 3, price: 0.55 },
  ];

  it("returns empty arrays when portfolio history is empty", () => {
    const result = computeBenchmarkSeries([], mockXLMHistory, 1000);
    expect(result.portfolio).toEqual([]);
    expect(result.benchmark).toEqual([]);
  });

  it("returns empty arrays when XLM history is empty", () => {
    const portfolioHistory: PortfolioValuePoint[] = [
      { timestamp: 0, value: 1000 },
    ];
    const result = computeBenchmarkSeries(portfolioHistory, [], 1000);
    expect(result.portfolio).toEqual([]);
    expect(result.benchmark).toEqual([]);
  });

  it("computes benchmark series scaled to initial portfolio value", () => {
    const portfolioHistory: PortfolioValuePoint[] = [
      { timestamp: 0, value: 1000 },
      { timestamp: 1, value: 1100 },
      { timestamp: 2, value: 1200 },
      { timestamp: 3, value: 1250 },
    ];

    const result = computeBenchmarkSeries(
      portfolioHistory,
      mockXLMHistory,
      1000
    );

    expect(result.benchmark.length).toBe(4);
    expect(result.benchmark[0].value).toBeCloseTo(1000);
    expect(result.benchmark[3].value).toBeCloseTo(1375);
  });

  it("sorts portfolio history by timestamp", () => {
    const unsortedPortfolio: PortfolioValuePoint[] = [
      { timestamp: 3, value: 1250 },
      { timestamp: 0, value: 1000 },
      { timestamp: 2, value: 1200 },
      { timestamp: 1, value: 1100 },
    ];

    const result = computeBenchmarkSeries(
      unsortedPortfolio,
      mockXLMHistory,
      1000
    );

    expect(result.portfolio[0].timestamp).toBe(0);
    expect(result.portfolio[3].timestamp).toBe(3);
  });

  it("correctly scales XLM prices relative to initial value", () => {
    const xlmHistory: PricePoint[] = [
      { timestamp: 0, price: 1.0 },
      { timestamp: 1, price: 2.0 },
      { timestamp: 2, price: 1.5 },
    ];

    const portfolioHistory: PortfolioValuePoint[] = [
      { timestamp: 0, value: 500 },
      { timestamp: 1, value: 500 },
      { timestamp: 2, value: 500 },
    ];

    const result = computeBenchmarkSeries(portfolioHistory, xlmHistory, 500);

    expect(result.benchmark[0].value).toBeCloseTo(500);
    expect(result.benchmark[1].value).toBeCloseTo(1000);
    expect(result.benchmark[2].value).toBeCloseTo(750);
  });
});

describe("generateMockPortfolioHistory", () => {
  it("generates correct number of points", () => {
    const history = generateMockPortfolioHistory(1000, 30, 86400000);
    expect(history.length).toBe(30);
  });

  it("starts at initial value", () => {
    const history = generateMockPortfolioHistory(1000, 10, 86400000);
    expect(history[0].value).toBeCloseTo(1000, 0);
  });

  it("generates timestamps in correct intervals", () => {
    const history = generateMockPortfolioHistory(1000, 3, 86400000);
    const interval = history[1].timestamp - history[0].timestamp;
    expect(interval).toBeCloseTo(86400000, -3);
  });
});

describe("computePerformanceDelta", () => {
  it("returns null when portfolio history is empty", () => {
    const xlmHistory: PricePoint[] = [{ timestamp: 0, price: 1.0 }];
    const result = computePerformanceDelta([], xlmHistory);
    expect(result).toBeNull();
  });

  it("returns null when XLM history is empty", () => {
    const portfolioHistory: PortfolioValuePoint[] = [
      { timestamp: 0, value: 1000 },
    ];
    const result = computePerformanceDelta(portfolioHistory, []);
    expect(result).toBeNull();
  });

  it("calculates correct returns for portfolio and benchmark", () => {
    const portfolioHistory: PortfolioValuePoint[] = [
      { timestamp: 0, value: 1000 },
      { timestamp: 1, value: 1200 },
    ];

    const xlmHistory: PricePoint[] = [
      { timestamp: 0, price: 0.4 },
      { timestamp: 1, price: 0.5 },
    ];

    const result = computePerformanceDelta(portfolioHistory, xlmHistory);

    expect(result?.portfolioReturn).toBeCloseTo(20);
    expect(result?.benchmarkReturn).toBeCloseTo(25);
    expect(result?.outperformance).toBeCloseTo(-5);
  });

  it("calculates outperformance correctly", () => {
    const portfolioHistory: PortfolioValuePoint[] = [
      { timestamp: 0, value: 1000 },
      { timestamp: 1, value: 1500 },
    ];

    const xlmHistory: PricePoint[] = [
      { timestamp: 0, price: 0.4 },
      { timestamp: 1, price: 0.45 },
    ];

    const result = computePerformanceDelta(portfolioHistory, xlmHistory);

    expect(result?.portfolioReturn).toBeCloseTo(50);
    expect(result?.benchmarkReturn).toBeCloseTo(12.5);
    expect(result?.outperformance).toBeCloseTo(37.5);
  });

  it("handles negative returns correctly", () => {
    const portfolioHistory: PortfolioValuePoint[] = [
      { timestamp: 0, value: 1000 },
      { timestamp: 1, value: 800 },
    ];

    const xlmHistory: PricePoint[] = [
      { timestamp: 0, price: 0.5 },
      { timestamp: 1, price: 0.4 },
    ];

    const result = computePerformanceDelta(portfolioHistory, xlmHistory);

    expect(result?.portfolioReturn).toBeCloseTo(-20);
    expect(result?.benchmarkReturn).toBeCloseTo(-20);
    expect(result?.outperformance).toBeCloseTo(0);
  });
});
