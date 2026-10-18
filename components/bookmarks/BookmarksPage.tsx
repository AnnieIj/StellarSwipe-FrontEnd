"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookmarkX,
  Folder as FolderIcon,
  FolderPlus,
  Pencil,
  Trash2,
  RefreshCw,
  Plus,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SignalCard } from "@/components/SignalCard";
import {
  useBookmarkStore,
  useBookmarkHydrated,
  type BookmarkFolder,
} from "@/store/useBookmarkStore";
import { useBookmarkActions } from "@/hooks/useBookmarkActions";
import { BulkTagBar } from "@/components/bookmarks/BulkTagBar";
import { usePortfolio } from "@/hooks/usePortfolio";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/signals";

interface BookmarksPageProps {
  initialSignals: Signal[];
}

type BookmarkSortOrder = "newest" | "oldest" | "confidence" | "ticker";
type BookmarkActionFilter = "ALL" | "BUY" | "SELL" | "HOLD";

const SORT_OPTIONS: { label: string; value: BookmarkSortOrder }[] = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Highest confidence", value: "confidence" },
  { label: "Ticker A–Z", value: "ticker" },
];

const ACTION_FILTERS: { label: string; value: BookmarkActionFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Buy", value: "BUY" },
  { label: "Sell", value: "SELL" },
  { label: "Hold", value: "HOLD" },
];

function sortSignals(
  signals: Signal[],
  sortOrder: BookmarkSortOrder
): Signal[] {
  const copy = [...signals];
  switch (sortOrder) {
    case "newest":
      return copy.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    case "oldest":
      return copy.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    case "confidence":
      return copy.sort((a, b) => b.confidence - a.confidence);
    case "ticker":
      return copy.sort((a, b) => a.ticker.localeCompare(b.ticker));
    default:
      return copy;
  }
}

function BookmarksEmptyState() {
  return (
    <EmptyState
      ariaLabel="No bookmarked signals yet"
      title="No bookmarks yet"
      description="Save signals from the main feed to build a short list here. You can organize them into folders for different strategies."
      className="bg-slate-950/80 py-16"
      icon={<BookmarkX className="h-8 w-8 text-sky-400/80" />}
      action={
        <Button asChild size="sm" className="gap-2">
          <Link href="/app">
            <ArrowLeft className="h-3.5 w-3.5 rtl-flip" aria-hidden="true" />
            Browse feed
          </Link>
        </Button>
      }
      secondaryAction={
        <Button asChild size="sm" variant="outline" className="gap-2">
          <Link href="/providers">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Explore providers
          </Link>
        </Button>
      }
    />
  );
}

function BookmarksSkeleton() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-busy="true"
      aria-label="Loading bookmarks"
    >
      <span className="sr-only">Loading bookmarks…</span>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-32 rounded-2xl border border-white/10 bg-white/5 animate-pulse"
        />
      ))}
    </div>
  );
}

function CreateFolderForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setName("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Folder name"
        aria-label="New folder name"
        className="flex h-8 w-full rounded-md border border-white/10 bg-white/5 px-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-sky-400"
        maxLength={40}
      />
      <button
        type="submit"
        disabled={!name.trim()}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sky-400 hover:bg-white/10 disabled:opacity-40"
        title="Create folder"
        aria-label="Create folder"
      >
        <Check className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground-muted hover:bg-white/10"
        title="Cancel"
        aria-label="Cancel"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}

function RenameFolderForm({
  initialName,
  onSubmit,
  onCancel,
}: {
  initialName: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed && trimmed !== initialName) {
      onSubmit(trimmed);
    } else {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Folder name"
        aria-label="Rename folder"
        className="flex h-8 w-full rounded-md border border-white/10 bg-white/5 px-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-sky-400"
        maxLength={40}
      />
      <button
        type="submit"
        disabled={!name.trim() || name.trim() === initialName}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sky-400 hover:bg-white/10 disabled:opacity-40"
        title="Save name"
        aria-label="Save name"
      >
        <Check className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground-muted hover:bg-white/10"
        title="Cancel"
        aria-label="Cancel"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}

function FolderList({
  folders,
  selectedFolderId,
  onSelectFolder,
  onRenameFolder,
  onDeleteFolder,
  onCreateFolder,
}: {
  folders: BookmarkFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onCreateFolder: (name: string) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-xs uppercase tracking-wider text-foreground-muted">
          Folders
        </span>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground-muted hover:bg-white/10 hover:text-foreground"
          title="Create folder"
          aria-label="Create folder"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
      </div>

      {isCreating && (
        <div className="px-1 pb-1">
          <CreateFolderForm
            onSubmit={(name) => {
              onCreateFolder(name);
              setIsCreating(false);
            }}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      )}

      <button
        onClick={() => onSelectFolder(null)}
        aria-pressed={selectedFolderId === null}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
          selectedFolderId === null
            ? "bg-sky-400/10 text-sky-400"
            : "text-foreground-muted hover:bg-white/5 hover:text-foreground"
        )}
      >
        <FolderIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>All bookmarks</span>
      </button>

      {folders.map((folder) => (
        <div key={folder.id} className="group relative">
          {renamingId === folder.id ? (
            <div className="px-1">
              <RenameFolderForm
                initialName={folder.name}
                onSubmit={(name) => {
                  onRenameFolder(folder.id, name);
                  setRenamingId(null);
                }}
                onCancel={() => setRenamingId(null)}
              />
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelectFolder(folder.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectFolder(folder.id);
                }
              }}
              aria-pressed={selectedFolderId === folder.id}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                selectedFolderId === folder.id
                  ? "bg-sky-400/10 text-sky-400"
                  : "text-foreground-muted hover:bg-white/5 hover:text-foreground"
              )}
            >
              <FolderIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{folder.name}</span>
              <span className="text-xs text-foreground-muted">
                {folder.signalIds.length}
              </span>
              <div className="hidden gap-2 group-hover:flex">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenamingId(folder.id);
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground-muted hover:text-foreground"
                  title={`Rename ${folder.name}`}
                  aria-label={`Rename ${folder.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFolder(folder.id);
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground-muted hover:text-red-400"
                  title={`Delete ${folder.name}`}
                  aria-label={`Delete ${folder.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FilterSortBar({
  actionFilter,
  onActionFilterChange,
  sortOrder,
  onSortOrderChange,
  resultCount,
}: {
  actionFilter: BookmarkActionFilter;
  onActionFilterChange: (value: BookmarkActionFilter) => void;
  sortOrder: BookmarkSortOrder;
  onSortOrderChange: (value: BookmarkSortOrder) => void;
  resultCount: number;
}) {
  return (
    <div
      className="mb-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-3 sm:flex-row sm:items-center sm:justify-between"
      role="group"
      aria-label="Filter and sort bookmarks"
    >
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Filter by action"
      >
        {ACTION_FILTERS.map((filter) => {
          const selected = actionFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onActionFilterChange(filter.value)}
              aria-pressed={selected}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                selected
                  ? "border-sky-400/40 bg-sky-400/10 text-sky-300"
                  : "border-white/10 bg-white/5 text-foreground-muted hover:bg-white/10 hover:text-foreground"
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <label
          htmlFor="bookmark-sort"
          className="text-xs uppercase tracking-wider text-foreground-muted"
        >
          Sort
        </label>
        <select
          id="bookmark-sort"
          value={sortOrder}
          onChange={(e) => onSortOrderChange(e.target.value as BookmarkSortOrder)}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-foreground-muted" aria-live="polite">
          {resultCount} shown
        </span>
      </div>
    </div>
  );
}

export function BookmarksPage({ initialSignals }: BookmarksPageProps) {
  const bookmarks = useBookmarkStore((state) => state.bookmarks);
  const folders = useBookmarkStore((state) => state.folders);
  const isHydrated = useBookmarkHydrated();
  const { assets } = usePortfolio();
  const {
    createFolder,
    renameFolder,
    deleteFolder,
    assignSignalToFolder,
    removeSignalFromFolder,
  } = useBookmarkActions();

  const router = useRouter();
  const searchParams = useSearchParams();
  const folderParam = searchParams.get("folder");
  const sortParam = searchParams.get("sort") as BookmarkSortOrder | null;
  const actionParam = searchParams.get("action") as BookmarkActionFilter | null;
  const [selectedFolderId, setSelectedFolderIdState] = useState<
    string | null
  >(folderParam);
  const [sortOrder, setSortOrderState] = useState<BookmarkSortOrder>(
    sortParam && SORT_OPTIONS.some((o) => o.value === sortParam)
      ? sortParam
      : "newest"
  );
  const [actionFilter, setActionFilterState] = useState<BookmarkActionFilter>(
    actionParam && ACTION_FILTERS.some((o) => o.value === actionParam)
      ? actionParam
      : "ALL"
  );

  // Keep local selection in sync with back/forward navigation and deep links.
  useEffect(() => {
    setSelectedFolderIdState(folderParam);
  }, [folderParam]);

  const updateQuery = (
    next: Partial<{
      folder: string | null;
      sort: BookmarkSortOrder;
      action: BookmarkActionFilter;
    }>
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    const folder = next.folder !== undefined ? next.folder : folderParam;
    const sort = next.sort ?? sortOrder;
    const action = next.action ?? actionFilter;

    if (folder) params.set("folder", folder);
    else params.delete("folder");

    if (sort && sort !== "newest") params.set("sort", sort);
    else params.delete("sort");

    if (action && action !== "ALL") params.set("action", action);
    else params.delete("action");

    const query = params.toString();
    router.replace(query ? `/bookmarks?${query}` : "/bookmarks", {
      scroll: false,
    });
  };

  const handleSortOrderChange = (value: BookmarkSortOrder) => {
    setSortOrderState(value);
    updateQuery({ sort: value });
  };

  const handleActionFilterChange = (value: BookmarkActionFilter) => {
    setActionFilterState(value);
    updateQuery({ action: value });
  };

  // If a deep-linked folder no longer exists once hydrated, fall back silently.
  useEffect(() => {
    if (!isHydrated || !selectedFolderId) return;
    if (!folders.some((f) => f.id === selectedFolderId)) {
      setSelectedFolder(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, folders]);

  const setSelectedFolder = (id: string | null) => {
    setSelectedFolderIdState(id);
    updateQuery({ folder: id });
  };

  const selectedFolder = selectedFolderId
    ? folders.find((f) => f.id === selectedFolderId) ?? null
    : null;

  let filteredSignalIds: string[];
  if (selectedFolder) {
    filteredSignalIds = selectedFolder.signalIds.filter((id) =>
      bookmarks.includes(id)
    );
  } else {
    filteredSignalIds = bookmarks;
  }

  const bookmarkedSignalsUnsorted = initialSignals.filter(
    (signal) =>
      filteredSignalIds.includes(signal.id) &&
      (actionFilter === "ALL" || signal.action === actionFilter)
  );

  const bookmarkedSignals = sortSignals(bookmarkedSignalsUnsorted, sortOrder);

  const tags = useBookmarkStore((s) => s.tags);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const visibleIds = bookmarkedSignals.map((s) => s.id);
  // Only act on bookmarks that are still visible after filtering/removal.
  const visibleSelectedIds = selectedIds.filter((id) => visibleIds.includes(id));
  const allSelected =
    visibleIds.length > 0 && visibleSelectedIds.length === visibleIds.length;

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const getSignalLabel = (id: string) => {
    const signal = initialSignals.find((s) => s.id === id);
    return signal ? `${signal.ticker}/USDC ${signal.action}` : id;
  };

  const portfolioBalance = assets.reduce((sum, asset) => sum + asset.value, 0);

  const handleCreateFolder = (name: string) => {
    createFolder(name);
  };

  const handleRenameFolder = (folderId: string, name: string) => {
    renameFolder(folderId, name);
  };

  const handleDeleteFolder = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    deleteFolder(folderId, folder?.name ?? "Unknown");
    if (selectedFolderId === folderId) {
      setSelectedFolder(null);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-sky-400/90">
              Bookmarks
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Saved signals
            </h1>
            <p className="max-w-2xl text-sm text-foreground-muted">
              Signals you save from the main feed appear here. Organize them
              into folders to track different strategies.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground-muted">
              {isHydrated ? `${bookmarkedSignals.length} saved` : "—"}
            </div>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/app">
                <ArrowLeft className="h-3.5 w-3.5 rtl-flip" aria-hidden="true" />
                Back to feed
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <aside className="w-full shrink-0 lg:w-64">
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
              <FolderList
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolder}
                onRenameFolder={handleRenameFolder}
                onDeleteFolder={handleDeleteFolder}
                onCreateFolder={handleCreateFolder}
              />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {isHydrated && bookmarks.length > 0 && (
              <FilterSortBar
                actionFilter={actionFilter}
                onActionFilterChange={handleActionFilterChange}
                sortOrder={sortOrder}
                onSortOrderChange={handleSortOrderChange}
                resultCount={bookmarkedSignals.length}
              />
            )}
            {isHydrated && bookmarkedSignals.length > 0 && (
              <>
                <label className="mb-2 inline-flex items-center gap-2 text-sm text-foreground-muted">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => setSelectedIds(allSelected ? [] : visibleIds)}
                    className="h-4 w-4 accent-sky-400"
                  />
                  Select all ({bookmarkedSignals.length})
                </label>
                <BulkTagBar
                  selectedIds={visibleSelectedIds}
                  getLabel={getSignalLabel}
                  onSelectionChange={setSelectedIds}
                />
              </>
            )}
            {!isHydrated ? (
              <BookmarksSkeleton />
            ) : bookmarkedSignals.length === 0 ? (
              <BookmarksEmptyState />
            ) : (
              <div className="space-y-4">
                {bookmarkedSignals.map((signal) => {
                  const signalFolders = folders.filter((f) =>
                    f.signalIds.includes(signal.id)
                  );

                  const signalTags = tags[signal.id] ?? [];

                  return (
                    <div key={signal.id}>
                      <label className="mb-1 inline-flex items-center gap-2 px-1 text-xs text-foreground-muted">
                        <input
                          type="checkbox"
                          checked={visibleSelectedIds.includes(signal.id)}
                          onChange={() => toggleSelected(signal.id)}
                          className="h-4 w-4 accent-sky-400"
                          aria-label={`Select ${getSignalLabel(signal.id)}`}
                        />
                        Select
                      </label>
                      <SignalCard
                        signalId={signal.id}
                        pair={`${signal.ticker}/USDC`}
                        action={signal.action}
                        confidence={signal.confidence}
                        analysis={signal.details}
                        providerName={signal.provider}
                        timestamp={new Date(signal.timestamp)}
                        showPassAction={false}
                        portfolioBalance={portfolioBalance}
                      />
                      {signalTags.length > 0 && (
                        <ul
                          className="mt-1 flex flex-wrap gap-1.5 px-1"
                          aria-label={`Tags for ${getSignalLabel(signal.id)}`}
                        >
                          {signalTags.map((t) => (
                            <li
                              key={t}
                              className="rounded-full bg-violet-400/10 px-2.5 py-0.5 text-xs text-violet-300"
                            >
                              #{t}
                            </li>
                          ))}
                        </ul>
                      )}
                      {folders.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1.5 px-1">
                          {signalFolders.map((f) => (
                            <button
                              key={f.id}
                              onClick={() =>
                                removeSignalFromFolder(signal.id, f.id, f.name)
                              }
                              className="inline-flex items-center gap-1 rounded-full bg-sky-400/10 px-2.5 py-0.5 text-xs text-sky-400 hover:bg-sky-400/20"
                              aria-label={`Remove from ${f.name}`}
                            >
                              <FolderIcon className="h-3 w-3" />
                              {f.name}
                              <X className="h-3 w-3" />
                            </button>
                          ))}
                          {signalFolders.length < folders.length && (
                            <div className="relative inline-flex">
                              <select
                                onChange={(e) => {
                                  const folderId = e.target.value;
                                  if (folderId) {
                                    const folder = folders.find(
                                      (f) => f.id === folderId
                                    );
                                    if (folder) {
                                      assignSignalToFolder(
                                        signal.id,
                                        folderId,
                                        folder.name
                                      );
                                    }
                                  }
                                  e.target.value = "";
                                }}
                                value=""
                                className="appearance-none rounded-full bg-white/5 px-2.5 py-0.5 pr-6 text-xs text-foreground-muted hover:bg-white/10 focus:outline-none"
                                aria-label="Assign to folder"
                              >
                                <option value="">+ Folder</option>
                                {folders
                                  .filter(
                                    (f) => !f.signalIds.includes(signal.id)
                                  )
                                  .map((f) => (
                                    <option key={f.id} value={f.id}>
                                      {f.name}
                                    </option>
                                  ))}
                              </select>
                              <Plus className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-foreground-muted" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
