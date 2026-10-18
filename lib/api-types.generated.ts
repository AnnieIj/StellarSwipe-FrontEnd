/**
 * AUTO-GENERATED — do not edit by hand.
 * Re-generate with: npm run api:generate
 * Source: openapi.yaml
 */

export type SignalAction = "BUY" | "SELL" | "HOLD";

export type SignalStatus = "Active" | "Waiting" | "Closed";

export type QuoteFreshness = "fresh" | "stale" | "unavailable";

/** Price quote metadata. Missing values are null, never zero. */
export interface Quote {
  price: number | null;
  /** ISO 8601 date-time — when the price was observed */
  observedAt: string | null;
  source: string | null;
  freshness: QuoteFreshness;
}

export interface Signal {
  id: string;
  ticker: string;
  action: SignalAction;
  /** 0–100 */
  confidence: number;
  details: string;
  /** ISO 8601 date-time */
  timestamp: string;
  /** ISO 8601 date-time — when this signal expires */
  expiresAt?: string;
  provider?: string;
  status?: SignalStatus;
  quote: Quote;
}

export interface SignalFeedPage {
  items: Signal[];
  page: number;
  pageSize: number;
  total: number;
  nextPage: number | null;
  hasMore: boolean;
}

export interface SignalCursorPage {
  items: Signal[];
  pageSize: number;
  /** Number of signals matching the filters, across all pages. */
  total: number;
  /** Pass as `cursor` to fetch the next page; null on the last page. */
  nextCursor: string | null;
  hasMore: boolean;
}

export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "pending"
  | "cancelled"
  | "expired";

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
}

export interface SubscriptionsResponse {
  subscriptions: Subscription[];
}

export interface ErrorResponse {
  error: string;
}

/** Query parameters accepted by GET /api/signals */
export interface GetSignalsParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  action?: SignalAction;
  status?: SignalStatus;
  ticker?: string;
  provider?: string;
}

/** Query parameters accepted by GET /api/subscriptions */
export interface GetSubscriptionsParams {
  status?: SubscriptionStatus;
}
