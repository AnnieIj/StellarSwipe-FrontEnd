import {
  assignCategory,
  autoCategorize,
  buildReviewQueue,
  getManuallyResolved,
  resolveCategory,
  type CategoryAssignment,
} from "@/lib/taxCategorization";
import type { TaxableTransaction } from "@/lib/taxUtils";

const base: TaxableTransaction = {
  id: "tx-trade",
  assetPair: "XLM/USDC",
  amount: 10,
  buyPrice: 1,
  sellPrice: 1.1,
  fee: 0,
  timestamp: new Date(2025, 0, 1).getTime(),
  source: { type: "COPY_TRADE", hash: "hash-1" },
};
const manual: TaxableTransaction = {
  ...base,
  id: "tx-manual",
  source: { type: "MANUAL", hash: "hash-2" },
};

describe("tax categorization review queue", () => {
  it("auto-categorizes trades and leaves manual records uncategorized", () => {
    expect(autoCategorize(base)).toBe("trade");
    expect(autoCategorize(manual)).toBeNull();
  });

  it("lists uncategorized transactions with their source details", () => {
    const queue = buildReviewQueue([base, manual], {});
    expect(queue).toHaveLength(1);
    expect(queue[0].transaction.id).toBe("tx-manual");
    expect(queue[0].transaction.source).toEqual({ type: "MANUAL", hash: "hash-2" });
    expect(queue[0].leftUnresolved).toBe(false);
  });

  it("keeps records left unresolved in the queue, flagged as such", () => {
    const assignments = assignCategory({}, "tx-manual", "unresolved");
    const queue = buildReviewQueue([base, manual], assignments);
    expect(queue).toHaveLength(1);
    expect(queue[0].leftUnresolved).toBe(true);
    expect(resolveCategory(manual, assignments)).toBeNull();
  });

  it("removes resolved records from the queue and keeps them visible for review", () => {
    const assignments = assignCategory({}, "tx-manual", "staking-reward");
    expect(buildReviewQueue([base, manual], assignments)).toHaveLength(0);
    expect(getManuallyResolved([base, manual], assignments)).toEqual([
      { transaction: manual, category: "staking-reward" },
    ]);
    expect(resolveCategory(manual, assignments)).toBe("staking-reward");
  });

  it("returns a resolved record to the queue when reset to unresolved", () => {
    let assignments = assignCategory({}, "tx-manual", "income");
    assignments = assignCategory(assignments, "tx-manual", "unresolved");
    expect(buildReviewQueue([manual], assignments)).toHaveLength(1);
  });

  it("rejects unsupported categories", () => {
    expect(() =>
      assignCategory({}, "tx-manual", "gift" as unknown as CategoryAssignment)
    ).toThrow(/Unsupported/);
  });
});
