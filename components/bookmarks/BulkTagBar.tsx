"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBookmarkStore } from "@/store/useBookmarkStore";
import { saveBookmarkTags } from "@/lib/bookmarkApi";

type BulkTagOperation = "add" | "remove";

interface BulkTagBarProps {
  selectedIds: string[];
  /** Human-readable label for a signal id, used in failure messages. */
  getLabel: (id: string) => string;
  /** Replaces the selection, e.g. to keep only failed items selected. */
  onSelectionChange: (ids: string[]) => void;
}

/**
 * Toolbar for adding or removing a tag across the selected bookmarks.
 * Each bookmark is saved independently so successful changes are kept even
 * when some items fail; failed items stay selected for a retry.
 */
export function BulkTagBar({
  selectedIds,
  getLabel,
  onSelectionChange,
}: BulkTagBarProps) {
  const tags = useBookmarkStore((s) => s.tags);
  const addTagToSignals = useBookmarkStore((s) => s.addTagToSignals);
  const removeTagFromSignals = useBookmarkStore((s) => s.removeTagFromSignals);

  const [tag, setTag] = useState("");
  const [pending, setPending] = useState<BulkTagOperation | null>(null);
  const [status, setStatus] = useState("");
  const [failedIds, setFailedIds] = useState<string[]>([]);

  const count = selectedIds.length;
  const trimmed = tag.trim();

  async function run(operation: BulkTagOperation) {
    if (!trimmed || count === 0 || pending) return;
    const ids = [...selectedIds];
    setPending(operation);
    setFailedIds([]);
    setStatus(
      `${operation === "add" ? "Adding" : "Removing"} "${trimmed}" on ${ids.length} bookmark${ids.length === 1 ? "" : "s"}…`
    );

    const results = await Promise.allSettled(
      ids.map((id) => {
        const current = tags[id] ?? [];
        const next =
          operation === "add"
            ? [...new Set([...current, trimmed])]
            : current.filter((t) => t !== trimmed);
        return saveBookmarkTags(id, next);
      })
    );

    const succeeded = ids.filter((_, i) => results[i].status === "fulfilled");
    const failed = ids.filter((_, i) => results[i].status === "rejected");

    if (succeeded.length) {
      if (operation === "add") addTagToSignals(trimmed, succeeded);
      else removeTagFromSignals(trimmed, succeeded);
    }

    const verb = operation === "add" ? "added to" : "removed from";
    const done = `"${trimmed}" ${verb} ${succeeded.length} of ${ids.length} bookmark${ids.length === 1 ? "" : "s"}.`;
    setStatus(
      failed.length
        ? `${done} ${failed.length} failed: ${failed.map(getLabel).join(", ")}.`
        : done
    );
    setFailedIds(failed);
    // Keep failed items selected so the user can retry just those.
    onSelectionChange(failed);
    setPending(null);
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void run("add");
  };

  return (
    <div
      className="mb-4 rounded-xl border border-white/10 bg-slate-950/60 p-3"
      role="region"
      aria-label="Bulk tag actions"
    >
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-foreground-muted" data-testid="bulk-tag-count">
          {count} selected
        </span>
        <label htmlFor="bulk-tag-input" className="sr-only">
          Tag name
        </label>
        <input
          id="bulk-tag-input"
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="Tag name"
          maxLength={32}
          className="h-8 rounded-md border border-white/10 bg-white/5 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        <Button
          type="submit"
          size="sm"
          className="gap-1.5"
          disabled={!trimmed || count === 0 || pending !== null}
          aria-label={`Add tag to ${count} selected bookmark${count === 1 ? "" : "s"}`}
        >
          {pending === "add" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Tag className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Add tag
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => void run("remove")}
          disabled={!trimmed || count === 0 || pending !== null}
          aria-label={`Remove tag from ${count} selected bookmark${count === 1 ? "" : "s"}`}
        >
          {pending === "remove" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Remove tag
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onSelectionChange([])}
          disabled={count === 0 || pending !== null}
        >
          Clear selection
        </Button>
      </form>
      <p
        role="status"
        aria-live="polite"
        className={failedIds.length ? "mt-2 text-xs text-red-400" : "mt-2 text-xs text-foreground-muted"}
        data-testid="bulk-tag-status"
      >
        {status}
      </p>
    </div>
  );
}
