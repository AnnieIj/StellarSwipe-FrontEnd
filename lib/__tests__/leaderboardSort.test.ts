import {
  DEFAULT_LEADERBOARD_SORT,
  LEADERBOARD_SORT_FIELDS,
  type LeaderboardRow,
  compareBy,
  cycleSortField,
  describeSort,
  naturalDirection,
  rankAfterSort,
  sortLeaderboard,
  toggleSortDirection,
} from "@/lib/leaderboardSort";

const ROWS: LeaderboardRow[] = [
  {
    id: "p3",
    name: "Cara",
    rank: 3,
    score: 300,
    winRate: 0.4,
    recentPerformance: 0.9,
  },
  {
    id: "p1",
    name: "Ana",
    rank: 1,
    score: 100,
    winRate: 0.9,
    recentPerformance: 0.1,
  },
  {
    id: "p2",
    name: "Bea",
    rank: 2,
    score: 200,
    winRate: 0.6,
    recentPerformance: 0.5,
  },
];

function ids(rows: readonly LeaderboardRow[]): string[] {
  return rows.map((row) => row.id);
}

describe("sortLeaderboard – every field sorts predictably", () => {
  it("sorts by rank ascending by default", () => {
    expect(ids(sortLeaderboard(ROWS))).toEqual(["p1", "p2", "p3"]);
  });

  it("sorts by rank descending", () => {
    expect(ids(sortLeaderboard(ROWS, { field: "rank", direction: "desc" }))).toEqual([
      "p3",
      "p2",
      "p1",
    ]);
  });

  it("treats score, win rate and recent performance as high-is-better", () => {
    expect(ids(sortLeaderboard(ROWS, { field: "score", direction: "asc" }))).toEqual([
      "p1",
      "p2",
      "p3",
    ]);
    expect(
      ids(sortLeaderboard(ROWS, { field: "winRate", direction: "asc" })),
    ).toEqual(["p3", "p2", "p1"]);
    expect(
      ids(
        sortLeaderboard(ROWS, { field: "recentPerformance", direction: "asc" }),
      ),
    ).toEqual(["p1", "p2", "p3"]);
  });

  it("reverses the order for a descending direction", () => {
    expect(
      ids(sortLeaderboard(ROWS, { field: "winRate", direction: "desc" })),
    ).toEqual(["p1", "p2", "p3"]);
  });

  it("breaks ties by name so equal rows never jump around", () => {
    const tied: LeaderboardRow[] = [
      { id: "z", name: "Zed", rank: 1, score: 50, winRate: 0.5, recentPerformance: 0.5 },
      { id: "a", name: "Amy", rank: 1, score: 50, winRate: 0.5, recentPerformance: 0.5 },
    ];
    expect(ids(sortLeaderboard(tied, { field: "score", direction: "desc" }))).toEqual([
      "a",
      "z",
    ]);
  });

  it("leaves the input array untouched", () => {
    const before = ids(ROWS);
    sortLeaderboard(ROWS, { field: "score", direction: "desc" });
    expect(ids(ROWS)).toEqual(before);
  });

  it("handles an empty leaderboard", () => {
    expect(sortLeaderboard([], { field: "score", direction: "desc" })).toEqual([]);
  });
});

describe("compareBy – a raw comparator per field", () => {
  it("returns zero for equal values", () => {
    expect(compareBy("score")(ROWS[0], ROWS[0])).toBe(0);
  });

  it("ranks a bigger score higher", () => {
    expect(compareBy("score")(ROWS[0], ROWS[1])).toBeGreaterThan(0);
    expect(compareBy("score")(ROWS[1], ROWS[0])).toBeLessThan(0);
  });
});

describe("sorting controls – direction and field cycling", () => {
  it("starts on rank ascending", () => {
    expect(DEFAULT_LEADERBOARD_SORT).toEqual({ field: "rank", direction: "asc" });
  });

  it("toggles the direction without changing the field", () => {
    const desc = toggleSortDirection(DEFAULT_LEADERBOARD_SORT);
    expect(desc).toEqual({ field: "rank", direction: "desc" });
    expect(toggleSortDirection(desc)).toEqual({ field: "rank", direction: "asc" });
  });

  it("moves to the next field and resets to its natural direction", () => {
    const next = cycleSortField({ field: "rank", direction: "desc" });
    expect(next).toEqual({ field: "score", direction: "desc" });
  });

  it("wraps around after the last field", () => {
    const last = LEADERBOARD_SORT_FIELDS[LEADERBOARD_SORT_FIELDS.length - 1];
    expect(cycleSortField({ field: last, direction: "asc" })).toEqual({
      field: "rank",
      direction: "asc",
    });
  });

  it("knows which direction shows the best result first", () => {
    expect(naturalDirection("rank")).toBe("asc");
    expect(naturalDirection("winRate")).toBe("desc");
  });

  it("exposes an aria-sort value for the active control", () => {
    expect(describeSort({ field: "score", direction: "asc" })).toEqual({
      field: "score",
      direction: "asc",
      ariaSort: "ascending",
    });
    expect(describeSort({ field: "score", direction: "desc" }).ariaSort).toBe(
      "descending",
    );
  });
});

describe("rankAfterSort – the visible position of a row", () => {
  it("is one-based and follows the chosen sort", () => {
    expect(rankAfterSort(ROWS, { field: "rank", direction: "asc" }, "p1")).toBe(1);
    expect(
      rankAfterSort(ROWS, { field: "winRate", direction: "asc" }, "p1"),
    ).toBe(3);
  });

  it("returns -1 when the row is not in the leaderboard", () => {
    expect(rankAfterSort(ROWS, DEFAULT_LEADERBOARD_SORT, "missing")).toBe(-1);
  });
});
