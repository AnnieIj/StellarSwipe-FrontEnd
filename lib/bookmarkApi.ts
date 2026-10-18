/**
 * bookmarkApi.ts
 *
 * Simulated backend API for bookmark operations.
 *
 * Mirrors the pattern in journalApi.ts — an in-memory store with artificial
 * latency and a small failure rate so the optimistic-update / rollback paths
 * can be exercised during development.
 *
 * Swap the implementation when a real endpoint is available — the exported
 * function signatures stay the same.
 */

// ---------------------------------------------------------------------------
// In-memory bookmark set (simulates server-side storage)
// ---------------------------------------------------------------------------

const serverBookmarks = new Set<string>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class BookmarkApiError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "BookmarkApiError";
  }
}

// ---------------------------------------------------------------------------
// API operations
// ---------------------------------------------------------------------------

/**
 * Persist a bookmark on the server.
 * Returns the signal id that was bookmarked.
 */
export async function saveBookmark(signalId: string): Promise<string> {
  await delay(350);

  if (Math.random() < 0.04) {
    throw new BookmarkApiError(
      "Failed to save bookmark. Your bookmark is saved locally and will sync automatically.",
      "SYNC_FAILED"
    );
  }

  serverBookmarks.add(signalId);
  return signalId;
}

/**
 * Remove a bookmark from the server.
 */
export async function removeBookmark(signalId: string): Promise<string> {
  await delay(250);

  if (Math.random() < 0.04) {
    throw new BookmarkApiError(
      "Failed to remove bookmark. Your changes are applied locally and will sync automatically.",
      "SYNC_FAILED"
    );
  }

  serverBookmarks.delete(signalId);
  return signalId;
}

/**
 * Persist the tag list for a single bookmark.
 * Returns the signal id whose tags were updated.
 */
export async function saveBookmarkTags(
  signalId: string,
  tags: string[]
): Promise<string> {
  await delay(250);

  if (Math.random() < 0.04) {
    throw new BookmarkApiError("Failed to update bookmark tags.", "SYNC_FAILED");
  }

  void tags;
  return signalId;
}

/**
 * Fetch all bookmarked signal ids from the server.
 */
export async function fetchBookmarks(): Promise<string[]> {
  await delay(200);
  return Array.from(serverBookmarks);
}
