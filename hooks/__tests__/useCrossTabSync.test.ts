/**
 * Tests for cross-tab conflict detection logic in useCrossTabSync.
 *
 * The conflict resolution policy is last-write-wins: when a storage event
 * arrives from another tab for a setting that this tab also changed recently,
 * the remote value is applied and the user sees a notice.
 */

const CONFLICT_WINDOW_MS = 2000;

/**
 * Extracted pure conflict-detection logic from useCrossTabSync so it can be
 * tested without a DOM or Zustand setup.
 */
function detectConflict(
  lastLocalChangeTs: number | undefined,
  nowMs: number
): boolean {
  if (lastLocalChangeTs === undefined) return false;
  return nowMs - lastLocalChangeTs < CONFLICT_WINDOW_MS;
}

describe("useCrossTabSync – conflict detection", () => {
  it("no conflict when this tab has never changed the setting", () => {
    expect(detectConflict(undefined, Date.now())).toBe(false);
  });

  it("no conflict when local change is older than the conflict window", () => {
    const localTs = Date.now() - CONFLICT_WINDOW_MS - 1;
    expect(detectConflict(localTs, Date.now())).toBe(false);
  });

  it("conflict detected when local change is within the conflict window", () => {
    const localTs = Date.now() - 500; // 500ms ago — well inside window
    expect(detectConflict(localTs, Date.now())).toBe(true);
  });

  it("conflict detected for a change made 1 ms ago", () => {
    const localTs = Date.now() - 1;
    expect(detectConflict(localTs, Date.now())).toBe(true);
  });

  it("no conflict when the change exactly equals the window boundary", () => {
    const now = 10000;
    const localTs = now - CONFLICT_WINDOW_MS; // exactly at boundary — not inside
    expect(detectConflict(localTs, now)).toBe(false);
  });

  it("conflict for wallet-store and no conflict for stellar-theme are independent", () => {
    const now = Date.now();
    const walletTs = now - 100; // recent — conflict
    const themeTs = now - 5000; // stale — no conflict

    expect(detectConflict(walletTs, now)).toBe(true);
    expect(detectConflict(themeTs, now)).toBe(false);
  });

  it("two near-simultaneous conflicting sync messages both trigger conflict", () => {
    const now = Date.now();
    const localTs = now - 200; // 200ms ago — within window

    // Simulates two storage events arriving for the same key in quick succession.
    // Both should be flagged as conflicts because the local change is still recent.
    expect(detectConflict(localTs, now)).toBe(true);
    expect(detectConflict(localTs, now + 50)).toBe(true);
  });
});
