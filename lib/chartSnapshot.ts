/**
 * Renders a self-contained chart snapshot to a canvas (#782). The image
 * carries its own title, date context, units and source attribution so it can
 * be read without the surrounding app.
 */

export interface SnapshotPoint {
  timestamp: number;
  value: number;
}

export interface SnapshotSeries {
  id: string;
  label: string;
  color: string;
  points: SnapshotPoint[];
  /** True when the series exposes the user's own holdings or balances. */
  isPrivate?: boolean;
  dashed?: boolean;
}

export type SnapshotValueMode = "absolute" | "percent";

export interface SnapshotSpec {
  title: string;
  subtitle?: string;
  unit: string;
  valueMode: SnapshotValueMode;
  series: SnapshotSeries[];
  sources: string[];
  generatedAt?: number;
}

const WIDTH = 1200;
const HEIGHT = 675;
const PAD = { top: 120, right: 48, bottom: 120, left: 96 };

const COLORS = {
  background: "#0b1120",
  text: "#f8fafc",
  muted: "#94a3b8",
  grid: "rgba(148, 163, 184, 0.18)",
};

export function formatSnapshotDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function snapshotDateRange(series: SnapshotSeries[]): { start: number; end: number } | null {
  const all = series.flatMap((s) => s.points.map((p) => p.timestamp));
  if (all.length === 0) return null;
  return { start: Math.min(...all), end: Math.max(...all) };
}

/** Converts a series into percent change from its first point. */
export function toPercentSeries(points: SnapshotPoint[]): SnapshotPoint[] {
  const base = points[0]?.value;
  if (!base) return points.map((p) => ({ ...p, value: 0 }));
  return points.map((p) => ({
    timestamp: p.timestamp,
    value: ((p.value - base) / Math.abs(base)) * 100,
  }));
}

function formatValue(value: number, mode: SnapshotValueMode, unit: string): string {
  if (mode === "percent") return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  if (unit === "USD") return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function renderChartSnapshot(spec: SnapshotSpec): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const scale = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = WIDTH * scale;
  canvas.height = HEIGHT * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is not supported in this browser.");
  ctx.scale(scale, scale);

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const series = spec.series.map((s) => ({
    ...s,
    points: spec.valueMode === "percent" ? toPercentSeries(s.points) : s.points,
  }));
  const range = snapshotDateRange(series);

  // Title + date context
  ctx.fillStyle = COLORS.text;
  ctx.font = "600 32px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(spec.title, PAD.left, 36);
  ctx.fillStyle = COLORS.muted;
  ctx.font = "18px system-ui, -apple-system, sans-serif";
  const dateContext = range
    ? `${formatSnapshotDate(range.start)} – ${formatSnapshotDate(range.end)}`
    : "No data in range";
  const unitLabel = spec.valueMode === "percent" ? "% change from start" : spec.unit;
  ctx.fillText(
    [dateContext, `Values in ${unitLabel}`, spec.subtitle].filter(Boolean).join("  ·  "),
    PAD.left,
    78
  );

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const values = series.flatMap((s) => s.points.map((p) => p.value));

  if (range && values.length > 0) {
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const span = range.end - range.start || 1;
    const x = (ts: number) => PAD.left + ((ts - range.start) / span) * plotW;
    const y = (v: number) => PAD.top + plotH - ((v - min) / (max - min)) * plotH;

    // Grid + y-axis labels
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.fillStyle = COLORS.muted;
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) {
      const v = min + ((max - min) * i) / 4;
      const gy = y(v);
      ctx.beginPath();
      ctx.moveTo(PAD.left, gy);
      ctx.lineTo(PAD.left + plotW, gy);
      ctx.stroke();
      ctx.fillText(formatValue(v, spec.valueMode, spec.unit), PAD.left - 12, gy);
    }

    // X-axis labels
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i <= 4; i++) {
      const ts = range.start + (span * i) / 4;
      ctx.fillText(
        new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        x(ts),
        PAD.top + plotH + 12
      );
    }

    // Series
    for (const s of series) {
      if (s.points.length === 0) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.setLineDash(s.dashed ? [10, 6] : []);
      ctx.beginPath();
      s.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(x(p.timestamp), y(p.value));
        else ctx.lineTo(x(p.timestamp), y(p.value));
      });
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // Legend
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "16px system-ui, -apple-system, sans-serif";
  let lx = PAD.left;
  const ly = HEIGHT - 62;
  for (const s of series) {
    ctx.fillStyle = s.color;
    ctx.fillRect(lx, ly - 3, 24, 6);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(s.label, lx + 32, ly);
    lx += 32 + ctx.measureText(s.label).width + 32;
  }

  // Attribution
  ctx.fillStyle = COLORS.muted;
  ctx.font = "13px system-ui, -apple-system, sans-serif";
  const generated = formatSnapshotDate(spec.generatedAt ?? Date.now());
  const sources = spec.sources.length > 0 ? `Source: ${spec.sources.join("; ")}` : "";
  ctx.fillText(
    [sources, `Generated with StellarSwipe on ${generated}`].filter(Boolean).join("  ·  "),
    PAD.left,
    HEIGHT - 28
  );

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not encode the snapshot image."));
    }, "image/png");
  });
}
