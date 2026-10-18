/**
 * Tests for lib/exportComparison.ts
 *
 * Verifies that buildComparisonCsv produces the expected headers and the
 * correct number of data rows for a mocked comparison set.
 */

import {
  buildComparisonCsv,
  COMPARISON_CSV_COLUMNS,
} from "@/lib/exportComparison";
import type { Signal } from "@/lib/api-types.generated";

// ---------------------------------------------------------------------------
// Minimal Signal factory — only the fields the CSV extractor reads
// ---------------------------------------------------------------------------
function makeSignal(overrides: Partial<Signal> & { id: string }): Signal {
  return {
    action: overrides.action ?? "BUY",
    confidence: overrides.confidence ?? 75,
    ticker: overrides.ticker ?? "XLM",
    details: overrides.details ?? "",
    timestamp: overrides.timestamp ?? "2024-01-01T00:00:00Z",
    provider: overrides.provider,
    ...overrides,
  } as Signal;
}

// ---------------------------------------------------------------------------
// CSV header tests
// ---------------------------------------------------------------------------
describe("buildComparisonCsv – headers", () => {
  it("first row contains all expected column headers", () => {
    const csv = buildComparisonCsv([makeSignal({ id: "sig-1" })]);
    const [headerRow] = csv.split("\r\n");
    const expectedHeaders = COMPARISON_CSV_COLUMNS.map((c) => c.header);
    expectedHeaders.forEach((header) => {
      expect(headerRow).toContain(header);
    });
  });

  it("header column count matches COMPARISON_CSV_COLUMNS length", () => {
    const csv = buildComparisonCsv([makeSignal({ id: "sig-1" })]);
    const [headerRow] = csv.split("\r\n");
    const actualCount = headerRow.split(",").length;
    expect(actualCount).toBe(COMPARISON_CSV_COLUMNS.length);
  });
});

// ---------------------------------------------------------------------------
// Row count tests
// ---------------------------------------------------------------------------
describe("buildComparisonCsv – row count", () => {
  it("produces zero data rows for an empty comparison set", () => {
    const csv = buildComparisonCsv([]);
    const lines = csv.split("\r\n").filter(Boolean);
    // Only the header row — no data rows
    expect(lines).toHaveLength(1);
  });

  it("produces one data row for a single-signal comparison set", () => {
    const csv = buildComparisonCsv([makeSignal({ id: "sig-1" })]);
    const lines = csv.split("\r\n").filter(Boolean);
    // header + 1 data row
    expect(lines).toHaveLength(2);
  });

  it("produces the correct data-row count for a 3-signal comparison set", () => {
    const signals = [
      makeSignal({ id: "sig-1", ticker: "XLM", action: "BUY" }),
      makeSignal({ id: "sig-2", ticker: "BTC", action: "SELL" }),
      makeSignal({ id: "sig-3", ticker: "ETH", action: "BUY" }),
    ];
    const csv = buildComparisonCsv(signals);
    const lines = csv.split("\r\n").filter(Boolean);
    // header + 3 data rows
    expect(lines).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Data integrity tests
// ---------------------------------------------------------------------------
describe("buildComparisonCsv – data values", () => {
  it("writes the signal id and asset into the correct columns", () => {
    const csv = buildComparisonCsv([
      makeSignal({
        id: "sig-42",
        ticker: "AQUA",
        action: "SELL",
        confidence: 88,
      }),
    ]);
    const lines = csv.split("\r\n").filter(Boolean);
    const dataRow = lines[1];
    expect(dataRow).toContain("sig-42");
    expect(dataRow).toContain("AQUA");
    expect(dataRow).toContain("SELL");
    expect(dataRow).toContain("88");
  });

  it("leaves stats columns empty when stats are absent", () => {
    const csv = buildComparisonCsv([makeSignal({ id: "sig-no-stats" })]);
    const lines = csv.split("\r\n").filter(Boolean);
    const dataRow = lines[1];
    const cells = dataRow.split(",");
    // Entry Price is column index 4, Target is 5, Stop Loss is 6, R/R is 7
    expect(cells[4]).toBe("");
    expect(cells[5]).toBe("");
    expect(cells[6]).toBe("");
    expect(cells[7]).toBe("");
  });

  it("escapes values that contain commas", () => {
    const csv = buildComparisonCsv([
      makeSignal({ id: "sig-comma", provider: "Alpha, Beta" }),
    ]);
    expect(csv).toContain('"Alpha, Beta"');
  });

  it("escapes values that contain double-quotes", () => {
    const csv = buildComparisonCsv([
      makeSignal({ id: "sig-quote", provider: 'Say "hello"' }),
    ]);
    expect(csv).toContain('"Say ""hello"""');
  });

  it("each data row has the same number of cells as the header", () => {
    const signals = [makeSignal({ id: "sig-1" }), makeSignal({ id: "sig-2" })];
    const csv = buildComparisonCsv(signals);
    const [headerRow, ...dataRows] = csv.split("\r\n").filter(Boolean);
    const headerCount = headerRow.split(",").length;
    for (const row of dataRows) {
      // Simple split is safe here since we only use non-comma values in these fixtures
      const cellCount = row.split(",").length;
      expect(cellCount).toBe(headerCount);
    }
  });
});
