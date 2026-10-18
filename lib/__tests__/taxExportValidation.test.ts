import { validateTaxExport } from "@/lib/taxExportValidation";
import type { TaxableTransaction } from "@/lib/taxUtils";

const TS = new Date(2025, 2, 10).getTime();

const valid: TaxableTransaction = {
  id: "tx-ok",
  assetPair: "XLM/USDC",
  amount: 100,
  buyPrice: 0.4,
  sellPrice: 0.5,
  fee: 0.001,
  timestamp: TS,
  acquisitionDate: TS - 1000,
  source: { type: "COPY_TRADE", hash: "abc" },
};

describe("validateTaxExport", () => {
  it("reports period and transaction count for a clean export", () => {
    const result = validateTaxExport({
      transactions: [valid, { ...valid, id: "tx-old", timestamp: new Date(2023, 1, 1).getTime() }],
      years: [2025],
      jurisdiction: "US",
      format: "csv",
    });
    expect(result.period.label).toBe("1 Jan 2025 – 31 Dec 2025");
    expect(result.transactionCount).toBe(1);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.canDownload).toBe(true);
  });

  it("blocks downloads and identifies affected records for missing required data", () => {
    const result = validateTaxExport({
      transactions: [
        valid,
        { ...valid, id: "tx-no-amount", amount: Number.NaN },
        { ...valid, id: "tx-no-price", sellPrice: 0 },
        { ...valid, id: "tx-fx", foreignCurrency: "EUR", conversionRate: undefined },
      ],
      years: [2025],
      jurisdiction: "US",
      format: "csv",
    });
    expect(result.canDownload).toBe(false);
    const byCode = Object.fromEntries(result.errors.map((e) => [e.code, e.recordIds]));
    expect(byCode["invalid-amount"]).toEqual(["tx-no-amount"]);
    expect(byCode["invalid-price"]).toEqual(["tx-no-price"]);
    expect(byCode["missing-conversion-rate"]).toEqual(["tx-fx"]);
  });

  it("surfaces non-blocking warnings without preventing download", () => {
    const result = validateTaxExport({
      transactions: [
        { ...valid, id: "tx-no-acq", acquisitionDate: undefined },
        { ...valid, id: "tx-manual", source: { type: "MANUAL" } },
      ],
      years: [2025],
      jurisdiction: "UK",
      format: "turbotax",
    });
    expect(result.canDownload).toBe(true);
    const codes = result.warnings.map((w) => w.code);
    expect(codes).toEqual(
      expect.arrayContaining(["unsupported-format", "missing-acquisition-date", "uncategorized"])
    );
    expect(result.warnings.find((w) => w.code === "uncategorized")?.recordIds).toEqual([
      "tx-manual",
    ]);
  });

  it("clears the uncategorized warning once the record is assigned", () => {
    const result = validateTaxExport({
      transactions: [{ ...valid, id: "tx-manual", source: { type: "MANUAL" } }],
      years: [2025],
      jurisdiction: "US",
      format: "csv",
      assignments: { "tx-manual": "income" },
    });
    expect(result.warnings.map((w) => w.code)).not.toContain("uncategorized");
  });

  it("warns when the period is empty and spans multiple years", () => {
    const result = validateTaxExport({
      transactions: [],
      years: [2025, 2023],
      jurisdiction: "US",
      format: "multi-csv",
    });
    expect(result.period.label).toBe("1 Jan 2023 – 31 Dec 2025");
    expect(result.transactionCount).toBe(0);
    expect(result.warnings.map((w) => w.code)).toContain("empty-period");
    expect(result.canDownload).toBe(true);
  });
});
