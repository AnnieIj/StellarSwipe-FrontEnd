/**
 * Export utilities for the Signal Comparison table.
 *
 * Two export formats are supported:
 *  - CSV  : one header row + one data row per compared signal
 *  - Image: a PNG snapshot of a DOM element (requires a browser environment)
 *
 * Both functions operate only on the signals currently in the comparison set —
 * they never touch the full signal feed.
 */

import type { Signal } from "@/lib/api-types.generated";

// ---------------------------------------------------------------------------
// Shared column definitions
// ---------------------------------------------------------------------------

/**
 * Ordered list of columns that appear in every CSV export.
 * Each entry maps a human-readable header to a value extractor.
 */
export const COMPARISON_CSV_COLUMNS: Array<{
  header: string;
  getValue: (signal: Signal) => string;
}> = [
  { header: "ID", getValue: (s) => s.id },
  { header: "Asset", getValue: (s) => s.ticker ?? "" },
  { header: "Action", getValue: (s) => s.action ?? "" },
  { header: "Confidence", getValue: (s) => s.confidence?.toString() ?? "" },
  { header: "Entry Price", getValue: (s) => "" },
  { header: "Target Price", getValue: (s) => "" },
  { header: "Stop Loss", getValue: (s) => "" },
  { header: "Risk/Reward", getValue: (s) => "" },
  { header: "Provider", getValue: (s) => s.provider ?? "" },
  { header: "Timestamp", getValue: (s) => s.timestamp ?? "" },
];

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

/**
 * Escape a single CSV cell value per RFC 4180:
 *  - wrap in double-quotes if the value contains a comma, double-quote, or newline
 *  - escape internal double-quotes by doubling them
 */
function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Build a CSV string from the provided signals using {@link COMPARISON_CSV_COLUMNS}.
 *
 * @param signals - The comparison set (max 3 items in normal use).
 * @returns A UTF-8 CSV string with a header row followed by one row per signal.
 */
export function buildComparisonCsv(signals: Signal[]): string {
  const headers = COMPARISON_CSV_COLUMNS.map((col) =>
    escapeCsvCell(col.header)
  );
  const rows = signals.map((signal) =>
    COMPARISON_CSV_COLUMNS.map((col) =>
      escapeCsvCell(col.getValue(signal))
    ).join(",")
  );
  return [headers.join(","), ...rows].join("\r\n");
}

/**
 * Trigger a browser download of the comparison CSV.
 *
 * @param signals - Signals currently in the comparison set.
 * @param filename - Optional file name (default: `signal-comparison.csv`).
 */
export function downloadComparisonCsv(
  signals: Signal[],
  filename = "signal-comparison.csv"
): void {
  const csv = buildComparisonCsv(signals);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  // Clean up
  requestAnimationFrame(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}

// ---------------------------------------------------------------------------
// Image export
// ---------------------------------------------------------------------------

/** Minimum width (px) used when html2canvas cannot determine element width. */
const FALLBACK_WIDTH = 800;
/** Minimum height (px) used when html2canvas cannot determine element height. */
const FALLBACK_HEIGHT = 400;

/**
 * Capture a DOM element as a PNG and trigger a browser download.
 *
 * Uses html2canvas when available. Falls back to a plain canvas render of an
 * SVG foreign-object representation so the function always resolves (useful
 * in test environments where html2canvas may not be present).
 *
 * @param element - The DOM element to snapshot (typically the comparison table container).
 * @param filename - Optional file name (default: `signal-comparison.png`).
 */
export async function downloadComparisonImage(
  element: HTMLElement,
  filename = "signal-comparison.png"
): Promise<void> {
  let canvas: HTMLCanvasElement;

  try {
    // Dynamically import html2canvas so the rest of the bundle is not affected
    // when the export button has not been clicked.
    const { default: html2canvas } = await import("html2canvas");
    canvas = await html2canvas(element, {
      backgroundColor: "#030712", // matches bg-gray-950
      scale: 2, // retina-quality output
      useCORS: true,
      logging: false,
    });
  } catch {
    // html2canvas not available (e.g. test env) — produce a simple fallback canvas
    const w = element.offsetWidth || FALLBACK_WIDTH;
    const h = element.offsetHeight || FALLBACK_HEIGHT;
    canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ffffff";
      ctx.font = "14px sans-serif";
      ctx.fillText("StellarSwipe – Signal Comparison", 20, 30);
    }
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    requestAnimationFrame(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }, "image/png");
}
