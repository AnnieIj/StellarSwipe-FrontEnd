/**
 * signalState.ts
 *
 * Server-side store for user → signal bookmarks and dismissals.
 *
 * In-memory for now (same as providerFollows.ts). Every entry is keyed by the
 * owning user id, so one account can never read or change another account's
 * state. Replace the Map with a database table keyed by (userId, signalId)
 * once persistence is available.
 */

export const SIGNAL_DISMISSAL_REASONS = [
  "irrelevant",
  "too_risky",
  "already_acted_on",
] as const;

export type SignalDismissalReason = (typeof SIGNAL_DISMISSAL_REASONS)[number];

export interface SignalDismissal {
  signalId: string;
  reason: SignalDismissalReason | null;
  dismissedAt: string;
}

export interface UserSignalState {
  bookmarks: string[];
  dismissals: SignalDismissal[];
}

interface StoredUserSignalState {
  bookmarks: Set<string>;
  dismissals: Map<string, SignalDismissal>;
}

const SIGNAL_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const stateByUser = new Map<string, StoredUserSignalState>();

function getOrCreateUserState(userId: string): StoredUserSignalState {
  const existing = stateByUser.get(userId);

  if (existing) return existing;

  const created: StoredUserSignalState = {
    bookmarks: new Set<string>(),
    dismissals: new Map<string, SignalDismissal>(),
  };
  stateByUser.set(userId, created);

  return created;
}

export function isValidSignalId(signalId: unknown): signalId is string {
  return typeof signalId === "string" && SIGNAL_ID_PATTERN.test(signalId);
}

export function isSignalDismissalReason(
  value: unknown
): value is SignalDismissalReason {
  return (
    typeof value === "string" &&
    (SIGNAL_DISMISSAL_REASONS as readonly string[]).includes(value)
  );
}

/**
 * Bookmarks a signal for the user. Returns `true` when it was newly saved and
 * `false` when it was already bookmarked.
 */
export function addSignalBookmark(userId: string, signalId: string): boolean {
  const state = getOrCreateUserState(userId);
  const created = !state.bookmarks.has(signalId);

  state.bookmarks.add(signalId);

  return created;
}

/**
 * Removes a bookmark for the user. Returns `true` when a bookmark was removed
 * and `false` when the signal was not bookmarked.
 */
export function removeSignalBookmark(userId: string, signalId: string): boolean {
  const state = stateByUser.get(userId);

  if (!state) return false;

  const removed = state.bookmarks.delete(signalId);

  if (state.bookmarks.size === 0 && state.dismissals.size === 0) {
    stateByUser.delete(userId);
  }

  return removed;
}

/**
 * Dismisses a signal for the user. The first dismissal wins: dismissing an
 * already-dismissed signal keeps the original reason and timestamp. Returns the
 * dismissal that is stored for the user.
 */
export function dismissSignal(
  userId: string,
  signalId: string,
  reason: SignalDismissalReason | null
): SignalDismissal {
  const state = getOrCreateUserState(userId);
  const existing = state.dismissals.get(signalId);

  if (existing) return existing;

  const dismissal: SignalDismissal = {
    signalId,
    reason,
    dismissedAt: new Date().toISOString(),
  };
  state.dismissals.set(signalId, dismissal);

  return dismissal;
}

/** Returns the signal state for a single user. Never includes other users' state. */
export function getUserSignalState(userId: string): UserSignalState {
  const state = stateByUser.get(userId);

  return {
    bookmarks: Array.from(state?.bookmarks ?? []),
    dismissals: Array.from(state?.dismissals.values() ?? []),
  };
}
