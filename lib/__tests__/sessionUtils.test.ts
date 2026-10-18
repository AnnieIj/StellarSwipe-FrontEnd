/**
 * Unit tests for lib/sessionUtils.ts
 *
 * Pure functions — no DOM, no network, no mocks required.
 */

import {
  type Session,
  formatLastActive,
  canRevoke,
  otherSessionCount,
  optimisticRevoke,
  optimisticRevokeAll,
} from "@/lib/sessionUtils";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "sess_test",
    deviceLabel: "Chrome on macOS",
    location: "London, UK",
    lastActiveAt: new Date().toISOString(),
    isCurrent: false,
    ...overrides,
  };
}

const CURRENT = makeSession({ id: "sess_current", isCurrent: true });
const OTHER_A = makeSession({ id: "sess_a", isCurrent: false });
const OTHER_B = makeSession({ id: "sess_b", isCurrent: false });

// ---------------------------------------------------------------------------
// formatLastActive
// ---------------------------------------------------------------------------

describe("formatLastActive", () => {
  it('returns "Just now" for timestamps within the last minute', () => {
    const iso = new Date(Date.now() - 30_000).toISOString(); // 30 s ago
    expect(formatLastActive(iso)).toBe("Just now");
  });

  it('returns "1 minute ago" for a timestamp ~1 minute old', () => {
    const iso = new Date(Date.now() - 65_000).toISOString();
    expect(formatLastActive(iso)).toBe("1 minute ago");
  });

  it('uses plural "minutes" for timestamps older than 1 minute', () => {
    const iso = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatLastActive(iso)).toBe("5 minutes ago");
  });

  it('returns "1 hour ago" for a timestamp ~1 hour old', () => {
    const iso = new Date(Date.now() - 61 * 60_000).toISOString();
    expect(formatLastActive(iso)).toBe("1 hour ago");
  });

  it('uses plural "hours" for timestamps several hours old', () => {
    const iso = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
    expect(formatLastActive(iso)).toBe("3 hours ago");
  });

  it('returns "1 day ago" for a timestamp ~1 day old', () => {
    const iso = new Date(Date.now() - 25 * 60 * 60_000).toISOString();
    expect(formatLastActive(iso)).toBe("1 day ago");
  });

  it('uses plural "days" for multi-day-old timestamps within 30 days', () => {
    const iso = new Date(Date.now() - 5 * 24 * 60 * 60_000).toISOString();
    expect(formatLastActive(iso)).toBe("5 days ago");
  });

  it("returns a locale date string for timestamps older than 30 days", () => {
    const iso = new Date(Date.now() - 40 * 24 * 60 * 60_000).toISOString();
    const result = formatLastActive(iso);
    // Should not contain "ago" — will be a formatted date instead
    expect(result).not.toContain("ago");
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns "Unknown" for an invalid date string', () => {
    expect(formatLastActive("not-a-date")).toBe("Unknown");
  });

  it('returns "Unknown" for an empty string', () => {
    expect(formatLastActive("")).toBe("Unknown");
  });
});

// ---------------------------------------------------------------------------
// canRevoke
// ---------------------------------------------------------------------------

describe("canRevoke", () => {
  it("returns false for the current session", () => {
    expect(canRevoke(CURRENT)).toBe(false);
  });

  it("returns true for a non-current session", () => {
    expect(canRevoke(OTHER_A)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// otherSessionCount
// ---------------------------------------------------------------------------

describe("otherSessionCount", () => {
  it("returns 0 when only the current session exists", () => {
    expect(otherSessionCount([CURRENT])).toBe(0);
  });

  it("returns the correct count of non-current sessions", () => {
    expect(otherSessionCount([CURRENT, OTHER_A, OTHER_B])).toBe(2);
  });

  it("returns 0 for an empty list", () => {
    expect(otherSessionCount([])).toBe(0);
  });

  it("counts correctly when all sessions are non-current", () => {
    expect(otherSessionCount([OTHER_A, OTHER_B])).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// optimisticRevoke
// ---------------------------------------------------------------------------

describe("optimisticRevoke", () => {
  const sessions = [CURRENT, OTHER_A, OTHER_B];

  it("removes the targeted session from the list", () => {
    const result = optimisticRevoke(sessions, OTHER_A.id);
    expect(result.find((s) => s.id === OTHER_A.id)).toBeUndefined();
  });

  it("keeps the remaining sessions", () => {
    const result = optimisticRevoke(sessions, OTHER_A.id);
    expect(result.find((s) => s.id === CURRENT.id)).toBeDefined();
    expect(result.find((s) => s.id === OTHER_B.id)).toBeDefined();
  });

  it("returns the original list when the id does not match any session", () => {
    const result = optimisticRevoke(sessions, "nonexistent");
    expect(result).toHaveLength(sessions.length);
  });

  it("returns an empty array when the only session is removed", () => {
    const result = optimisticRevoke([OTHER_A], OTHER_A.id);
    expect(result).toHaveLength(0);
  });

  it("does not mutate the original array", () => {
    const original = [...sessions];
    optimisticRevoke(sessions, OTHER_A.id);
    expect(sessions).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// optimisticRevokeAll
// ---------------------------------------------------------------------------

describe("optimisticRevokeAll", () => {
  const sessions = [CURRENT, OTHER_A, OTHER_B];

  it("keeps only the current session", () => {
    const result = optimisticRevokeAll(sessions);
    expect(result).toHaveLength(1);
    expect(result[0].isCurrent).toBe(true);
  });

  it("removes all non-current sessions", () => {
    const result = optimisticRevokeAll(sessions);
    expect(result.find((s) => s.id === OTHER_A.id)).toBeUndefined();
    expect(result.find((s) => s.id === OTHER_B.id)).toBeUndefined();
  });

  it("returns an empty array when there is no current session", () => {
    const result = optimisticRevokeAll([OTHER_A, OTHER_B]);
    expect(result).toHaveLength(0);
  });

  it("returns an empty array for an empty input", () => {
    expect(optimisticRevokeAll([])).toHaveLength(0);
  });

  it("does not mutate the original array", () => {
    const original = [...sessions];
    optimisticRevokeAll(sessions);
    expect(sessions).toEqual(original);
  });
});
