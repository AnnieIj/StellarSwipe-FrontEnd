/**
 * Trade Execution Speed Optimization Service (#165)
 * - Request queuing for burst trades
 * - Caching for exchange rates and balances
 * - Network call batching
 * - Execution time measurement
 */

export interface TradeRequest {
  /** Caller-supplied unique identifier; reuse it on retries to dedupe */
  id: string;
  /** Authenticated user that owns this trade intent */
  userId: string;
  signalId: string;
  asset: string;
  direction: "BUY" | "SELL";
  amount: number;
  slippageTolerance: number;
}

export interface TradeResult {
  id: string;
  success: boolean;
  txHash?: string;
  executionTimeMs: number;
  slippage?: number;
  error?: string;
}

export interface ExecutionEstimate {
  estimatedTimeMs: number;
  currentSlippage: number;
  queueDepth: number;
}

/** Thrown when an existing intent id is reused with different trade parameters */
export class TradeIntentConflictError extends Error {
  constructor(public readonly intentId: string) {
    super(`Trade intent "${intentId}" was already submitted with different parameters`);
    this.name = "TradeIntentConflictError";
  }
}

interface TradeIntent {
  /** Canonical trade parameters, used to detect conflicting retries */
  fingerprint: string;
  /** Shared by every submission of this intent, so retries never re-queue */
  result: Promise<TradeResult>;
}

// Simple TTL cache
class TTLCache<V> {
  private store = new Map<string, { value: V; expiresAt: number }>();

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V, ttlMs: number) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  clear() {
    this.store.clear();
  }
}

class TradeExecutionService {
  private queue: Array<{
    request: TradeRequest;
    resolve: (r: TradeResult) => void;
    reject: (e: Error) => void;
  }> = [];
  private processing = false;
  // Keyed by `${userId}:${id}` so intents are scoped to their owner
  private intents = new Map<string, TradeIntent>();
  private cache = new TTLCache<unknown>();
  private readonly RATE_CACHE_TTL = 10_000; // 10s
  private readonly BALANCE_CACHE_TTL = 5_000; // 5s
  private readonly EXECUTION_TIMEOUT_MS = 8_000;

  /** Get a cached exchange rate or fetch it */
  async getExchangeRate(pair: string): Promise<number> {
    const cacheKey = `rate:${pair}`;
    const cached = this.cache.get(cacheKey) as number | undefined;
    if (cached !== undefined) return cached;

    // Simulate network call (replace with real Horizon/Soroban call)
    const rate = await this.fetchExchangeRate(pair);
    this.cache.set(cacheKey, rate, this.RATE_CACHE_TTL);
    return rate;
  }

  /** Get a cached balance */
  async getBalance(address: string, asset: string): Promise<number> {
    const cacheKey = `balance:${address}:${asset}`;
    const cached = this.cache.get(cacheKey) as number | undefined;
    if (cached !== undefined) return cached;

    const balance = await this.fetchBalance(address, asset);
    this.cache.set(cacheKey, balance, this.BALANCE_CACHE_TTL);
    return balance;
  }

  /**
   * Enqueue a trade request as an idempotent intent.
   * A repeat of the same user + id returns the original intent's result
   * (including while it is still in flight); reusing the id with different
   * parameters is rejected with {@link TradeIntentConflictError}.
   */
  enqueue(request: TradeRequest): Promise<TradeResult> {
    const key = `${request.userId}:${request.id}`;
    const fingerprint = JSON.stringify([
      request.signalId,
      request.asset,
      request.direction,
      request.amount,
      request.slippageTolerance,
    ]);

    const existing = this.intents.get(key);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        return Promise.reject(new TradeIntentConflictError(request.id));
      }
      return existing.result;
    }

    const result = new Promise<TradeResult>((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      if (!this.processing) this.processQueue();
    });
    this.intents.set(key, { fingerprint, result });
    return result;
  }

  /** Current queue depth and estimated execution time */
  getEstimate(slippage: number): ExecutionEstimate {
    return {
      estimatedTimeMs: Math.min(500 + this.queue.length * 200, 2000),
      currentSlippage: slippage,
      queueDepth: this.queue.length,
    };
  }

  /** Measure execution time of any async fn */
  async measure<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; durationMs: number }> {
    const start = performance.now();
    const result = await fn();
    return { result, durationMs: Math.round(performance.now() - start) };
  }

  /** Invalidate cached balance after a trade */
  invalidateBalance(address: string, asset: string) {
    // TTLCache doesn't expose delete, so we just let it expire naturally
    // For immediate invalidation use a short TTL on next set
    this.cache.set(`balance:${address}:${asset}`, undefined, 0);
  }

  private async processQueue() {
    this.processing = true;
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      try {
        const result = await this.executeWithTimeout(item.request);
        item.resolve(result);
      } catch (err) {
        item.reject(err as Error);
      }
    }
    this.processing = false;
  }

  private async executeWithTimeout(
    request: TradeRequest
  ): Promise<TradeResult> {
    const start = performance.now();
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Trade execution timeout")),
        this.EXECUTION_TIMEOUT_MS
      )
    );

    try {
      const result = await Promise.race([this.executeTrade(request), timeout]);
      return {
        ...result,
        executionTimeMs: Math.round(performance.now() - start),
      };
    } catch (err) {
      return {
        id: request.id,
        success: false,
        executionTimeMs: Math.round(performance.now() - start),
        error: (err as Error).message,
      };
    }
  }

  private async executeTrade(
    request: TradeRequest
  ): Promise<Omit<TradeResult, "executionTimeMs">> {
    // Prefetch rate in parallel with any other needed data
    const [rate] = await Promise.all([this.getExchangeRate(request.asset)]);

    // Simulate blockchain submission (replace with stellar-sdk call)
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));

    return {
      id: request.id,
      success: true,
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      slippage: Math.random() * request.slippageTolerance,
    };
  }

  private async fetchExchangeRate(_pair: string): Promise<number> {
    // Replace with actual Horizon/Soroban RPC call
    await new Promise((r) => setTimeout(r, 50));
    return 0.1 + Math.random() * 0.05;
  }

  private async fetchBalance(
    _address: string,
    _asset: string
  ): Promise<number> {
    // Replace with actual Horizon account fetch
    await new Promise((r) => setTimeout(r, 50));
    return 1000 + Math.random() * 500;
  }
}

export const tradeExecutionService = new TradeExecutionService();
