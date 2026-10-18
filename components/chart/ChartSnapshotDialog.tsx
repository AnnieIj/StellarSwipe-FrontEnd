"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { AlertTriangle, Copy, Download, ImageIcon, Lock, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import {
  canvasToBlob,
  formatSnapshotDate,
  renderChartSnapshot,
  snapshotDateRange,
  type SnapshotSeries,
  type SnapshotValueMode,
} from "@/lib/chartSnapshot";

export interface SnapshotChartOption {
  id: string;
  title: string;
  unit: string;
  /** Attribution lines required for the data shown (e.g. benchmark source). */
  sources: string[];
  series: SnapshotSeries[];
}

interface ChartSnapshotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  charts: SnapshotChartOption[];
  defaultChartId?: string;
}

const RANGE_OPTIONS = [
  { id: "7", label: "Last 7 days", days: 7 },
  { id: "14", label: "Last 14 days", days: 14 },
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "all", label: "Everything loaded", days: null },
] as const;

type RangeId = (typeof RANGE_OPTIONS)[number]["id"];

type Status =
  | { kind: "idle" }
  | { kind: "generating" }
  | { kind: "ready"; url: string; blob: Blob }
  | { kind: "error"; message: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * Controlled chart-snapshot sharing (#782). The user picks the chart, range
 * and series before an image is produced; series that expose the user's own
 * holdings are excluded until the user explicitly confirms that scope.
 */
export function ChartSnapshotDialog({
  open,
  onOpenChange,
  charts,
  defaultChartId,
}: ChartSnapshotDialogProps) {
  const [chartId, setChartId] = useState(defaultChartId ?? charts[0]?.id ?? "");
  const [rangeId, setRangeId] = useState<RangeId>("all");
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [valueMode, setValueMode] = useState<SnapshotValueMode>("percent");
  const [privateConfirmed, setPrivateConfirmed] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const formId = useId();

  const chart = charts.find((c) => c.id === chartId) ?? charts[0];

  // Reset series selection whenever the chart changes: public series on,
  // private series off until the user opts in.
  useEffect(() => {
    if (!chart) return;
    setSelectedSeries(chart.series.filter((s) => !s.isPrivate).map((s) => s.id));
    setPrivateConfirmed(false);
  }, [chart?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && defaultChartId) setChartId(defaultChartId);
  }, [open, defaultChartId]);

  // Any option change invalidates the previously generated image.
  useEffect(() => {
    setStatus((prev) => {
      if (prev.kind === "ready") URL.revokeObjectURL(prev.url);
      return { kind: "idle" };
    });
  }, [chartId, rangeId, selectedSeries, valueMode, privateConfirmed]);

  useEffect(() => {
    if (!open) {
      setStatus((prev) => {
        if (prev.kind === "ready") URL.revokeObjectURL(prev.url);
        return { kind: "idle" };
      });
    }
  }, [open]);

  const includesPrivate = useMemo(
    () => chart?.series.some((s) => s.isPrivate && selectedSeries.includes(s.id)) ?? false,
    [chart, selectedSeries]
  );

  const seriesInRange = useMemo(() => {
    if (!chart) return [];
    const range = RANGE_OPTIONS.find((r) => r.id === rangeId);
    return chart.series
      .filter((s) => selectedSeries.includes(s.id))
      .map((s) => {
        if (!range?.days || s.points.length === 0) return s;
        const end = Math.max(...s.points.map((p) => p.timestamp));
        const cutoff = end - range.days * DAY_MS;
        return { ...s, points: s.points.filter((p) => p.timestamp >= cutoff) };
      });
  }, [chart, rangeId, selectedSeries]);

  const dateRange = snapshotDateRange(seriesInRange);
  const privateBlocked = includesPrivate && !privateConfirmed;
  const canGenerate =
    Boolean(chart) && seriesInRange.length > 0 && !privateBlocked && status.kind !== "generating";

  function toggleSeries(id: string) {
    setSelectedSeries((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function generate() {
    if (!chart || !canGenerate) return;
    setStatus({ kind: "generating" });
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const canvas = renderChartSnapshot({
        title: chart.title,
        unit: chart.unit,
        valueMode,
        series: seriesInRange,
        sources: chart.sources,
        subtitle: includesPrivate && valueMode === "absolute" ? "Includes personal portfolio values" : undefined,
      });
      const blob = await canvasToBlob(canvas);
      setStatus({ kind: "ready", blob, url: URL.createObjectURL(blob) });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "The snapshot could not be generated.",
      });
    }
  }

  const fileName = chart
    ? `${slug(chart.title)}-${dateRange ? new Date(dateRange.end).toISOString().slice(0, 10) : "snapshot"}.png`
    : "chart-snapshot.png";

  async function copyImage() {
    if (status.kind !== "ready") return;
    try {
      if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
        throw new Error("Copying images isn't supported in this browser. Use Download instead.");
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": status.blob })]);
      toast.success("Snapshot copied", { description: "Paste it anywhere that accepts images." });
    } catch (err) {
      toast.error("Couldn't copy snapshot", {
        description:
          err instanceof Error && err.message
            ? err.message
            : "Clipboard access was denied. Try Download instead.",
      });
    }
  }

  function downloadImage() {
    if (status.kind !== "ready") return;
    try {
      const a = document.createElement("a");
      a.href = status.url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Snapshot downloaded", { description: `Saved as ${fileName}.` });
    } catch {
      toast.error("Couldn't download snapshot", {
        description: "Your browser blocked the download. Try copying the image instead.",
      });
    }
  }

  if (!chart) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon size={18} aria-hidden="true" />
            Share chart snapshot
          </DialogTitle>
          <DialogDescription>
            Choose what to include. The image will show the chart title, date range, units and data
            sources so others can interpret it.
          </DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void generate();
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Chart</span>
            <select
              value={chart.id}
              onChange={(e) => setChartId(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              {charts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Range</span>
            <select
              value={rangeId}
              onChange={(e) => setRangeId(e.target.value as RangeId)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              {RANGE_OPTIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="flex flex-col gap-1.5 text-sm">
            <legend className="mb-1.5 font-medium text-foreground">Visible series</legend>
            {chart.series.map((s) => (
              <label key={s.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedSeries.includes(s.id)}
                  onChange={() => toggleSeries(s.id)}
                />
                <span className="h-2 w-4 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden="true" />
                <span className="text-foreground">{s.label}</span>
                {s.isPrivate && (
                  <span className="inline-flex items-center gap-1 text-xs text-foreground-muted">
                    <Lock size={11} aria-hidden="true" />
                    Private
                  </span>
                )}
              </label>
            ))}
          </fieldset>

          <fieldset className="flex flex-col gap-1.5 text-sm">
            <legend className="mb-1.5 font-medium text-foreground">Values</legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`${formId}-mode`}
                checked={valueMode === "percent"}
                onChange={() => setValueMode("percent")}
              />
              Percent change (recommended)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`${formId}-mode`}
                checked={valueMode === "absolute"}
                onChange={() => setValueMode("absolute")}
              />
              Absolute values ({chart.unit})
            </label>
          </fieldset>

          {includesPrivate && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm sm:col-span-2">
              <p className="flex items-start gap-2 text-amber-300">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  This snapshot includes your private portfolio data
                  {valueMode === "absolute" ? ", including dollar values," : ""} and anyone you share
                  it with will see it.
                </span>
              </p>
              <label className="mt-2 flex items-center gap-2 text-foreground">
                <input
                  type="checkbox"
                  checked={privateConfirmed}
                  onChange={(e) => setPrivateConfirmed(e.target.checked)}
                />
                I understand and want to include my portfolio data
              </label>
            </div>
          )}

          <p className="text-xs text-foreground-muted sm:col-span-2">
            {dateRange
              ? `Covers ${formatSnapshotDate(dateRange.start)} – ${formatSnapshotDate(dateRange.end)}.`
              : "Select at least one series to generate a snapshot."}{" "}
            {chart.sources.length > 0 && `Attribution: ${chart.sources.join("; ")}.`}
          </p>
        </form>

        <div aria-live="polite" className="min-h-[2rem]">
          {status.kind === "generating" && (
            <p className="text-sm text-foreground-muted">Generating snapshot…</p>
          )}
          {status.kind === "error" && (
            <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              <AlertTriangle size={15} aria-hidden="true" />
              <span className="flex-1">{status.message}</span>
              <Button size="sm" variant="outline" onClick={() => void generate()} className="gap-1.5">
                <RefreshCw size={13} aria-hidden="true" />
                Try again
              </Button>
            </div>
          )}
          {status.kind === "ready" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={status.url}
              alt={`Snapshot of ${chart.title}${dateRange ? ` from ${formatSnapshotDate(dateRange.start)} to ${formatSnapshotDate(dateRange.end)}` : ""}`}
              className="w-full rounded-md border border-border"
            />
          )}
        </div>

        <DialogFooter className="gap-2">
          {status.kind === "ready" ? (
            <>
              <Button variant="outline" onClick={() => void copyImage()} className="gap-1.5">
                <Copy size={14} aria-hidden="true" />
                Copy image
              </Button>
              <Button onClick={downloadImage} className="gap-1.5">
                <Download size={14} aria-hidden="true" />
                Download PNG
              </Button>
            </>
          ) : (
            <Button
              type="submit"
              form={formId}
              disabled={!canGenerate}
              className="gap-1.5"
            >
              <ImageIcon size={14} aria-hidden="true" />
              {status.kind === "generating" ? "Generating…" : "Generate snapshot"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
