"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useSavedFilterStore, type SavedFilter } from "@/store/useSavedFilterStore";
import { useSignalFilterStore } from "@/store/useSignalFilterStore";

const SCOPE_LABELS: Record<SavedFilter["scope"], string> = {
  signals: "Signal feed",
};

function SavedFilterRow({ filter }: { filter: SavedFilter }) {
  const rename = useSavedFilterStore((s) => s.rename);
  const remove = useSavedFilterStore((s) => s.remove);
  const applySnapshot = useSignalFilterStore((s) => ({
    setDirection: s.setDirection,
    setAsset: s.setAsset,
    setProvider: s.setProvider,
    setBookmarkedOnly: s.setBookmarkedOnly,
    setSortOrder: s.setSortOrder,
  }));

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(filter.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = () => {
    const { direction, asset, provider, bookmarkedOnly, sortOrder } = filter.filter;
    applySnapshot.setDirection(direction);
    applySnapshot.setAsset(asset);
    applySnapshot.setProvider(provider);
    applySnapshot.setBookmarkedOnly(bookmarkedOnly);
    applySnapshot.setSortOrder(sortOrder);
  };

  const handleRename = () => {
    const result = rename(filter.id, draftName);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setEditing(false);
  };

  return (
    <li className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-2.5">
      <div className="flex items-center justify-between gap-2">
        {editing ? (
          <div className="flex flex-1 items-center gap-1">
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setEditing(false);
                  setDraftName(filter.name);
                  setError(null);
                }
              }}
              aria-label={`Rename saved filter ${filter.name}`}
              className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              onClick={() => {
                setEditing(false);
                setDraftName(filter.name);
                setError(null);
              }}
              aria-label="Cancel rename"
              className="rounded p-1 text-foreground-muted hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleApply}
            className="min-w-0 flex-1 truncate text-left text-xs font-medium text-foreground hover:text-sky-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
            title={`Apply "${filter.name}"`}
          >
            {filter.name}
            <span className="ml-2 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-normal text-foreground-muted">
              {SCOPE_LABELS[filter.scope]}
            </span>
          </button>
        )}

        {!editing && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`Rename ${filter.name}`}
              className="rounded p-1 text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
            >
              <Pencil size={12} />
            </button>
            {confirmingDelete ? (
              <>
                <button
                  type="button"
                  onClick={() => remove(filter.id)}
                  aria-label={`Confirm delete ${filter.name}`}
                  className="rounded px-1.5 py-0.5 text-[11px] font-medium text-red-400 hover:text-red-300"
                >
                  Delete?
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  aria-label="Cancel delete"
                  className="rounded p-1 text-foreground-muted hover:text-foreground"
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                aria-label={`Delete ${filter.name}`}
                className="rounded p-1 text-foreground-muted hover:text-red-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
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

/**
 * Lists saved signal-feed filters and lets users rename or delete them.
 * Renaming/deleting never touches the active filter — only "Apply" does.
 */
export function SavedFiltersPanel() {
  const savedFilters = useSavedFilterStore((s) => s.savedFilters);
  const save = useSavedFilterStore((s) => s.save);
  const current = useSignalFilterStore((s) => ({
    direction: s.direction,
    asset: s.asset,
    provider: s.provider,
    bookmarkedOnly: s.bookmarkedOnly,
    sortOrder: s.sortOrder,
  }));

  const [newName, setNewName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = () => {
    const result = save(newName, "signals", current);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    setSaveError(null);
    setNewName("");
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="Save current filter as…"
          aria-label="New saved filter name"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder-foreground-subtle focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!newName.trim()}
          className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>
      {saveError && (
        <p role="alert" className="text-[11px] text-red-400">
          {saveError}
        </p>
      )}

      {savedFilters.length === 0 ? (
        <p className="text-xs text-foreground-muted">No saved filters yet.</p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Saved filters">
          {savedFilters.map((filter) => (
            <SavedFilterRow key={filter.id} filter={filter} />
          ))}
        </ul>
      )}
    </div>
  );
}
