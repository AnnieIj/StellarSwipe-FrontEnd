import {
  BOOKMARK_SAVED_I18N_KEY,
  BOOKMARK_UNSAVED_I18N_KEY,
  type BookmarkState,
  countFoldersContaining,
  createBookmarkSnapshot,
  describeBookmark,
  isBookmarked,
  restoreBookmarkSnapshot,
  toggleBookmark,
} from "@/lib/bookmarkToggle";

const EMPTY: BookmarkState = { bookmarks: [], folders: {} };

const STATE: BookmarkState = {
  bookmarks: ["sig-1", "sig-2"],
  folders: { starred: ["sig-1", "sig-2"], researched: ["sig-2"] },
};

describe("toggleBookmark – a press always reports what it did", () => {
  it("adds an unsaved signal", () => {
    const result = toggleBookmark(EMPTY, "sig-9");
    expect(result.operation).toBe("add");
    expect(result.state.bookmarks).toEqual(["sig-9"]);
  });

  it("removes a saved signal", () => {
    const result = toggleBookmark(STATE, "sig-1");
    expect(result.operation).toBe("remove");
    expect(result.state.bookmarks).toEqual(["sig-2"]);
  });

  it("returns to the starting state after two presses", () => {
    const added = toggleBookmark(EMPTY, "sig-9").state;
    const removed = toggleBookmark(added, "sig-9").state;
    expect(removed.bookmarks).toEqual([]);
  });

  it("removes the signal from every folder as well", () => {
    const result = toggleBookmark(STATE, "sig-2");
    expect(result.state.folders).toEqual({
      starred: ["sig-1"],
      researched: [],
    });
    expect(countFoldersContaining(result.state, "sig-2")).toBe(0);
  });

  it("keeps other signals and empty folders intact", () => {
    const result = toggleBookmark(STATE, "sig-2");
    expect(result.state.bookmarks).toEqual(["sig-1"]);
    expect(Object.keys(result.state.folders)).toEqual(["starred", "researched"]);
  });

  it("does not mutate the state it was given", () => {
    const before = createBookmarkSnapshot(STATE);
    toggleBookmark(STATE, "sig-1");
    expect(STATE).toEqual(before);
  });

  it("adds without dropping existing folder membership", () => {
    const result = toggleBookmark(STATE, "sig-3");
    expect(result.state.folders).toEqual(STATE.folders);
    expect(result.state.bookmarks).toEqual(["sig-1", "sig-2", "sig-3"]);
  });

  it("never stores a duplicate id", () => {
    const duplicated: BookmarkState = {
      bookmarks: ["sig-1", "sig-1"],
      folders: { starred: ["sig-1", "sig-1"] },
    };
    const result = toggleBookmark(duplicated, "sig-1");
    expect(result.state.bookmarks).toEqual([]);
    expect(result.state.folders.starred).toEqual([]);
  });
});

describe("snapshots – an optimistic toggle can always be rolled back", () => {
  it("copies arrays and folders so later writes cannot leak in", () => {
    const snapshot = createBookmarkSnapshot(STATE);
    toggleBookmark(STATE, "sig-1");
    expect(snapshot.bookmarks).toEqual(["sig-1", "sig-2"]);
    expect(restoreBookmarkSnapshot(snapshot)).toEqual(STATE);
  });

  it("returns an independent copy from restore", () => {
    const snapshot = createBookmarkSnapshot(STATE);
    const restored = restoreBookmarkSnapshot(snapshot);
    restored.bookmarks.push("sig-3");
    expect(snapshot.bookmarks).toEqual(["sig-1", "sig-2"]);
  });
});

describe("describeBookmark – one source of truth for the control", () => {
  it("reports the saved state and its translation key", () => {
    expect(describeBookmark(STATE, "sig-1")).toEqual({
      saved: true,
      pressed: true,
      operation: "remove",
      i18nKey: BOOKMARK_SAVED_I18N_KEY,
    });
  });

  it("reports the unsaved state and its translation key", () => {
    expect(describeBookmark(STATE, "sig-9")).toEqual({
      saved: false,
      pressed: false,
      operation: "add",
      i18nKey: BOOKMARK_UNSAVED_I18N_KEY,
    });
  });

  it("agrees with isBookmarked", () => {
    expect(describeBookmark(STATE, "sig-1").saved).toBe(
      isBookmarked(STATE, "sig-1"),
    );
    expect(describeBookmark(STATE, "sig-2").saved).toBe(true);
    expect(countFoldersContaining(STATE, "sig-2")).toBe(2);
  });
});
