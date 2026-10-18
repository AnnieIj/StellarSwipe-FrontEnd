"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isSameTradeFilter,
  useTradeFilterPresetStore,
  type TradeFilterPreset,
  type TradeFilterSnapshot,
} from "@/store/useTradeFilterPresetStore";

interface TradeFilterPresetRowProps {
  preset: TradeFilterPreset;
  active: boolean;
  onApply: (filter: TradeFilterSnapshot) => void;
}

function TradeFilterPresetRow({ preset, active, onApply }: TradeFilterPresetRowProps) {
  const rename = useTradeFilterPresetStore((s) => s.rename);
  const remove = useTradeFilterPresetStore((s) => s.remove);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(preset.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelEdit = () => {
    setEditing(false);
    setDraftName(preset.name);
    setError(null);
  };

  const handleRename = () => {
    const result = rename(preset.id, draftName);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setEditing(false);
  };

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        {editing ? (
          <>
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") cancelEdit();
              }}
              aria-label={`Rename preset ${preset.name}`}
              className="min-w-0 flex-1 rounded-full border border-white/10 bg-background px-3 py-1 text-xs text-foreground outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleRename}
              aria-label="Confirm rename"
              className="rounded p-1 text-emerald-400 hover:text-emerald-300"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              aria-label="Cancel rename"
              className="rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onApply(preset.filter)}
              aria-pressed={active}
              className={cn(
                "min-w-0 flex-1 truncate rounded-full border px-3 py-1 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                active
                  ? "border-blue-400/40 bg-blue-400/10 text-blue-300"
                  : "border-white/10 bg-background/80 text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
              title={`Apply "${preset.name}"`}
            >
              {preset.name}
              {active && <span className="ml-2 text-[10px] uppercase tracking-[0.16em]">Active</span>}
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`Rename ${preset.name}`}
              className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Pencil size={12} />
            </button>
            {confirmingDelete ? (
              <>
                <button
                  type="button"
                  onClick={() => remove(preset.id)}
                  aria-label={`Confirm delete ${preset.name}`}
                  className="rounded px-1.5 py-0.5 text-[11px] font-medium text-red-400 hover:text-red-300"
                >
                  Delete?
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  aria-label="Cancel delete"
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                aria-label={`Delete ${preset.name}`}
                className="rounded p-1 text-muted-foreground hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Trash2 size={12} />
              </button>
            )}
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="text-[11px] text-red-400">
          {error}
        </p>
      )}
    </li>
  );
}

interface TradeFilterPresetsProps {
  current: TradeFilterSnapshot;
  onApply: (filter: TradeFilterSnapshot) => void;
}

/**
 * Saves, applies, renames and deletes named trade-history filter presets.
 * The preset whose filters match the current view is marked as active, so
 * changing any filter by hand clears the active marker automatically.
 */
export function TradeFilterPresets({ current, onApply }: TradeFilterPresetsProps) {
  const presets = useTradeFilterPresetStore((s) => s.presets);
  const save = useTradeFilterPresetStore((s) => s.save);

  const [newName, setNewName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const activePresetId = presets.find((p) => isSameTradeFilter(p.filter, current))?.id;

  const handleSave = () => {
    const result = save(newName, current);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    setSaveError(null);
    setNewName("");
  };

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-background/80 p-3">
      <div className="flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="Save current filters as…"
          aria-label="New filter preset name"
          className="min-w-0 flex-1 rounded-full border border-white/10 bg-background px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!newName.trim()}
          className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save preset
        </button>
      </div>
      {saveError && (
        <p role="alert" className="text-[11px] text-red-400">
          {saveError}
        </p>
      )}

      {presets.length === 0 ? (
        <p className="text-xs text-muted-foreground">No filter presets yet.</p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Filter presets">
          {presets.map((preset) => (
            <TradeFilterPresetRow
              key={preset.id}
              preset={preset}
              active={preset.id === activePresetId}
              onApply={onApply}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
