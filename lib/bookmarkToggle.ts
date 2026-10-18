export type BookmarkOperation = "add" | "remove";

export interface BookmarkState {
  bookmarks: string[];
  folders: Record<string, string[]>;
}

export interface BookmarkSnapshot {
  bookmarks: string[];
  folders: Record<string, string[]>;
}

export interface BookmarkToggleResult {
  state: BookmarkState;
  operation: BookmarkOperation;
  signalId: string;
}

export interface BookmarkViewState {
  saved: boolean;
  pressed: boolean;
  operation: BookmarkOperation;
  i18nKey: string;
}

export const BOOKMARK_SAVED_I18N_KEY = "bookmarks.state.saved";
export const BOOKMARK_UNSAVED_I18N_KEY = "bookmarks.state.unsaved";

export function isBookmarked(state: BookmarkState, signalId: string): boolean {
  return state.bookmarks.includes(signalId);
}

export function countFoldersContaining(
  state: BookmarkState,
  signalId: string,
): number {
  return Object.values(state.folders).filter((members) =>
    members.includes(signalId),
  ).length;
}

function removeFromFolders(
  folders: Record<string, string[]>,
  signalId: string,
): Record<string, string[]> {
  const next: Record<string, string[]> = {};
  for (const [folder, members] of Object.entries(folders)) {
    next[folder] = members.filter((id) => id !== signalId);
  }
  return next;
}

export function createBookmarkSnapshot(state: BookmarkState): BookmarkSnapshot {
  const folders: Record<string, string[]> = {};
  for (const [folder, members] of Object.entries(state.folders)) {
    folders[folder] = [...members];
  }
  return { bookmarks: [...state.bookmarks], folders };
}

export function restoreBookmarkSnapshot(
  snapshot: BookmarkSnapshot,
): BookmarkState {
  return createBookmarkSnapshot(snapshot);
}

export function toggleBookmark(
  state: BookmarkState,
  signalId: string,
): BookmarkToggleResult {
  if (isBookmarked(state, signalId)) {
    return {
      operation: "remove",
      signalId,
      state: {
        bookmarks: state.bookmarks.filter((id) => id !== signalId),
        folders: removeFromFolders(state.folders, signalId),
      },
    };
  }
  return {
    operation: "add",
    signalId,
    state: {
      bookmarks: [...state.bookmarks, signalId],
      folders: createBookmarkSnapshot(state).folders,
    },
  };
}

export function describeBookmark(
  state: BookmarkState,
  signalId: string,
): BookmarkViewState {
  const saved = isBookmarked(state, signalId);
  return {
    saved,
    pressed: saved,
    operation: saved ? "remove" : "add",
    i18nKey: saved ? BOOKMARK_SAVED_I18N_KEY : BOOKMARK_UNSAVED_I18N_KEY,
  };
}
