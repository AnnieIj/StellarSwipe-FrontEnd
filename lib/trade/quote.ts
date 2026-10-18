export type QuoteStatus = "valid" | "expired";

export interface TradeQuote {
  id: string;
  amount: string;
  fromAsset: string;
  toAsset: string;
  rate: string;
  expiresAt: number;
  status: QuoteStatus;
}

export interface QuoteReviewState {
  quote: TradeQuote | null;
  expired: boolean;
  canConfirm: boolean;
  message: string;
  refreshing: boolean;
  refreshError: string | null;
}

export type QuoteFetcher = (amount: string) => Promise<TradeQuote>;

export function isQuoteExpired(quote: TradeQuote, now: number = Date.now()): boolean {
  return quote.status === "expired" || quote.expiresAt <= now;
}

export function buildReviewState(
  quote: TradeQuote | null,
  options: { now?: number; refreshing?: boolean; refreshError?: string | null } = {},
): QuoteReviewState {
  const now = options.now ?? Date.now();
  const refreshing = options.refreshing ?? false;
  const refreshError = options.refreshError ?? null;

  if (!quote) {
    return {
      quote: null,
      expired: false,
      canConfirm: false,
      message: "Fetch a quote to review this trade.",
      refreshing,
      refreshError,
    };
  }

  const expired = isQuoteExpired(quote, now);

  if (expired) {
    return {
      quote,
      expired: true,
      canConfirm: false,
      message: "This quote has expired. Refresh to get a new quote before confirming.",
      refreshing,
      refreshError,
    };
  }

  return {
    quote,
    expired: false,
    canConfirm: !refreshing,
    message: "Quote is valid. Review the details and confirm when ready.",
    refreshing,
    refreshError,
  };
}

export interface RefreshQuoteResult {
  state: QuoteReviewState;
  quote: TradeQuote | null;
  error: string | null;
}

/**
 * Refreshes an expired quote while preserving the entered trade amount.
 * On failure the previous amount is retained and retry feedback is exposed.
 */
export async function refreshQuote(
  previous: TradeQuote | null,
  amount: string,
  fetcher: QuoteFetcher,
  now: number = Date.now(),
): Promise<RefreshQuoteResult> {
  const preservedAmount = amount || previous?.amount || "";

  try {
    const fresh = await fetcher(preservedAmount);
    const state = buildReviewState(fresh, { now });
    return { state, quote: fresh, error: null };
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Unable to refresh the quote. Please try again.";

    const fallbackQuote: TradeQuote | null = previous
      ? { ...previous, amount: preservedAmount, status: "expired" }
      : null;

    const state = buildReviewState(fallbackQuote, {
      now,
      refreshError: message,
    });

    return { state, quote: fallbackQuote, error: message };
  }
}
