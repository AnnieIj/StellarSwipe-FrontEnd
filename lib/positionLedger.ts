/**
 * Position ledger (#971)
 *
 * Position quantity, cost basis and realized P&L are derived by replaying
 * confirmed executions (fills and fees), never from client-side estimates.
 *
 * Cost-basis rule: weighted average cost.
 * - BUY: the fill's fee is capitalized into cost basis.
 *   cost += quantity * price + fee; quantity += quantity.
 * - SELL (partial or full close): cost relieved = averageCost * quantity.
 *   proceeds = quantity * price - fee; realizedPnL = proceeds - cost relieved.
 *   The remaining quantity keeps the same average cost.
 * - Fees recorded separately against a fill are applied with that fill.
 *
 * Ledger entries are append-only and never mutated; a position is a pure
 * function of the entries, so multi-fill outcomes can be reconciled by replay.
 */

export type FillSide = "BUY" | "SELL";

export interface FillEntry {
  readonly kind: "FILL";
  readonly id: string;
  readonly symbol: string;
  readonly side: FillSide;
  readonly quantity: number;
  readonly price: number;
  readonly timestamp: number;
}

export interface FeeEntry {
  readonly kind: "FEE";
  readonly fillId: string;
  readonly amount: number;
  readonly timestamp: number;
}

export type LedgerEntry = FillEntry | FeeEntry;

/** Realized result of one sell fill, allocated by the average cost rule. */
export interface RealizedClose {
  readonly fillId: string;
  readonly quantity: number;
  readonly costBasisRelieved: number;
  readonly proceeds: number;
  readonly realizedPnL: number;
}

export interface PositionSnapshot {
  readonly symbol: string;
  readonly quantity: number;
  readonly costBasis: number;
  readonly averageCost: number;
  readonly realizedPnL: number;
  readonly closes: readonly RealizedClose[];
}

/** Tolerance for float sums so a fully closed position reads as zero. */
const QUANTITY_EPSILON = 1e-9;

/**
 * Replays ledger entries in order and returns the resulting position.
 * Throws if a sell exceeds the open quantity (shorting is not modelled).
 */
export function replayLedger(
  symbol: string,
  entries: readonly LedgerEntry[]
): PositionSnapshot {
  const feesByFill = new Map<string, number>();
  for (const entry of entries) {
    if (entry.kind === "FEE") {
      feesByFill.set(
        entry.fillId,
        (feesByFill.get(entry.fillId) ?? 0) + entry.amount
      );
    }
  }

  let quantity = 0;
  let costBasis = 0;
  let realizedPnL = 0;
  const closes: RealizedClose[] = [];

  for (const entry of entries) {
    if (entry.kind !== "FILL" || entry.symbol !== symbol) continue;

    if (entry.quantity <= 0) {
      throw new Error(`Fill ${entry.id} must have a positive quantity`);
    }

    const fee = feesByFill.get(entry.id) ?? 0;

    if (entry.side === "BUY") {
      quantity += entry.quantity;
      costBasis += entry.quantity * entry.price + fee;
      continue;
    }

    if (entry.quantity > quantity + QUANTITY_EPSILON) {
      throw new Error(
        `Sell fill ${entry.id} (${entry.quantity}) exceeds open quantity (${quantity}) for ${symbol}`
      );
    }

    const averageCost = costBasis / quantity;
    const costBasisRelieved = averageCost * entry.quantity;
    const proceeds = entry.quantity * entry.price - fee;
    const realized = proceeds - costBasisRelieved;

    quantity -= entry.quantity;
    costBasis -= costBasisRelieved;
    realizedPnL += realized;
    closes.push({
      fillId: entry.id,
      quantity: entry.quantity,
      costBasisRelieved,
      proceeds,
      realizedPnL: realized,
    });

    if (quantity <= QUANTITY_EPSILON) {
      quantity = 0;
      costBasis = 0;
    }
  }

  return {
    symbol,
    quantity,
    costBasis,
    averageCost: quantity > 0 ? costBasis / quantity : 0,
    realizedPnL,
    closes,
  };
}

/** Unrealized P&L of an open position at a mark price. */
export function unrealizedPnL(
  position: PositionSnapshot,
  markPrice: number
): number {
  return position.quantity * markPrice - position.costBasis;
}
