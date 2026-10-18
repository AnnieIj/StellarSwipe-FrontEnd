"use client";

/**
 * TargetAllocationEditor — #798
 *
 * Lets the user set and edit target percentages for each asset in their
 * portfolio. Targets must sum to exactly 100 %; an actionable validation
 * message is shown otherwise.
 *
 * - Inputs are numeric and constrained to 0–100.
 * - The sum indicator updates in real time.
 * - Save is disabled until the total equals 100 %.
 * - A "Show overlay" toggle wires directly to the chart band overlay flag.
 * - Keyboard accessible; full reduced-motion support via CSS transitions.
 */

import { useState } from "react";
import { usePortfolioStore } from "@/store/usePortfolioStore";
import { useTargetAllocationStore } from "@/store/useTargetAllocationStore";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TargetAllocationEditorProps {
  className?: string;
}

export function TargetAllocationEditor({
  className,
}: TargetAllocationEditorProps) {
  const { assets } = usePortfolioStore();
  const {
    targets,
    overlayVisible,
    setTargets,
    clearTargets,
    toggleOverlay,
    isValid,
    totalPct,
  } = useTargetAllocationStore();

  // Local draft — only committed on Save.
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    assets.forEach((a) => {
      init[a.symbol] =
        targets[a.symbol] !== undefined ? String(targets[a.symbol]) : "";
    });
    return init;
  });

  const draftSum = Object.values(draft).reduce((acc, v) => {
    const n = parseFloat(v);
    return acc + (isNaN(n) ? 0 : n);
  }, 0);
  const draftSumRounded = Math.round(draftSum * 100) / 100;
  const draftValid = Math.abs(draftSumRounded - 100) < 0.01;
  const deviation = Math.round((draftSumRounded - 100) * 100) / 100;

  function handleChange(symbol: string, raw: string) {
    setDraft((prev) => ({ ...prev, [symbol]: raw }));
  }

  function handleSave() {
    if (!draftValid) return;
    const entries = assets.map((a) => ({
      symbol: a.symbol,
      targetPct: parseFloat(draft[a.symbol] ?? "0") || 0,
    }));
    setTargets(entries);
  }

  function handleClear() {
    clearTargets();
    const reset: Record<string, string> = {};
    assets.forEach((a) => {
      reset[a.symbol] = "";
    });
    setDraft(reset);
  }

  if (assets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Add assets to your portfolio before setting targets.
      </p>
    );
  }

  const savedValid = isValid();

  return (
    <section
      aria-label="Target allocation editor"
      className={cn("rounded-lg border border-border bg-surface p-4", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          Target allocations
        </h3>
        <button
          type="button"
          onClick={toggleOverlay}
          aria-pressed={overlayVisible}
          aria-label={
            overlayVisible ? "Hide target band overlay" : "Show target band overlay"
          }
          className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
        >
          {overlayVisible ? (
            <EyeOff size={13} aria-hidden="true" />
          ) : (
            <Eye size={13} aria-hidden="true" />
          )}
          {overlayVisible ? "Hide overlay" : "Show overlay"}
        </button>
      </div>

      {/* Per-asset inputs */}
      <ul className="space-y-2" aria-label="Asset target inputs">
        {assets.map((asset) => (
          <li key={asset.symbol} className="flex items-center gap-3">
            {/* Color swatch */}
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: asset.color }}
              aria-hidden="true"
            />
            <label
              htmlFor={`target-${asset.symbol}`}
              className="flex-1 truncate text-sm text-foreground"
            >
              {asset.name}{" "}
              <span className="text-muted-foreground text-xs">
                ({asset.symbol})
              </span>
            </label>
            <div className="flex items-center gap-1">
              <input
                id={`target-${asset.symbol}`}
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step={0.1}
                value={draft[asset.symbol] ?? ""}
                onChange={(e) => handleChange(asset.symbol, e.target.value)}
                aria-label={`Target allocation for ${asset.name}, percentage`}
                className="w-20 rounded border border-border bg-surface-high px-2 py-1 text-right text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span
                className="text-sm text-muted-foreground"
                aria-hidden="true"
              >
                %
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* Sum indicator + validation message */}
      <div
        className="mt-4 flex items-center gap-2 text-sm"
        aria-live="polite"
        aria-atomic="true"
      >
        {draftValid ? (
          <CheckCircle2
            size={14}
            className="text-green-500 shrink-0"
            aria-hidden="true"
          />
        ) : (
          <AlertCircle
            size={14}
            className="text-amber-500 shrink-0"
            aria-hidden="true"
          />
        )}
        <span
          className={cn(
            "font-mono",
            draftValid ? "text-green-500" : "text-amber-500"
          )}
        >
          Total: {draftSumRounded.toFixed(1)}%
        </span>
        {!draftValid && (
          <span className="text-muted-foreground text-xs">
            {deviation > 0
              ? `Over by ${deviation.toFixed(2)} % — reduce allocations`
              : `Under by ${Math.abs(deviation).toFixed(2)} % — increase allocations`}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={!draftValid}
          aria-disabled={!draftValid}
          size="sm"
          className="flex-1"
        >
          Save targets
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          size="sm"
          aria-label="Clear all target allocations"
        >
          Clear
        </Button>
      </div>

      {/* Status of persisted targets */}
      {savedValid && (
        <p className="mt-2 text-xs text-green-500 flex items-center gap-1">
          <CheckCircle2 size={11} aria-hidden="true" />
          Targets saved and valid
        </p>
      )}
    </section>
  );
}
