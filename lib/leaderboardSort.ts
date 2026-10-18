export const LEADERBOARD_SORT_FIELDS = [
  "rank",
  "score",
  "winRate",
  "recentPerformance",
] as const;

export type LeaderboardSortField = (typeof LEADERBOARD_SORT_FIELDS)[number];
export type LeaderboardSortDirection = "asc" | "desc";

export interface LeaderboardRow {
  id: string;
  name: string;
  rank: number;
  score: number;
  winRate: number;
  recentPerformance: number;
}

export interface LeaderboardSort {
  field: LeaderboardSortField;
  direction: LeaderboardSortDirection;
}

export interface LeaderboardSortDescription {
  field: LeaderboardSortField;
  direction: LeaderboardSortDirection;
  ariaSort: "ascending" | "descending";
}

export const DEFAULT_LEADERBOARD_SORT: LeaderboardSort = {
  field: "rank",
  direction: "asc",
};

const NATURAL_DIRECTION: Readonly<
  Record<LeaderboardSortField, LeaderboardSortDirection>
> = {
  rank: "asc",
  score: "desc",
  winRate: "desc",
  recentPerformance: "desc",
};

export function naturalDirection(
  field: LeaderboardSortField,
): LeaderboardSortDirection {
  return NATURAL_DIRECTION[field];
}

export function compareBy(
  field: LeaderboardSortField,
): (a: LeaderboardRow, b: LeaderboardRow) => number {
  return (a, b) => {
    const left = a[field];
    const right = b[field];
    if (left === right) return 0;
    return left < right ? -1 : 1;
  };
}

function compareNames(a: LeaderboardRow, b: LeaderboardRow): number {
  if (a.name === b.name) return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  return a.name < b.name ? -1 : 1;
}

export function sortLeaderboard(
  rows: readonly LeaderboardRow[],
  sort: LeaderboardSort = DEFAULT_LEADERBOARD_SORT,
): LeaderboardRow[] {
  const sign = sort.direction === "asc" ? 1 : -1;
  const compare = compareBy(sort.field);
  return [...rows].sort((a, b) => {
    const primary = sign * compare(a, b);
    return primary !== 0 ? primary : compareNames(a, b);
  });
}

export function toggleSortDirection(sort: LeaderboardSort): LeaderboardSort {
  return {
    field: sort.field,
    direction: sort.direction === "asc" ? "desc" : "asc",
  };
}

export function cycleSortField(sort: LeaderboardSort): LeaderboardSort {
  const index = LEADERBOARD_SORT_FIELDS.indexOf(sort.field);
  const next =
    LEADERBOARD_SORT_FIELDS[(index + 1) % LEADERBOARD_SORT_FIELDS.length];
  return { field: next, direction: naturalDirection(next) };
}

export function rankAfterSort(
  rows: readonly LeaderboardRow[],
  sort: LeaderboardSort,
  id: string,
): number {
  const position = sortLeaderboard(rows, sort).findIndex((row) => row.id === id);
  return position === -1 ? -1 : position + 1;
}

export function describeSort(sort: LeaderboardSort): LeaderboardSortDescription {
  return {
    field: sort.field,
    direction: sort.direction,
    ariaSort: sort.direction === "asc" ? "ascending" : "descending",
  };
}
