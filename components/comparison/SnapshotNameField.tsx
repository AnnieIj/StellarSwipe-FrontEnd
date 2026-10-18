"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { useComparisonStore } from "@/store/useComparisonStore";

/**
 * Lets users name and rename the current comparison snapshot from the
 * compare view. Validates empty/duplicate names inline before committing.
 */
export function SnapshotNameField() {
  const { snapshotName, setSnapshotName } = useComparisonStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(snapshotName);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setDraft(snapshotName);
    setError(null);
    setEditing(true);
  };

  const commit = () => {
    const result = setSnapshotName(draft);
    if (!result.ok) {
      setError(result.error ?? "Invalid name.");
      return;
    }
    setError(null);
    setEditing(false);
  };

  const cancel = () => {
    setError(null);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEditing}
        className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors print:pointer-events-none"
        aria-label={snapshotName ? `Rename snapshot "${snapshotName}"` : "Name this snapshot"}
      >
        <span className="font-medium">{snapshotName || "Untitled snapshot"}</span>
        <Pencil size={12} className="text-gray-500 print:hidden" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="print:hidden">
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          placeholder="Snapshot name"
          aria-label="Snapshot name"
          aria-invalid={!!error}
          aria-describedby={error ? "snapshot-name-error" : undefined}
          className="rounded-md border border-white/10 bg-gray-900 px-2 py-1 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="button" onClick={commit} aria-label="Save snapshot name" className="text-green-400 hover:text-green-300">
          <Check size={16} />
        </button>
        <button type="button" onClick={cancel} aria-label="Cancel renaming" className="text-gray-500 hover:text-gray-300">
          <X size={16} />
        </button>
      </div>
      {error && (
        <p id="snapshot-name-error" role="alert" className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
