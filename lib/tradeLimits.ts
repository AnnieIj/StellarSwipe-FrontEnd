/**
 * Server-side trade limit checks.
 *
 * The frontend checks in TradeModal are advisory only. Every trade request is
 * revalidated here before it is allowed to reach transaction submission.
 */

import { z } from "zod";

/** Hard slippage ceiling. The UI warns above 1% but must never allow more than this. */
export const MAX_SLIPPAGE_PERCENT = 3;

export const TRADE_ERROR_CODES = {
  INVALID_REQUEST: "INVALID_REQUEST",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  INVALID_PRICE: "INVALID_PRICE",
  SLIPPAGE_OUT_OF_BOUNDS: "SLIPPAGE_OUT_OF_BOUNDS",
  NETWORK_MISMATCH: "NETWORK_MISMATCH",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  BALANCE_UNAVAILABLE: "BALANCE_UNAVAILABLE",
} as const;

export type TradeErrorCode =
  (typeof TRADE_ERROR_CODES)[keyof typeof TRADE_ERROR_CODES];

const TRADE_ERROR_STATUS: Record<TradeErrorCode, number> = {
  INVALID_REQUEST: 400,
  INVALID_AMOUNT: 400,
  INVALID_PRICE: 400,
  SLIPPAGE_OUT_OF_BOUNDS: 422,
  NETWORK_MISMATCH: 409,
  INSUFFICIENT_BALANCE: 422,
  BALANCE_UNAVAILABLE: 503,
};

export interface TradeRejection {
  code: TradeErrorCode;
  message: string;
  status: number;
}

export const tradeRequestSchema = z.object({
  publicKey: z.string().min(1),
  network: z.string().min(1),
  orderType: z.enum(["LIMIT", "MARKET"]),
  amount: z.string().trim().min(1),
  price: z.number(),
  slippagePercent: z.number(),
});

export type TradeRequest = z.infer<typeof tradeRequestSchema>;

export function rejectTrade(
  code: TradeErrorCode,
  message: string
): TradeRejection {
  return { code, message, status: TRADE_ERROR_STATUS[code] };
}

/**
 * Checks amount, price, slippage, and network against the app's configured
 * network. Returns the first rejection, or `null` when the order may proceed.
 */
export function checkTradeLimits(
  order: TradeRequest,
  appNetwork: string
): TradeRejection | null {
  const amount = Number(order.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return rejectTrade(
      TRADE_ERROR_CODES.INVALID_AMOUNT,
      "Amount must be a number greater than 0."
    );
  }

  if (!Number.isFinite(order.price) || order.price <= 0) {
    return rejectTrade(
      TRADE_ERROR_CODES.INVALID_PRICE,
      "Price must be a number greater than 0."
    );
  }

  if (
    !Number.isFinite(order.slippagePercent) ||
    order.slippagePercent < 0 ||
    order.slippagePercent > MAX_SLIPPAGE_PERCENT
  ) {
    return rejectTrade(
      TRADE_ERROR_CODES.SLIPPAGE_OUT_OF_BOUNDS,
      `Slippage must be between 0% and ${MAX_SLIPPAGE_PERCENT}%.`
    );
  }

  if (order.network.toUpperCase() !== appNetwork.toUpperCase()) {
    return rejectTrade(
      TRADE_ERROR_CODES.NETWORK_MISMATCH,
      `Wallet is on ${order.network} but the app expects ${appNetwork}.`
    );
  }

  return null;
}

/**
 * Checks the order total against the balance fetched from the chain at
 * execution time. The client-supplied wallet balance is never used here.
 */
export function checkAvailableBalance(
  order: TradeRequest,
  availableBalance: number
): TradeRejection | null {
  const total = order.price * Number(order.amount);
  if (total > availableBalance) {
    return rejectTrade(
      TRADE_ERROR_CODES.INSUFFICIENT_BALANCE,
      "Insufficient balance for this order."
    );
  }

  return null;
}
