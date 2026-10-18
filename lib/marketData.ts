/**
 * Market-data provider adapters.
 *
 * Each price source (exchange, oracle, aggregator) is wrapped in a
 * {@link MarketDataProvider} that maps its raw response into a normalized
 * {@link MarketQuote}. Domain code depends only on the interface, so sources
 * can be replaced, reordered, or combined with {@link withFallback}.
 */

export interface MarketQuote {
  /** Trading pair, e.g. "XLM/USDC". */
  pair: string;
  /** Price in the quote currency. Always finite and greater than zero. */
  price: number;
  /** Epoch milliseconds at which the source observed the price. */
  timestamp: number;
  /** Name of the provider that produced this quote. */
  source: string;
}

export interface MarketDataProvider {
  readonly name: string;
  getQuote(pair: string): Promise<MarketQuote>;
}

export interface RawQuote {
  price: number;
  /** Epoch milliseconds. */
  timestamp: number;
}

/**
 * Validates a raw quote and returns it as a {@link MarketQuote}.
 * Throws on non-finite or non-positive prices and non-finite timestamps so
 * that bad data from one source is treated as a failure and can fall back.
 */
export function normalizeQuote(
  pair: string,
  source: string,
  raw: RawQuote,
): MarketQuote {
  if (!Number.isFinite(raw.price) || raw.price <= 0) {
    throw new Error(`${source} returned an invalid price for ${pair}`);
  }
  if (!Number.isFinite(raw.timestamp)) {
    throw new Error(`${source} returned an invalid timestamp for ${pair}`);
  }
  return { pair, price: raw.price, timestamp: raw.timestamp, source };
}

export interface HttpProviderOptions {
  name: string;
  buildUrl: (pair: string) => string;
  /** Maps the parsed JSON body of the response into a raw price and timestamp. */
  parse: (body: unknown, pair: string) => RawQuote;
  /** Request timeout in milliseconds. Defaults to 5000. */
  timeoutMs?: number;
}

/** Creates a provider that fetches JSON quotes over HTTP. */
export function createHttpProvider(
  options: HttpProviderOptions,
): MarketDataProvider {
  const { name, buildUrl, parse, timeoutMs = 5000 } = options;
  return {
    name,
    async getQuote(pair) {
      const res = await fetch(buildUrl(pair), {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        throw new Error(`${name} responded with status ${res.status}`);
      }
      const body: unknown = await res.json();
      return normalizeQuote(pair, name, parse(body, pair));
    },
  };
}

/**
 * Selects providers from a registry by name, preserving the order given.
 * Use this to make provider choice and priority configurable.
 */
export function selectProviders(
  registry: Record<string, MarketDataProvider>,
  names: readonly string[],
): MarketDataProvider[] {
  return names.map((name) => {
    const provider = registry[name];
    if (!provider) {
      throw new Error(`Unknown market-data provider: ${name}`);
    }
    return provider;
  });
}

/**
 * Combines providers into one that tries each in order and returns the first
 * successful quote. If every provider fails, throws an AggregateError with
 * the individual failures.
 */
export function withFallback(
  providers: readonly MarketDataProvider[],
  name = "fallback",
): MarketDataProvider {
  if (providers.length === 0) {
    throw new Error("withFallback requires at least one provider");
  }
  return {
    name,
    async getQuote(pair) {
      const errors: unknown[] = [];
      for (const provider of providers) {
        try {
          return await provider.getQuote(pair);
        } catch (error) {
          errors.push(error);
        }
      }
      throw new AggregateError(
        errors,
        `All market-data providers failed for ${pair}`,
      );
    },
  };
}
