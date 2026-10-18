/**
 * Market quote push gateway (#966)
 * - Authenticated clients subscribe to supported asset pairs only
 * - Quotes are normalized and tagged with freshness metadata before fan-out
 * - Subscriptions are dropped on disconnect
 *
 * Transport-agnostic core: a NestJS `@WebSocketGateway` should delegate its
 * `@SubscribeMessage` / `handleDisconnect` handlers to this class.
 */

export const SUPPORTED_QUOTE_ASSETS = [
  "XLM/USDC",
  "USDC/XLM",
  "BTC/XLM",
  "BTC/USDC",
  "AQUA/XLM",
  "AQUA/USDC",
] as const;

export type QuoteAsset = (typeof SUPPORTED_QUOTE_ASSETS)[number];

/** Stellar amounts carry at most 7 decimal places. */
const PRICE_DECIMALS = 7;

/** Quotes older than this are flagged as stale (5 seconds). */
export const QUOTE_STALE_AFTER_MS = 5_000;

export interface RawMarketQuote {
  asset: string;
  price: number;
  /** Source timestamp in epoch milliseconds. */
  timestamp: number;
}

export interface MarketQuoteUpdate {
  asset: QuoteAsset;
  price: number;
  /** ISO-8601 time the source quote was produced. */
  updatedAt: string;
  /** Age of the quote when it was pushed, in milliseconds. */
  ageMs: number;
  stale: boolean;
}

export type QuoteSender = (update: MarketQuoteUpdate) => void;

export type Authenticate = (token: string) => string | null;

interface ClientSession {
  userId: string;
  assets: Set<QuoteAsset>;
  send: QuoteSender;
}

export function isSupportedQuoteAsset(asset: string): asset is QuoteAsset {
  return (SUPPORTED_QUOTE_ASSETS as readonly string[]).includes(asset);
}

/** Returns a normalized update, or null when the quote is unusable. */
export function normalizeQuote(
  raw: RawMarketQuote,
  now = Date.now()
): MarketQuoteUpdate | null {
  if (!isSupportedQuoteAsset(raw.asset)) return null;
  if (!Number.isFinite(raw.price) || raw.price <= 0) return null;
  if (!Number.isFinite(raw.timestamp)) return null;

  const ageMs = Math.max(0, now - raw.timestamp);
  return {
    asset: raw.asset,
    price: Number(raw.price.toFixed(PRICE_DECIMALS)),
    updatedAt: new Date(raw.timestamp).toISOString(),
    ageMs,
    stale: ageMs > QUOTE_STALE_AFTER_MS,
  };
}

export class MarketQuoteGateway {
  private sessions = new Map<string, ClientSession>();

  constructor(private authenticate: Authenticate) {}

  /** Registers a connection. Unauthenticated connections are refused. */
  handleConnection(clientId: string, token: string, send: QuoteSender): boolean {
    const userId = this.authenticate(token);
    if (!userId) return false;
    this.sessions.set(clientId, { userId, assets: new Set(), send });
    return true;
  }

  /** Subscribes to the supported assets in `assets`; rejects everything else. */
  subscribe(
    clientId: string,
    assets: string[]
  ): { accepted: QuoteAsset[]; rejected: string[] } {
    const session = this.sessions.get(clientId);
    const accepted: QuoteAsset[] = [];
    const rejected: string[] = [];
    if (!session) return { accepted, rejected: [...assets] };

    for (const asset of assets) {
      if (isSupportedQuoteAsset(asset)) {
        session.assets.add(asset);
        accepted.push(asset);
      } else {
        rejected.push(asset);
      }
    }
    return { accepted, rejected };
  }

  unsubscribe(clientId: string, assets: string[]): void {
    const session = this.sessions.get(clientId);
    if (!session) return;
    for (const asset of assets) {
      session.assets.delete(asset as QuoteAsset);
    }
  }

  /** Removes all state for a disconnected client. */
  handleDisconnect(clientId: string): void {
    this.sessions.delete(clientId);
  }

  /** Normalizes a raw quote and pushes it to every subscriber of that asset. */
  publish(raw: RawMarketQuote, now = Date.now()): number {
    const update = normalizeQuote(raw, now);
    if (!update) return 0;

    let delivered = 0;
    for (const session of this.sessions.values()) {
      if (session.assets.has(update.asset)) {
        session.send(update);
        delivered++;
      }
    }
    return delivered;
  }

  /** Number of connected, authenticated clients. */
  get clientCount(): number {
    return this.sessions.size;
  }
}
