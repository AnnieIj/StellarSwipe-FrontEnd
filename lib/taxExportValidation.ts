import type { TaxJurisdiction, TaxableTransaction } from "@/lib/taxUtils";
import {
  type CategoryAssignments,
  resolveCategory,
} from "@/lib/taxCategorization";

// ---------------------------------------------------------------------------
// Export preview validation (#893)
// ---------------------------------------------------------------------------

export type TaxExportFormat = "csv" | "pdf" | "turbotax" | "taxact" | "multi-csv";

export type ValidationSeverity = "error" | "warning";

export interface TaxExportIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  /** IDs of the transactions the issue applies to (empty for export-wide issues). */
  recordIds: string[];
}

export interface TaxExportValidation {
  period: { start: Date; end: Date; label: string };
  transactionCount: number;
  errors: TaxExportIssue[];
  warnings: TaxExportIssue[];
  /** False when any blocking error exists — the download must not run. */
  canDownload: boolean;
}

export interface ValidateTaxExportInput {
  transactions: TaxableTransaction[];
  years: number[];
  jurisdiction: TaxJurisdiction;
  format: TaxExportFormat;
  assignments?: CategoryAssignments;
}

const isPositiveNumber = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

function pushIssue(
  list: TaxExportIssue[],
  severity: ValidationSeverity,
  code: string,
  ids: string[],
  describe: (count: number) => string
) {
  if (ids.length === 0) return;
  list.push({ code, severity, message: describe(ids.length), recordIds: ids });
}

const records = (n: number) => `${n} record${n === 1 ? "" : "s"}`;

/**
 * Validates the transactions that would be included in a tax export so the
 * preview can show warnings and block downloads that would produce an
 * invalid file.
 */
export function validateTaxExport({
  transactions,
  years,
  jurisdiction,
  format,
  assignments = {},
}: ValidateTaxExportInput): TaxExportValidation {
  const sortedYears = [...years].sort((a, b) => a - b);
  const firstYear = sortedYears[0] ?? new Date().getFullYear();
  const lastYear = sortedYears[sortedYears.length - 1] ?? firstYear;
  const start = new Date(firstYear, 0, 1);
  const end = new Date(lastYear, 11, 31);
  const label =
    firstYear === lastYear
      ? `1 Jan ${firstYear} – 31 Dec ${firstYear}`
      : `1 Jan ${firstYear} – 31 Dec ${lastYear}`;

  const yearSet = new Set(sortedYears);
  const inPeriod = transactions.filter(
    (tx) =>
      Number.isFinite(tx.timestamp) &&
      yearSet.has(new Date(tx.timestamp).getFullYear())
  );

  const errors: TaxExportIssue[] = [];
  const warnings: TaxExportIssue[] = [];

  pushIssue(
    errors,
    "error",
    "missing-asset",
    inPeriod.filter((tx) => !tx.assetPair?.trim()).map((tx) => tx.id),
    (n) => `${records(n)} missing an asset pair.`
  );
  pushIssue(
    errors,
    "error",
    "invalid-amount",
    inPeriod.filter((tx) => !isPositiveNumber(tx.amount)).map((tx) => tx.id),
    (n) => `${records(n)} with a missing or invalid amount.`
  );
  pushIssue(
    errors,
    "error",
    "invalid-price",
    inPeriod
      .filter((tx) => !isPositiveNumber(tx.buyPrice) || !isPositiveNumber(tx.sellPrice))
      .map((tx) => tx.id),
    (n) => `${records(n)} missing a cost basis or sale price.`
  );
  pushIssue(
    errors,
    "error",
    "missing-conversion-rate",
    inPeriod
      .filter((tx) => tx.foreignCurrency && !isPositiveNumber(tx.conversionRate))
      .map((tx) => tx.id),
    (n) => `${records(n)} in a foreign currency without a conversion rate.`
  );

  if (format === "turbotax" && jurisdiction !== "US") {
    warnings.push({
      code: "unsupported-format",
      severity: "warning",
      message: `TurboTax files are intended for US returns; ${jurisdiction} values may not import correctly.`,
      recordIds: [],
    });
  }
  if (inPeriod.length === 0) {
    warnings.push({
      code: "empty-period",
      severity: "warning",
      message: "No transactions fall in this period — the file will only contain headers.",
      recordIds: [],
    });
  }
  pushIssue(
    warnings,
    "warning",
    "missing-acquisition-date",
    inPeriod.filter((tx) => tx.acquisitionDate == null).map((tx) => tx.id),
    (n) => `${records(n)} without an acquisition date will be treated as short-term.`
  );
  pushIssue(
    warnings,
    "warning",
    "uncategorized",
    inPeriod.filter((tx) => resolveCategory(tx, assignments) === null).map((tx) => tx.id),
    (n) => `${records(n)} still uncategorized — review them before filing.`
  );

  return {
    period: { start, end, label },
    transactionCount: inPeriod.length,
    errors,
    warnings,
    canDownload: errors.length === 0,
  };
}
