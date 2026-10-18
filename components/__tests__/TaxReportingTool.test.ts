import {
  computeGainLoss,
  isLongTermHolding,
  computeTaxReport,
  exportToCsv,
  exportToCsvWithPreset,
  formatForTurboTax,
  formatForTaxAct,
  TAX_RATES,
  LONG_TERM_THRESHOLD_DAYS,
  CSV_PRESETS,
  type TaxableTransaction,
} from "@/lib/taxUtils";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const BASE_TIMESTAMP = new Date(2025, 0, 15).getTime();

const SAMPLE_TRANSACTIONS: TaxableTransaction[] = [
  {
    id: "tx-1",
    assetPair: "XLM/USDC",
    amount: 100,
    buyPrice: 0.4,
    sellPrice: 0.5,
    fee: 0.001,
    timestamp: BASE_TIMESTAMP,
    acquisitionDate: BASE_TIMESTAMP - 90 * MS_PER_DAY,
  },
  {
    id: "tx-2",
    assetPair: "AQUA/XLM",
    amount: 200,
    buyPrice: 0.15,
    sellPrice: 0.12,
    fee: 0.0005,
    timestamp: BASE_TIMESTAMP + MS_PER_DAY,
    acquisitionDate: BASE_TIMESTAMP - 400 * MS_PER_DAY,
  },
  {
    id: "tx-3",
    assetPair: "USDC/XLM",
    amount: 50,
    buyPrice: 1.0,
    sellPrice: 1.05,
    fee: 0.0002,
    timestamp: new Date(2024, 5, 1).getTime(),
    acquisitionDate: new Date(2023, 0, 1).getTime(),
  },
];

describe("computeGainLoss", () => {
  it("returns positive gain when sell > buy", () => {
    expect(computeGainLoss(0.4, 0.5, 100, 0)).toBeCloseTo(10);
  });

  it("returns negative gain when sell < buy", () => {
    expect(computeGainLoss(0.15, 0.12, 200, 0)).toBeCloseTo(-6);
  });

  it("deducts fee from proceeds", () => {
    const gainWithoutFee = computeGainLoss(1, 2, 10, 0);
    const gainWithFee = computeGainLoss(1, 2, 10, 1);
    expect(gainWithFee).toBeLessThan(gainWithoutFee);
    expect(gainWithFee).toBeCloseTo(gainWithoutFee - 1);
  });

  it("defaults fee to 0 when omitted", () => {
    expect(computeGainLoss(1, 2, 10)).toBeCloseTo(10);
  });

  it("returns 0 when buy and sell prices are equal with no fee", () => {
    expect(computeGainLoss(1, 1, 50)).toBe(0);
  });
});

describe("isLongTermHolding", () => {
  it("returns true when held for exactly 365 days", () => {
    const acquisition = BASE_TIMESTAMP - LONG_TERM_THRESHOLD_DAYS * MS_PER_DAY;
    expect(isLongTermHolding(acquisition, BASE_TIMESTAMP)).toBe(true);
  });

  it("returns false when held for less than 365 days", () => {
    const acquisition = BASE_TIMESTAMP - 90 * MS_PER_DAY;
    expect(isLongTermHolding(acquisition, BASE_TIMESTAMP)).toBe(false);
  });

  it("returns true when held for more than 365 days", () => {
    const acquisition = BASE_TIMESTAMP - 400 * MS_PER_DAY;
    expect(isLongTermHolding(acquisition, BASE_TIMESTAMP)).toBe(true);
  });
});

describe("TAX_RATES", () => {
  it("defines rates for all four jurisdictions", () => {
    expect(TAX_RATES.US).toBeDefined();
    expect(TAX_RATES.UK).toBeDefined();
    expect(TAX_RATES.EU).toBeDefined();
    expect(TAX_RATES.CA).toBeDefined();
  });

  it("US short-term rate is higher than long-term rate", () => {
    expect(TAX_RATES.US.shortTerm).toBeGreaterThan(TAX_RATES.US.longTerm);
  });

  it("CA long-term rate is half of short-term (50% inclusion rule)", () => {
    expect(TAX_RATES.CA.longTerm).toBeCloseTo(TAX_RATES.CA.shortTerm / 2);
  });
});

describe("computeTaxReport", () => {
  it("filters transactions to the specified year", () => {
    const report2025 = computeTaxReport(SAMPLE_TRANSACTIONS, 2025, "US");
    expect(report2025.entries.length).toBe(2);

    const report2024 = computeTaxReport(SAMPLE_TRANSACTIONS, 2024, "US");
    expect(report2024.entries.length).toBe(1);
  });

  it("correctly identifies short-term vs long-term trades", () => {
    const report = computeTaxReport(SAMPLE_TRANSACTIONS, 2025, "US");
    const shortEntry = report.entries.find((e) => e.id === "tx-1");
    const longEntry = report.entries.find((e) => e.id === "tx-2");

    expect(shortEntry?.isLongTerm).toBe(false);
    expect(longEntry?.isLongTerm).toBe(true);
  });

  it("computes shortTermGains and longTermLosses correctly", () => {
    const report = computeTaxReport(SAMPLE_TRANSACTIONS, 2025, "US");
    expect(report.shortTermGains).toBeGreaterThan(0);
    expect(report.longTermLosses).toBeGreaterThan(0);
    expect(report.longTermGains).toBe(0);
    expect(report.shortTermLosses).toBe(0);
  });

  it("sums fees correctly", () => {
    const report = computeTaxReport(SAMPLE_TRANSACTIONS, 2025, "US");
    expect(report.totalFees).toBeCloseTo(0.001 + 0.0005);
  });

  it("computes estimated tax liability using jurisdiction rates", () => {
    const reportUS = computeTaxReport(SAMPLE_TRANSACTIONS, 2025, "US");
    const reportEU = computeTaxReport(SAMPLE_TRANSACTIONS, 2025, "EU");
    expect(reportUS.estimatedTaxLiability).not.toBe(
      reportEU.estimatedTaxLiability
    );
  });

  it("returns zero liability when there are no taxable events", () => {
    const report = computeTaxReport([], 2025, "US");
    expect(report.estimatedTaxLiability).toBe(0);
    expect(report.entries.length).toBe(0);
  });

  it("does not apply long-term rate to short-term gains", () => {
    const shortOnlyTx: TaxableTransaction[] = [
      {
        id: "s1",
        assetPair: "XLM/USDC",
        amount: 100,
        buyPrice: 1,
        sellPrice: 2,
        fee: 0,
        timestamp: BASE_TIMESTAMP,
        acquisitionDate: BASE_TIMESTAMP - 30 * MS_PER_DAY,
      },
    ];
    const report = computeTaxReport(shortOnlyTx, 2025, "US");
    expect(report.estimatedTaxLiability).toBeCloseTo(
      100 * TAX_RATES.US.shortTerm
    );
  });
});

describe("exportToCsv", () => {
  it("includes a header row", () => {
    const report = computeTaxReport(SAMPLE_TRANSACTIONS, 2025, "US");
    const csv = exportToCsv(report);
    const firstLine = csv.split("\n")[0];
    expect(firstLine).toContain("Date");
    expect(firstLine).toContain("Asset Pair");
    expect(firstLine).toContain("Gain/Loss");
  });

  it("produces one data row per entry", () => {
    const report = computeTaxReport(SAMPLE_TRANSACTIONS, 2025, "US");
    const csv = exportToCsv(report);
    const lines = csv.split("\n");
    expect(lines.length).toBe(report.entries.length + 1);
  });

  it("returns only a header for an empty report", () => {
    const report = computeTaxReport([], 2025, "US");
    const csv = exportToCsv(report);
    expect(csv.split("\n").length).toBe(1);
  });
});

describe("formatForTurboTax", () => {
  it("starts with V042 header", () => {
    const report = computeTaxReport(SAMPLE_TRANSACTIONS, 2025, "US");
    const txf = formatForTurboTax(report);
    expect(txf.startsWith("V042")).toBe(true);
  });

  it("contains asset pair names", () => {
    const report = computeTaxReport(SAMPLE_TRANSACTIONS, 2025, "US");
    const txf = formatForTurboTax(report);
    expect(txf).toContain("XLM/USDC");
  });
});

describe("formatForTaxAct", () => {
  it("includes a header row with Description column", () => {
    const report = computeTaxReport(SAMPLE_TRANSACTIONS, 2025, "US");
    const csv = formatForTaxAct(report);
    expect(csv.split("\n")[0]).toContain("Description");
  });

  it("produces correct number of rows", () => {
    const report = computeTaxReport(SAMPLE_TRANSACTIONS, 2025, "US");
    const csv = formatForTaxAct(report);
    expect(csv.split("\n").length).toBe(report.entries.length + 1);
  });
});

describe("exportToCsvWithPreset", () => {
  const report = computeTaxReport(SAMPLE_TRANSACTIONS, 2025, "US");

  it("generic preset has correct column headers in order", () => {
    const csv = exportToCsvWithPreset(report, "generic");
    const headers = csv.split("\n")[0].replace(/"/g, "").split(",");
    expect(headers).toEqual(CSV_PRESETS.generic.headers);
  });

  it("cointracker preset has correct column headers in order", () => {
    const csv = exportToCsvWithPreset(report, "cointracker");
    const headers = csv.split("\n")[0].replace(/"/g, "").split(",");
    expect(headers).toEqual(CSV_PRESETS.cointracker.headers);
    expect(headers[0]).toBe("Date");
    expect(headers[1]).toBe("Received Quantity");
  });

  it("koinly preset has correct column headers in order", () => {
    const csv = exportToCsvWithPreset(report, "koinly");
    const headers = csv.split("\n")[0].replace(/"/g, "").split(",");
    expect(headers).toEqual(CSV_PRESETS.koinly.headers);
    expect(headers[0]).toBe("Date");
    expect(headers[1]).toBe("Sent Amount");
  });

  it("each preset produces one data row per entry", () => {
    const presets = ["generic", "cointracker", "koinly"] as const;
    for (const preset of presets) {
      const csv = exportToCsvWithPreset(report, preset);
      const lines = csv.split("\n");
      expect(lines.length).toBe(report.entries.length + 1);
    }
  });

  it("different presets produce different column layouts", () => {
    const generic = exportToCsvWithPreset(report, "generic").split("\n")[0];
    const cointracker = exportToCsvWithPreset(report, "cointracker").split(
      "\n"
    )[0];
    const koinly = exportToCsvWithPreset(report, "koinly").split("\n")[0];
    expect(generic).not.toBe(cointracker);
    expect(generic).not.toBe(koinly);
    expect(cointracker).not.toBe(koinly);
  });

  it("defaults to generic when no preset specified (exportToCsv parity)", () => {
    const withDefault = exportToCsvWithPreset(report);
    const legacy = exportToCsv(report);
    expect(withDefault).toBe(legacy);
  });

  it("underlying transaction data is unchanged across presets", () => {
    const parseProceeds = (csv: string, colIndex: number) =>
      csv
        .split("\n")
        .slice(1)
        .map((row) => row.split(",")[colIndex].replace(/"/g, ""));

    // generic: proceeds at index 4, cointracker: received quantity at index 1
    const genericProceeds = parseProceeds(
      exportToCsvWithPreset(report, "generic"),
      4
    );
    const cointrackerProceeds = parseProceeds(
      exportToCsvWithPreset(report, "cointracker"),
      1
    );
    expect(genericProceeds).toEqual(cointrackerProceeds);
  });
});
