import type { TaxableTransaction } from "@/lib/taxUtils";

// ---------------------------------------------------------------------------
// Review queue for uncategorized tax transactions (#894)
// ---------------------------------------------------------------------------

export const TAX_CATEGORIES = [
  "trade",
  "income",
  "staking-reward",
  "airdrop",
  "transfer",
  "fee",
] as const;

export type TaxCategory = (typeof TAX_CATEGORIES)[number];

export const TAX_CATEGORY_LABELS: Record<TaxCategory, string> = {
  trade: "Trade (capital gain/loss)",
  income: "Income",
  "staking-reward": "Staking reward",
  airdrop: "Airdrop",
  transfer: "Transfer (non-taxable)",
  fee: "Fee",
};

/** A user's decision for a record: a supported category, or explicitly left unresolved. */
export type CategoryAssignment = TaxCategory | "unresolved";

export type CategoryAssignments = Record<string, CategoryAssignment>;

export function isTaxCategory(value: unknown): value is TaxCategory {
  return (
    typeof value === "string" &&
    (TAX_CATEGORIES as readonly string[]).includes(value)
  );
}

/**
 * Automatic categorization. Copy trades and swaps with complete pricing are
 * treated as trades; anything else (manual entries, missing prices) needs a
 * human decision and returns `null`.
 */
export function autoCategorize(tx: TaxableTransaction): TaxCategory | null {
  const type = tx.source?.type;
  const hasPricing =
    Number.isFinite(tx.buyPrice) &&
    Number.isFinite(tx.sellPrice) &&
    tx.sellPrice > 0;
  if ((type === "COPY_TRADE" || type === "SWAP") && hasPricing) return "trade";
  if (type === undefined && hasPricing) return "trade";
  return null;
}

/** The effective category of a record after automatic and manual categorization. */
export function resolveCategory(
  tx: TaxableTransaction,
  assignments: CategoryAssignments
): TaxCategory | null {
  const assigned = assignments[tx.id];
  if (isTaxCategory(assigned)) return assigned;
  return autoCategorize(tx);
}

export interface ReviewQueueItem {
  transaction: TaxableTransaction;
  /** True when the user explicitly chose to leave the record unresolved. */
  leftUnresolved: boolean;
}

/** Records that still need a category — resolved records leave the queue. */
export function buildReviewQueue(
  transactions: TaxableTransaction[],
  assignments: CategoryAssignments
): ReviewQueueItem[] {
  return transactions
    .filter((tx) => resolveCategory(tx, assignments) === null)
    .map((tx) => ({
      transaction: tx,
      leftUnresolved: assignments[tx.id] === "unresolved",
    }));
}

/** Records the user categorized manually; they stay visible in report review. */
export function getManuallyResolved(
  transactions: TaxableTransaction[],
  assignments: CategoryAssignments
): { transaction: TaxableTransaction; category: TaxCategory }[] {
  return transactions.flatMap((tx) => {
    const assigned = assignments[tx.id];
    return isTaxCategory(assigned) && autoCategorize(tx) === null
      ? [{ transaction: tx, category: assigned }]
      : [];
  });
}

export function assignCategory(
  assignments: CategoryAssignments,
  id: string,
  assignment: CategoryAssignment
): CategoryAssignments {
  if (assignment !== "unresolved" && !isTaxCategory(assignment)) {
    throw new Error(`Unsupported tax category: ${String(assignment)}`);
  }
  return { ...assignments, [id]: assignment };
}
