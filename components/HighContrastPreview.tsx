"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Contrast, Home, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContrastStore } from "@/store/useContrastStore";

const SAMPLE_ROWS = [
  { pair: "XLM/USDC", side: "BUY", pnl: "+4.21%" },
  { pair: "AQUA/XLM", side: "SELL", pnl: "-1.08%" },
  { pair: "yXLM/XLM", side: "BUY", pnl: "+0.64%" },
] as const;

const SAMPLE_BARS = [42, 68, 35, 80, 57, 74];

/**
 * High-contrast theme preview (#788).
 *
 * Renders a self-contained sample of navigation, form controls, a table, a
 * chart and feedback states. Toggling "Preview" scopes the high-contrast
 * tokens to this panel only (via `.high-contrast-preview`), so users can judge
 * the appearance before applying it app-wide. Apply persists the preference;
 * Reset returns to the default theme.
 */
export function HighContrastPreview() {
  const highContrast = useContrastStore((s) => s.highContrast);
  const setHighContrast = useContrastStore((s) => s.setHighContrast);
  const resetContrast = useContrastStore((s) => s.resetContrast);
  const [previewing, setPreviewing] = useState(false);
  const [status, setStatus] = useState("");

  const showHighContrast = previewing || highContrast;

  const handleApply = () => {
    setHighContrast(true);
    setPreviewing(false);
    setStatus("High-contrast theme applied across the app.");
  };

  const handleReset = () => {
    resetContrast();
    setPreviewing(false);
    setStatus("Default theme restored.");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Contrast size={14} aria-hidden="true" />
            High contrast
          </p>
          <p className="text-xs text-foreground-muted">
            Stronger text, borders and focus outlines. Preview it here before
            applying it everywhere.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!highContrast && (
            <button
              type="button"
              onClick={() => setPreviewing((p) => !p)}
              aria-pressed={previewing}
              aria-controls="high-contrast-preview"
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {previewing ? "Hide preview" : "Preview"}
            </button>
          )}
          {highContrast ? (
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Reset to default theme
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              className="rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Apply high contrast
            </button>
          )}
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      <div
        id="high-contrast-preview"
        aria-label={`Theme preview — ${showHighContrast ? "high contrast" : "default"}`}
        role="region"
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-background text-foreground",
          showHighContrast && "high-contrast-preview"
        )}
      >
        {/* Navigation */}
        <nav
          aria-label="Preview navigation"
          className="flex items-center gap-1 border-b border-border px-3 py-2 text-xs"
        >
          <span className="flex items-center gap-1 rounded-md bg-surface-high px-2 py-1 font-semibold text-foreground">
            <Home size={12} aria-hidden="true" />
            Feed
          </span>
          <span className="rounded-md px-2 py-1 text-foreground-muted">Portfolio</span>
          <span className="rounded-md px-2 py-1 text-foreground-muted">Leaderboard</span>
        </nav>

        <div className="grid gap-4 p-3 sm:grid-cols-2">
          {/* Form */}
          <fieldset className="space-y-2" aria-label="Preview form">
            <label className="block text-xs font-medium text-foreground" htmlFor="hc-preview-amount">
              Amount
            </label>
            <input
              id="hc-preview-amount"
              defaultValue="250"
              tabIndex={-1}
              readOnly
              className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs text-foreground"
            />
            <p className="text-[11px] text-foreground-muted">Available: 1,204.50 XLM</p>
            <div className="flex gap-2">
              <span className="rounded-md bg-accent-primary px-3 py-1.5 text-xs font-semibold text-background">
                Submit
              </span>
              <span className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-foreground">
                Cancel
              </span>
              <span
                className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground outline outline-2 outline-offset-2"
                style={{ outlineColor: "hsl(var(--ring))" }}
              >
                Focused
              </span>
            </div>
          </fieldset>

          {/* Chart */}
          <figure className="space-y-1" aria-label="Preview chart">
            <svg viewBox="0 0 120 60" className="h-20 w-full" role="img" aria-label="Sample bar chart">
              <line x1="0" y1="59" x2="120" y2="59" stroke="hsl(var(--border-strong))" strokeWidth="1" />
              {SAMPLE_BARS.map((h, i) => (
                <rect
                  key={i}
                  x={i * 20 + 3}
                  y={59 - h * 0.7}
                  width="14"
                  height={h * 0.7}
                  fill={i % 2 ? "hsl(var(--accent-sky))" : "hsl(var(--accent-primary))"}
                  stroke="hsl(var(--foreground))"
                  strokeWidth={showHighContrast ? 0.75 : 0}
                />
              ))}
            </svg>
            <figcaption className="text-[11px] text-foreground-muted">7-day P&amp;L</figcaption>
          </figure>
        </div>

        {/* Table */}
        <table className="w-full border-t border-border text-left text-xs">
          <thead>
            <tr className="border-b border-border text-foreground-muted">
              <th scope="col" className="px-3 py-1.5 font-medium">Pair</th>
              <th scope="col" className="px-3 py-1.5 font-medium">Side</th>
              <th scope="col" className="px-3 py-1.5 text-right font-medium">P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_ROWS.map((row) => (
              <tr key={row.pair} className="border-b border-border last:border-0">
                <td className="px-3 py-1.5 text-foreground">{row.pair}</td>
                <td className="px-3 py-1.5 text-foreground">{row.side}</td>
                <td
                  className={cn(
                    "px-3 py-1.5 text-right font-medium",
                    row.pnl.startsWith("+") ? "text-accent-success" : "text-accent-danger"
                  )}
                >
                  {row.pnl}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Feedback states */}
        <div className="grid gap-2 border-t border-border p-3 text-xs sm:grid-cols-2">
          <p className="flex items-center gap-1.5 rounded-md border border-accent-success px-2 py-1.5 text-accent-success">
            <CheckCircle2 size={12} aria-hidden="true" /> Trade executed
          </p>
          <p className="flex items-center gap-1.5 rounded-md border border-accent-danger px-2 py-1.5 text-accent-danger">
            <XCircle size={12} aria-hidden="true" /> Transaction failed
          </p>
          <p className="flex items-center gap-1.5 rounded-md border border-accent-warning px-2 py-1.5 text-accent-warning">
            <AlertTriangle size={12} aria-hidden="true" /> High slippage
          </p>
          <p className="flex items-center gap-1.5 rounded-md border border-accent-sky px-2 py-1.5 text-accent-sky">
            <Info size={12} aria-hidden="true" /> Signal expires soon
          </p>
        </div>
      </div>
    </div>
  );
}
