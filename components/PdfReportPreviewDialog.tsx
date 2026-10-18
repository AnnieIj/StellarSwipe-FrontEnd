"use client";

import { useCallback, useEffect, useId, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TAX_RATES, type TaxReport } from "@/lib/taxUtils";

/** Report options that persist across preview sessions (owned by the caller). */
export interface PdfReportOptions {
  includeSummary: boolean;
  includeRates: boolean;
  includeTransactions: boolean;
  branding: "full" | "minimal" | "none";
  customTitle: string;
  orientation: "portrait" | "landscape";
}

export const DEFAULT_PDF_REPORT_OPTIONS: PdfReportOptions = {
  includeSummary: true,
  includeRates: true,
  includeTransactions: true,
  branding: "full",
  customTitle: "",
  orientation: "portrait",
};

interface PdfReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: TaxReport;
  options: PdfReportOptions;
  onOptionsChange: (options: PdfReportOptions) => void;
  /** Active filter summary from the report form, e.g. tax year and jurisdiction. */
  filters: { label: string; value: string }[];
  /** Closes the dialog and returns focus to the report filters. */
  onEditFilters: () => void;
  /** Produces the PDF. May throw or reject; failures are shown with recovery actions. */
  onGenerate: (options: PdfReportOptions) => Promise<void> | void;
}

type Step = "options" | "preview";
type PreviewState = "loading" | "ready" | "error";
type GenerateState = "idle" | "generating" | "error";

const PREVIEW_ROW_LIMIT = 8;

function formatMoney(value: number): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function reportDateRange(year: number): { start: Date; end: Date } {
  const start = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const today = new Date();
  return { start, end: yearEnd > today ? today : yearEnd };
}

/**
 * In-app preview of the generated PDF (#781). Users configure sections and
 * branding, review a scaled page mock that mirrors the selected filters and
 * date range, then download. Options live in the caller so "Edit options" or
 * closing the dialog never loses selections.
 */
export function PdfReportPreviewDialog({
  open,
  onOpenChange,
  report,
  options,
  onOptionsChange,
  filters,
  onEditFilters,
  onGenerate,
}: PdfReportPreviewDialogProps) {
  const [step, setStep] = useState<Step>("options");
  const [previewState, setPreviewState] = useState<PreviewState>("loading");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [generateState, setGenerateState] = useState<GenerateState>("idle");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const titleFieldId = useId();

  useEffect(() => {
    if (open) {
      setStep("options");
      setGenerateState("idle");
      setGenerateError(null);
    }
  }, [open]);

  const buildPreview = useCallback(async () => {
    setPreviewState("loading");
    setPreviewError(null);
    try {
      // Let the loading state paint before laying out the page mock.
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (!report || !Array.isArray(report.entries)) {
        throw new Error("Report data is not available.");
      }
      setPreviewState("ready");
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "The preview could not be built.");
      setPreviewState("error");
    }
  }, [report]);

  useEffect(() => {
    if (open && step === "preview") void buildPreview();
  }, [open, step, buildPreview]);

  function update<K extends keyof PdfReportOptions>(key: K, value: PdfReportOptions[K]) {
    onOptionsChange({ ...options, [key]: value });
  }

  const noSections = !options.includeSummary && !options.includeRates && !options.includeTransactions;

  async function generate() {
    setGenerateState("generating");
    setGenerateError(null);
    try {
      await onGenerate(options);
      setGenerateState("idle");
      onOpenChange(false);
    } catch (err) {
      setGenerateError(
        err instanceof Error && err.message ? err.message : "The PDF could not be generated."
      );
      setGenerateState("error");
    }
  }

  const { start, end } = reportDateRange(report.year);
  const dateLabel = `${start.toLocaleDateString(undefined, { dateStyle: "medium" })} – ${end.toLocaleDateString(undefined, { dateStyle: "medium" })}`;
  const title =
    options.customTitle.trim() || `Tax Report ${report.year} — ${report.jurisdiction}`;
  const rates = TAX_RATES[report.jurisdiction];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-4 overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText size={18} aria-hidden="true" />
            {step === "options" ? "PDF report options" : "Preview PDF report"}
          </DialogTitle>
          <DialogDescription>
            {step === "options"
              ? "Choose what the PDF includes, then preview it before downloading."
              : "This is how your report will be laid out. Go back to change anything before downloading."}
          </DialogDescription>
        </DialogHeader>

        {/* Active filters are always visible so the user knows what is being exported */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {filters.map((f) => (
            <span
              key={f.label}
              className="rounded-full border border-border bg-background px-2 py-0.5 text-foreground"
            >
              <span className="text-foreground-muted">{f.label}:</span> {f.value}
            </span>
          ))}
          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-foreground">
            <span className="text-foreground-muted">Date range:</span> {dateLabel}
          </span>
          <button
            type="button"
            onClick={onEditFilters}
            className="text-xs text-blue-400 underline underline-offset-2 hover:text-blue-300"
          >
            Change filters
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {step === "options" ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <fieldset className="space-y-2 text-sm">
                <legend className="mb-2 font-medium text-foreground">Sections</legend>
                {(
                  [
                    ["includeSummary", "Gains & losses summary"],
                    ["includeRates", "Applied tax rates"],
                    ["includeTransactions", "Transaction detail"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-foreground">
                    <input
                      type="checkbox"
                      checked={options[key]}
                      onChange={(e) => update(key, e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
                {noSections && (
                  <p role="alert" className="text-xs text-amber-400">
                    Select at least one section to preview.
                  </p>
                )}
              </fieldset>

              <fieldset className="space-y-2 text-sm">
                <legend className="mb-2 font-medium text-foreground">Branding</legend>
                {(
                  [
                    ["full", "StellarSwipe logo and footer"],
                    ["minimal", "Name only"],
                    ["none", "No branding"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-foreground">
                    <input
                      type="radio"
                      name="pdf-branding"
                      checked={options.branding === value}
                      onChange={() => update("branding", value)}
                    />
                    {label}
                  </label>
                ))}
              </fieldset>

              <label htmlFor={titleFieldId} className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Report title (optional)</span>
                <input
                  id={titleFieldId}
                  type="text"
                  maxLength={80}
                  value={options.customTitle}
                  onChange={(e) => update("customTitle", e.target.value)}
                  placeholder={`Tax Report ${report.year} — ${report.jurisdiction}`}
                  className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                />
              </label>

              <fieldset className="space-y-2 text-sm">
                <legend className="mb-2 font-medium text-foreground">Orientation</legend>
                {(["portrait", "landscape"] as const).map((value) => (
                  <label key={value} className="flex items-center gap-2 capitalize text-foreground">
                    <input
                      type="radio"
                      name="pdf-orientation"
                      checked={options.orientation === value}
                      onChange={() => update("orientation", value)}
                    />
                    {value}
                  </label>
                ))}
              </fieldset>
            </div>
          ) : previewState === "loading" ? (
            <div
              role="status"
              className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-foreground-muted"
            >
              <Loader2 size={20} className="animate-spin" aria-hidden="true" />
              Building preview…
            </div>
          ) : previewState === "error" ? (
            <div
              role="alert"
              className="flex h-64 flex-col items-center justify-center gap-3 rounded-md border border-red-500/40 bg-red-500/10 p-4 text-center text-sm"
            >
              <AlertTriangle size={20} className="text-red-400" aria-hidden="true" />
              <p className="text-foreground">We couldn&apos;t build the preview.</p>
              {previewError && <p className="text-xs text-foreground-muted">{previewError}</p>}
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => void buildPreview()} className="gap-1.5">
                  <RefreshCw size={13} aria-hidden="true" />
                  Try again
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setStep("options")} className="gap-1.5">
                  <SlidersHorizontal size={13} aria-hidden="true" />
                  Edit options
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md bg-slate-200 p-2 sm:p-4 dark:bg-slate-800">
              <article
                aria-label={`Preview of ${title}`}
                className={cn(
                  "mx-auto w-full bg-white p-4 text-slate-900 shadow-md sm:p-8",
                  options.orientation === "portrait"
                    ? "max-w-[595px] sm:aspect-[1/1.414]"
                    : "max-w-[842px] sm:aspect-[1.414/1]"
                )}
              >
                {options.branding !== "none" && (
                  <header className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      {options.branding === "full" && (
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-[10px] font-bold text-white"
                          aria-hidden="true"
                        >
                          SS
                        </span>
                      )}
                      <span className="text-sm font-semibold">StellarSwipe</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Generated {new Date().toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </span>
                  </header>
                )}

                <h3 className="break-words text-base font-bold sm:text-lg">{title}</h3>
                <p className="mb-4 text-[11px] text-slate-600">
                  {rates.label} ({report.jurisdiction}) · {dateLabel}
                </p>

                {options.includeSummary && (
                  <section className="mb-4">
                    <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Summary
                    </h4>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-3">
                      {[
                        ["Short-term gains", report.shortTermGains],
                        ["Long-term gains", report.longTermGains],
                        ["Short-term losses", -report.shortTermLosses],
                        ["Long-term losses", -report.longTermLosses],
                        ["Total fees", report.totalFees],
                        ["Net gain / loss", report.totalGainLoss],
                      ].map(([label, value]) => (
                        <div key={label as string}>
                          <dt className="text-slate-500">{label}</dt>
                          <dd className="font-mono font-medium">{formatMoney(value as number)}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-2 text-[11px]">
                      Estimated tax liability:{" "}
                      <span className="font-mono font-semibold">
                        {formatMoney(report.estimatedTaxLiability)}
                      </span>
                    </p>
                  </section>
                )}

                {options.includeRates && (
                  <section className="mb-4">
                    <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Applied rates
                    </h4>
                    <p className="text-[11px]">
                      Short-term {(rates.shortTerm * 100).toFixed(1)}% · Long-term{" "}
                      {(rates.longTerm * 100).toFixed(1)}%
                    </p>
                  </section>
                )}

                {options.includeTransactions && (
                  <section className="mb-4">
                    <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Transactions ({report.entries.length})
                    </h4>
                    {report.entries.length === 0 ? (
                      <p className="text-[11px] text-slate-500">
                        No taxable transactions in this period.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[360px] text-left text-[10px]">
                          <thead className="border-b border-slate-200 text-slate-500">
                            <tr>
                              <th className="py-1 pr-2 font-medium">Date</th>
                              <th className="py-1 pr-2 font-medium">Pair</th>
                              <th className="py-1 pr-2 font-medium">Term</th>
                              <th className="py-1 text-right font-medium">Gain / loss</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.entries.slice(0, PREVIEW_ROW_LIMIT).map((e) => (
                              <tr key={e.id} className="border-b border-slate-100">
                                <td className="py-1 pr-2">
                                  {new Date(e.date).toLocaleDateString(undefined, { dateStyle: "short" })}
                                </td>
                                <td className="py-1 pr-2">{e.assetPair}</td>
                                <td className="py-1 pr-2">{e.isLongTerm ? "Long" : "Short"}</td>
                                <td className="py-1 text-right font-mono">{formatMoney(e.gainLoss)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {report.entries.length > PREVIEW_ROW_LIMIT && (
                          <p className="mt-1 text-[10px] text-slate-500">
                            + {report.entries.length - PREVIEW_ROW_LIMIT} more rows in the full PDF
                          </p>
                        )}
                      </div>
                    )}
                  </section>
                )}

                {options.branding === "full" && (
                  <footer className="mt-6 border-t border-slate-200 pt-2 text-[9px] text-slate-500">
                    Generated by StellarSwipe. Estimates only — consult a tax professional before filing.
                  </footer>
                )}
              </article>
            </div>
          )}
        </div>

        {generateState === "error" && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm"
          >
            <AlertTriangle size={15} className="shrink-0 text-red-400" aria-hidden="true" />
            <span className="flex-1 text-foreground">
              PDF generation failed. {generateError} Your options have been kept.
            </span>
            <Button size="sm" variant="outline" onClick={() => void generate()} className="gap-1.5">
              <RefreshCw size={13} aria-hidden="true" />
              Retry
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "options" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep("preview")} disabled={noSections}>
                Preview report
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("options")} className="gap-1.5">
                <ArrowLeft size={14} aria-hidden="true" />
                Edit options
              </Button>
              <Button
                onClick={() => void generate()}
                disabled={previewState !== "ready" || generateState === "generating"}
                className="gap-1.5"
              >
                {generateState === "generating" ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Download size={14} aria-hidden="true" />
                )}
                {generateState === "generating" ? "Generating…" : "Download PDF"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
