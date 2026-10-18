"use client";

import { useId, useRef, useState } from "react";
import {
  useSavedAnalyticsViewStore,
  type AnalyticsViewSnapshot,
} from "@/store/useSavedAnalyticsViewStore";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, BookmarkPlus, Check, X } from "lucide-react";

interface SavedViewTabsProps {
  /** Current live view state, snapshotted when the user saves. */
  currentSnapshot: AnalyticsViewSnapshot;
  /**
   * Called when the user clicks a saved-view tab to apply it.
   * The parent should update its local UI state from the snapshot.
   */
  onApply: (snapshot: AnalyticsViewSnapshot) => void;
  className?: string;
}

/** Maximum characters shown in a tab label before truncation. */
const MAX_LABEL_CHARS = 24;

function truncate(name: string): string {
  return name.length > MAX_LABEL_CHARS
    ? `${name.slice(0, MAX_LABEL_CHARS - 1)}…`
    : name;
}

/**
 * SavedViewTabs
 * ─────────────
 * Horizontal tab strip for analytics workspace views (#791).
 *
 * Features:
 * - Displays all saved views as tabs.  The active view is visually highlighted.
 * - "Save current view" button prompts for a name and saves a new view.
 * - Each tab has inline rename and delete actions.
 * - Unsaved-changes indicator: the active tab gains a dot when the live
 *   snapshot diverges from the saved one.
 * - Invalid/outdated views (e.g. unparseable snapshot dates) fall back to
 *   the first saved view with a visible feedback message.
 * - Full keyboard support: arrow-key navigation between tabs, Enter/Space to
 *   apply, Escape to cancel inline rename.
 */
export function SavedViewTabs({
  currentSnapshot,
  onApply,
  className,
}: SavedViewTabsProps) {
  const { views, activeViewId, save, apply, rename, remove, clearActive } =
    useSavedAnalyticsViewStore();

  const [saveMode, setSaveMode] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  const [applyError, setApplyError] = useState<string | null>(null);

  const saveInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const saveFormId = useId();
  const renameFormId = useId();

  // ── Helpers ─────────────────────────────────────────────────────────────

  function handleApply(id: string) {
    setApplyError(null);
    const snapshot = apply(id);
    if (!snapshot) {
      setApplyError("That view could not be found. It may have been deleted.");
      return;
    }
    // Validate the stored dates before handing them up.
    const start = new Date(snapshot.rangeStart);
    const end = new Date(snapshot.rangeEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setApplyError(
        "This view contains an invalid date range and cannot be applied."
      );
      // Deselect so the UI doesn't stay in a broken state.
      clearActive();
      return;
    }
    onApply(snapshot);
  }

  function handleSaveSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    const result = save(saveName, currentSnapshot);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    setSaveName("");
    setSaveMode(false);
  }

  function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!renamingId) return;
    setRenameError(null);
    const result = rename(renamingId, renameValue);
    if (!result.ok) {
      setRenameError(result.error);
      return;
    }
    setRenamingId(null);
    setRenameValue("");
  }

  function startRename(id: string, currentName: string) {
    setRenamingId(id);
    setRenameValue(currentName);
    setRenameError(null);
    // Focus will be set by the useEffect-like pattern inside the render.
    requestAnimationFrame(() => renameInputRef.current?.focus());
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
    setRenameError(null);
  }

  function openSaveMode() {
    setSaveMode(true);
    setSaveError(null);
    setSaveName("");
    requestAnimationFrame(() => saveInputRef.current?.focus());
  }

  function cancelSaveMode() {
    setSaveMode(false);
    setSaveName("");
    setSaveError(null);
  }

  // Determine whether the live state has drifted from the active saved view.
  const activeView = views.find((v) => v.id === activeViewId) ?? null;
  const hasUnsavedChanges =
    activeView !== null &&
    JSON.stringify(activeView.snapshot) !== JSON.stringify(currentSnapshot);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <section
      aria-label="Saved analytics views"
      className={cn("flex flex-col gap-2", className)}
    >
      {/* ── Tab strip ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1" role="tablist">
        {views.map((view) => {
          const isActive = view.id === activeViewId;
          const isRenaming = renamingId === view.id;

          return (
            <div key={view.id} className="flex shrink-0 items-center">
              {isRenaming ? (
                /* ── Inline rename form ─────────────────────────────── */
                <form
                  id={renameFormId}
                  onSubmit={handleRenameSubmit}
                  className="flex items-center gap-1"
                  aria-label={`Rename "${view.name}"`}
                >
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && cancelRename()}
                    maxLength={50}
                    aria-label="New name"
                    aria-describedby={renameError ? `${renameFormId}-error` : undefined}
                    aria-invalid={!!renameError}
                    className="h-7 w-32 rounded border border-border bg-surface px-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="submit"
                    aria-label="Confirm rename"
                    className="rounded p-1 text-green-500 hover:bg-green-500/10 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <Check size={12} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelRename}
                    aria-label="Cancel rename"
                    className="rounded p-1 text-muted-foreground hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </form>
              ) : (
                /* ── Tab button ──────────────────────────────────────── */
                <div className="group flex items-center gap-0.5">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleApply(view.id)}
                    title={view.name}
                    className={cn(
                      "flex h-7 items-center gap-1.5 rounded-l px-2.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500",
                      isActive
                        ? "bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/40"
                        : "bg-white/5 text-foreground-muted hover:bg-white/10 hover:text-foreground"
                    )}
                  >
                    {truncate(view.name)}
                    {isActive && hasUnsavedChanges && (
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400"
                        aria-label="(unsaved changes)"
                        title="Unsaved changes"
                      />
                    )}
                  </button>
                  {/* Action buttons — always visible for the active tab,
                      otherwise shown on group hover / keyboard focus */}
                  <div
                    className={cn(
                      "flex items-center rounded-r border-l border-white/10 bg-white/5 transition-opacity",
                      isActive
                        ? "bg-sky-500/10 opacity-100"
                        : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => startRename(view.id, view.name)}
                      aria-label={`Rename "${view.name}"`}
                      className="h-7 px-1.5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <Pencil size={10} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(view.id)}
                      aria-label={`Delete "${view.name}"`}
                      className="h-7 px-1.5 text-muted-foreground hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <Trash2 size={10} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ── Save-new-view button / inline form ─────────────────────── */}
        {saveMode ? (
          <form
            id={saveFormId}
            onSubmit={handleSaveSubmit}
            className="flex shrink-0 items-center gap-1"
            aria-label="Save current view"
          >
            <input
              ref={saveInputRef}
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && cancelSaveMode()}
              placeholder="View name…"
              maxLength={50}
              aria-label="View name"
              aria-describedby={saveError ? `${saveFormId}-error` : undefined}
              aria-invalid={!!saveError}
              className="h-7 w-36 rounded border border-border bg-surface px-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="submit"
              aria-label="Confirm save"
              className="rounded p-1 text-green-500 hover:bg-green-500/10 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <Check size={12} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={cancelSaveMode}
              aria-label="Cancel"
              className="rounded p-1 text-muted-foreground hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={openSaveMode}
            aria-label="Save current view as a new workspace"
            className="flex h-7 shrink-0 items-center gap-1.5 rounded px-2 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <BookmarkPlus size={13} aria-hidden="true" />
            <span>Save view</span>
          </button>
        )}
      </div>

      {/* ── Inline error messages ─────────────────────────────────────── */}
      {renameError && (
        <p
          id={`${renameFormId}-error`}
          role="alert"
          className="text-xs text-red-400"
        >
          {renameError}
        </p>
      )}
      {saveError && (
        <p
          id={`${saveFormId}-error`}
          role="alert"
          className="text-xs text-red-400"
        >
          {saveError}
        </p>
      )}
      {applyError && (
        <p role="alert" className="text-xs text-amber-400">
          {applyError}
        </p>
      )}

      {/* ── Unsaved-changes notice ────────────────────────────────────── */}
      {hasUnsavedChanges && (
        <p className="text-xs text-amber-400" aria-live="polite">
          You have unsaved changes to{" "}
          <strong className="font-semibold">{activeView?.name}</strong>.{" "}
          <button
            type="button"
            onClick={() => activeView && handleApply(activeView.id)}
            className="underline hover:no-underline focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            Revert
          </button>
          {" or "}
          <button
            type="button"
            onClick={openSaveMode}
            className="underline hover:no-underline focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            save as new view
          </button>
          .
        </p>
      )}
    </section>
  );
}
