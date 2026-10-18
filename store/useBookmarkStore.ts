import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BookmarkFolder {
  id: string;
  name: string;
  signalIds: string[];
}

interface BookmarkState {
  bookmarks: string[];
  folders: BookmarkFolder[];
  /** Tags keyed by signal id. */
  tags: Record<string, string[]>;
  _hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  hasBookmark: (id: string) => boolean;
  addBookmark: (id: string) => void;
  removeBookmark: (id: string) => void;
  toggleBookmark: (id: string) => void;
  setBookmarks: (ids: string[]) => void;
  clearBookmarks: () => void;
  createFolder: (name: string) => string;
  renameFolder: (folderId: string, name: string) => void;
  deleteFolder: (folderId: string) => void;
  assignSignalToFolder: (signalId: string, folderId: string) => void;
  removeSignalFromFolder: (signalId: string, folderId: string) => void;
  getSignalsByFolder: (folderId: string) => string[];
  getFoldersForSignal: (signalId: string) => BookmarkFolder[];
  addTagToSignals: (tag: string, signalIds: string[]) => void;
  removeTagFromSignals: (tag: string, signalIds: string[]) => void;
}

let folderCounter = 0;

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      folders: [],
      tags: {},
      _hasHydrated: false,
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
      hasBookmark: (id: string) => get().bookmarks.includes(id),
      addBookmark: (id: string) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(id)
            ? state.bookmarks
            : [...state.bookmarks, id],
        })),
      removeBookmark: (id: string) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((bookmark) => bookmark !== id),
          folders: state.folders.map((f) => ({
            ...f,
            signalIds: f.signalIds.filter((sid) => sid !== id),
          })),
          tags: Object.fromEntries(
            Object.entries(state.tags).filter(([sid]) => sid !== id)
          ),
        })),
      toggleBookmark: (id: string) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(id)
            ? state.bookmarks.filter((bookmark) => bookmark !== id)
            : [...state.bookmarks, id],
        })),
      setBookmarks: (ids: string[]) => set({ bookmarks: [...new Set(ids)] }),
      clearBookmarks: () => set({ bookmarks: [], folders: [], tags: {} }),
      createFolder: (name: string) => {
        const id = `folder-${++folderCounter}-${Date.now()}`;
        set((state) => ({
          folders: [...state.folders, { id, name, signalIds: [] }],
        }));
        return id;
      },
      renameFolder: (folderId: string, name: string) =>
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === folderId ? { ...f, name } : f
          ),
        })),
      deleteFolder: (folderId: string) =>
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== folderId),
        })),
      assignSignalToFolder: (signalId: string, folderId: string) =>
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === folderId && !f.signalIds.includes(signalId)
              ? { ...f, signalIds: [...f.signalIds, signalId] }
              : f
          ),
        })),
      removeSignalFromFolder: (signalId: string, folderId: string) =>
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === folderId
              ? {
                  ...f,
                  signalIds: f.signalIds.filter((sid) => sid !== signalId),
                }
              : f
          ),
        })),
      getSignalsByFolder: (folderId: string) => {
        const folder = get().folders.find((f) => f.id === folderId);
        return folder ? folder.signalIds : [];
      },
      getFoldersForSignal: (signalId: string) =>
        get().folders.filter((f) => f.signalIds.includes(signalId)),
      addTagToSignals: (tag: string, signalIds: string[]) =>
        set((state) => {
          const tags = { ...state.tags };
          signalIds.forEach((id) => {
            const current = tags[id] ?? [];
            if (!current.includes(tag)) tags[id] = [...current, tag];
          });
          return { tags };
        }),
      removeTagFromSignals: (tag: string, signalIds: string[]) =>
        set((state) => {
          const tags = { ...state.tags };
          signalIds.forEach((id) => {
            const next = (tags[id] ?? []).filter((t) => t !== tag);
            if (next.length) tags[id] = next;
            else delete tags[id];
          });
          return { tags };
        }),
    }),
    {
      name: "signal-bookmarks",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/** Returns `true` once localStorage has been read and state is stable. */
export const useBookmarkHydrated = () =>
  useBookmarkStore((s) => s._hasHydrated);

// ── Optimistic sync bookkeeping ─────────────────────────────────────
// Rapid toggles fire overlapping requests; only the latest one per signal
// may settle the UI, and a failure rolls back to the last server-confirmed
// state rather than whatever the stale optimistic value was.
const latestRequest = new Map<string, number>();
const confirmedState = new Map<string, boolean>();

/** Registers a new sync request for `id` and returns its sequence number. */
export function beginBookmarkRequest(id: string): number {
  const seq = (latestRequest.get(id) ?? 0) + 1;
  latestRequest.set(id, seq);
  return seq;
}

/**
 * Records a request outcome. Returns `false` when a newer request for the
 * same signal is in flight (`isLatest: false`, caller should do nothing).
 * On failure, `restoreTo` is the bookmarked state to roll back to.
 */
export function settleBookmarkRequest(
  id: string,
  seq: number,
  outcome: { ok: boolean; target: boolean; prior: boolean }
): { isLatest: boolean; restoreTo: boolean } {
  if (outcome.ok) confirmedState.set(id, outcome.target);
  const isLatest = latestRequest.get(id) === seq;
  return {
    isLatest,
    restoreTo: confirmedState.get(id) ?? outcome.prior,
  };
}
