"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import { useTradePresetsStore } from "@/store/useTradePresetsStore";
import { DEFAULT_TRADE_PRESETS, MAX_TRADE_PRESETS } from "@/lib/tradePresets";

interface TradePresetEditorProps {
  /** Called after a successful save or when the user cancels. */
  onDone: () => void;
}

/**
 * Inline editor for the trade-size preset buttons. Works on a local draft so
 * nothing is persisted until the user saves a valid list.
 */
export function TradePresetEditor({ onDone }: TradePresetEditorProps) {
  const { presets, setPresets, restoreDefaults } = useTradePresetsStore();
  const [draft, setDraft] = useState<string[]>(() => presets.map(String));
  const [error, setError] = useState<string | null>(null);

  const update = (next: string[]) => {
    setDraft(next);
    setError(null);
  };

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  };

  const handleSave = () => {
    // Blank inputs become NaN so they fail the "must be a number" check.
    const values = draft.map((v) => (v.trim() === "" ? NaN : Number(v)));
    const saveError = setPresets(values);
    if (saveError) {
      setError(saveError);
      return;
    }
    onDone();
  };

  const handleRestore = () => {
    restoreDefaults();
    setDraft(DEFAULT_TRADE_PRESETS.map(String));
    setError(null);
  };

  return (
    <div className="mt-2 rounded-lg border border-border bg-input p-3 space-y-2">
      <p className="text-xs text-foreground-muted">Edit size presets (% of balance)</p>

      <ul className="space-y-1.5" aria-label="Preset list">
        {draft.map((value, index) => (
          <li key={index} className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              value={value}
              onChange={(e) =>
                update(draft.map((v, i) => (i === index ? e.target.value : v)))
              }
              aria-label={`Preset ${index + 1} percentage`}
              aria-invalid={!!error}
              className="w-full rounded-md bg-background border border-border px-2 py-1 text-foreground text-xs
                focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label={`Move preset ${index + 1} up`}
              className="p-1 rounded-md text-foreground-muted hover:text-foreground disabled:opacity-40"
            >
              <ArrowUp size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === draft.length - 1}
              aria-label={`Move preset ${index + 1} down`}
              className="p-1 rounded-md text-foreground-muted hover:text-foreground disabled:opacity-40"
            >
              <ArrowDown size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => update(draft.filter((_, i) => i !== index))}
              aria-label={`Remove preset ${index + 1}`}
              className="p-1 rounded-md text-foreground-muted hover:text-accent-danger"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="text-xs text-accent-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => update([...draft, ""])}
          disabled={draft.length >= MAX_TRADE_PRESETS}
          className="inline-flex items-center gap-1 text-foreground-muted hover:text-foreground disabled:opacity-40"
        >
          <Plus size={14} aria-hidden="true" /> Add preset
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={handleRestore}
          className="text-foreground-muted hover:text-foreground"
        >
          Restore defaults
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-foreground-muted hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-foreground/10 px-2 py-1 font-medium text-foreground hover:bg-foreground/20"
        >
          Save
        </button>
      </div>
    </div>
  );
}
