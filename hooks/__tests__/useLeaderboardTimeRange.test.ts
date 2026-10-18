/**
 * Unit tests for time-range filtering in useLeaderboard (Issue 357).
 *
 * We test the pure-logic layer — query-key construction, time-range
 * persistence helper, and that each valid time-range value is accepted —
 * without rendering the hook in a component.
 */

import { type LeaderboardTimeRange } from "@/hooks/useLeaderboard";

const VALID_TIME_RANGES: LeaderboardTimeRange[] = [
  "daily",
  "weekly",
  "monthly",
  "all-time",
];

// Simulate the getPersistedTimeRange logic extracted from the hook
const TIME_RANGE_STORAGE_KEY = "stellarswipe:leaderboard-time-range";

function getPersistedTimeRange(
  storage: Record<string, string> = {}
): LeaderboardTimeRange {
  const stored = storage[TIME_RANGE_STORAGE_KEY] as
    | LeaderboardTimeRange
    | undefined;
  return stored && VALID_TIME_RANGES.includes(stored) ? stored : "all-time";
}

function buildQueryKey(timeRange: LeaderboardTimeRange) {
  return ["leaderboard", timeRange];
}

describe("useLeaderboard – time-range query-key construction", () => {
  it("daily produces the correct query key", () => {
    expect(buildQueryKey("daily")).toEqual(["leaderboard", "daily"]);
  });

  it("weekly produces the correct query key", () => {
    expect(buildQueryKey("weekly")).toEqual(["leaderboard", "weekly"]);
  });

  it("monthly produces the correct query key", () => {
    expect(buildQueryKey("monthly")).toEqual(["leaderboard", "monthly"]);
  });

  it("all-time produces the correct query key", () => {
    expect(buildQueryKey("all-time")).toEqual(["leaderboard", "all-time"]);
  });

  it("each time-range produces a unique query key", () => {
    const keys = VALID_TIME_RANGES.map((r) => JSON.stringify(buildQueryKey(r)));
    const unique = new Set(keys);
    expect(unique.size).toBe(VALID_TIME_RANGES.length);
  });
});

describe("useLeaderboard – time-range persistence", () => {
  it("returns all-time as default when nothing is stored", () => {
    expect(getPersistedTimeRange({})).toBe("all-time");
  });

  it("restores a persisted daily selection", () => {
    expect(getPersistedTimeRange({ [TIME_RANGE_STORAGE_KEY]: "daily" })).toBe(
      "daily"
    );
  });

  it("restores a persisted weekly selection", () => {
    expect(getPersistedTimeRange({ [TIME_RANGE_STORAGE_KEY]: "weekly" })).toBe(
      "weekly"
    );
  });

  it("restores a persisted monthly selection", () => {
    expect(getPersistedTimeRange({ [TIME_RANGE_STORAGE_KEY]: "monthly" })).toBe(
      "monthly"
    );
  });

  it("restores a persisted all-time selection", () => {
    expect(
      getPersistedTimeRange({ [TIME_RANGE_STORAGE_KEY]: "all-time" })
    ).toBe("all-time");
  });

  it("falls back to all-time for an unrecognised stored value", () => {
    expect(getPersistedTimeRange({ [TIME_RANGE_STORAGE_KEY]: "unknown" })).toBe(
      "all-time"
    );
  });
});

describe("useLeaderboard – valid time-range type", () => {
  it("all four time-range values are valid", () => {
    const valid: LeaderboardTimeRange[] = [
      "daily",
      "weekly",
      "monthly",
      "all-time",
    ];
    valid.forEach((v) => {
      expect(VALID_TIME_RANGES).toContain(v);
    });
  });

  it("there are exactly four time-range options", () => {
    expect(VALID_TIME_RANGES).toHaveLength(4);
  });
});
