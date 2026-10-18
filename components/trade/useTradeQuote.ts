import { useCallback, useEffect, useRef, useState } from 'react';

export type TradeQuote = {
  id: string;
  amount: string;
  expiresAt: number;
  [key: string]: unknown;
};

export type QuoteStatus = 'idle' | 'loading' | 'ready' | 'expired' | 'refreshing' | 'error';

export type UseTradeQuoteOptions = {
  fetchQuote: (amount: string) => Promise<TradeQuote>;
  initialAmount?: string;
};

export type UseTradeQuoteResult = {
  amount: string;
  setAmount: (amount: string) => void;
  quote: TradeQuote | null;
  status: QuoteStatus;
  error: string | null;
  isExpired: boolean;
  canConfirm: boolean;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
};

function isQuoteExpired(quote: TradeQuote | null): boolean {
  if (!quote) return false;
  return Date.now() >= quote.expiresAt;
}

export function useTradeQuote({ fetchQuote, initialAmount = '' }: UseTradeQuoteOptions): UseTradeQuoteResult {
  const [amount, setAmountState] = useState(initialAmount);
  const [quote, setQuote] = useState<TradeQuote | null>(null);
  const [status, setStatus] = useState<QuoteStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef(amount);

  const setAmount = useCallback((next: string) => {
    amountRef.current = next;
    setAmountState(next);
  }, []);

  const loadQuote = useCallback(
    async (nextStatus: QuoteStatus) => {
      const requestedAmount = amountRef.current;
      setStatus(nextStatus);
      setError(null);
      try {
        const nextQuote = await fetchQuote(requestedAmount);
        setQuote(nextQuote);
        setStatus('ready');
      } catch (err) {
        // Preserve the entered amount so the user can retry without re-entering it.
        setAmountState(requestedAmount);
        amountRef.current = requestedAmount;
        setError(err instanceof Error ? err.message : 'Unable to refresh quote. Please try again.');
        setStatus('error');
      }
    },
    [fetchQuote],
  );

  const refresh = useCallback(async () => {
    await loadQuote('refreshing');
  }, [loadQuote]);

  const retry = useCallback(async () => {
    await loadQuote('refreshing');
  }, [loadQuote]);

  useEffect(() => {
    if (!quote) return;
    const remaining = quote.expiresAt - Date.now();
    if (remaining <= 0) {
      setStatus('expired');
      return;
    }
    const timer = setTimeout(() => setStatus('expired'), remaining);
    return () => clearTimeout(timer);
  }, [quote]);

  const isExpired = status === 'expired' || isQuoteExpired(quote);
  const canConfirm = status === 'ready' && !isExpired && quote !== null;

  return {
    amount,
    setAmount,
    quote,
    status: isExpired && status === 'ready' ? 'expired' : status,
    error,
    isExpired,
    canConfirm,
    refresh,
    retry,
  };
}
