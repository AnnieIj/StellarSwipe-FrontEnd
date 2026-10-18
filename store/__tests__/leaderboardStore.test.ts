import {
  useLeaderboardStore,
  type LeaderboardEntry,
} from "@/store/leaderboardStore";

const MOCK_RANKINGS: LeaderboardEntry[] = [
  {
    id: "user-1",
    username: "AlphaTrader",
    avatarUrl: "/avatars/1.png",
    marketType: "crypto",
    returnPct: 42.5,
    anonymous: false,
  },
  {
    id: "user-2",
    username: "BetaHedger",
    avatarUrl: "/avatars/2.png",
    marketType: "forex",
    returnPct: 31.2,
    anonymous: false,
  },
  {
    id: "user-3",
    username: "GammaScalper",
    avatarUrl: "/avatars/3.png",
    marketType: "commodities",
    returnPct: 18.9,
    anonymous: true,
  },
];

describe("leaderboardStore – currentUserId / sticky row rank", () => {
  beforeEach(() => {
    useLeaderboardStore.setState({
      rankings: MOCK_RANKINGS,
      loading: false,
      error: null,
      currentUserId: null,
      period: "weekly",
      filterMarket: null,
    });
  });

  it("currentUserId starts as null", () => {
    expect(useLeaderboardStore.getState().currentUserId).toBeNull();
  });

  it("setCurrentUserId updates the stored id", () => {
    useLeaderboardStore.getState().setCurrentUserId("user-2");
    expect(useLeaderboardStore.getState().currentUserId).toBe("user-2");
  });

  it("setCurrentUserId can be cleared back to null", () => {
    useLeaderboardStore.getState().setCurrentUserId("user-1");
    useLeaderboardStore.getState().setCurrentUserId(null);
    expect(useLeaderboardStore.getState().currentUserId).toBeNull();
  });

  it("derives rank 1 correctly from mocked dataset", () => {
    useLeaderboardStore.getState().setCurrentUserId("user-1");
    const { rankings, currentUserId } = useLeaderboardStore.getState();
    const idx = rankings.findIndex((e) => e.id === currentUserId);
    expect(idx).toBe(0);
    expect(idx + 1).toBe(1);
    expect(rankings[idx].username).toBe("AlphaTrader");
  });

  it("derives rank 2 correctly from mocked dataset", () => {
    useLeaderboardStore.getState().setCurrentUserId("user-2");
    const { rankings, currentUserId } = useLeaderboardStore.getState();
    const idx = rankings.findIndex((e) => e.id === currentUserId);
    expect(idx).toBe(1);
    expect(idx + 1).toBe(2);
    expect(rankings[idx].returnPct).toBe(31.2);
  });

  it("derives rank 3 correctly for an anonymous user", () => {
    useLeaderboardStore.getState().setCurrentUserId("user-3");
    const { rankings, currentUserId } = useLeaderboardStore.getState();
    const idx = rankings.findIndex((e) => e.id === currentUserId);
    expect(idx).toBe(2);
    expect(idx + 1).toBe(3);
    expect(rankings[idx].anonymous).toBe(true);
  });

  it("returns -1 (no rank) when currentUserId is not in rankings", () => {
    useLeaderboardStore.getState().setCurrentUserId("user-unknown");
    const { rankings, currentUserId } = useLeaderboardStore.getState();
    const idx = rankings.findIndex((e) => e.id === currentUserId);
    expect(idx).toBe(-1);
  });

  it("sticky row is hidden (no rank) when currentUserId is null", () => {
    const { rankings, currentUserId } = useLeaderboardStore.getState();
    const entry = currentUserId
      ? rankings.find((e) => e.id === currentUserId)
      : null;
    expect(entry).toBeNull();
  });

  it("sticky row reflects correct returnPct from mocked dataset", () => {
    useLeaderboardStore.getState().setCurrentUserId("user-1");
    const { rankings, currentUserId } = useLeaderboardStore.getState();
    const entry = rankings.find((e) => e.id === currentUserId);
    expect(entry?.returnPct).toBe(42.5);
  });
});

describe("leaderboardStore – period / time-range state", () => {
  beforeEach(() => {
    useLeaderboardStore.setState({
      rankings: [],
      loading: false,
      error: null,
      currentUserId: null,
      period: "weekly",
      filterMarket: null,
    });
  });

  it("period defaults to weekly", () => {
    expect(useLeaderboardStore.getState().period).toBe("weekly");
  });

  it("setPeriod updates to daily", () => {
    const fetchRankings = jest.fn().mockResolvedValue(undefined);
    useLeaderboardStore.setState({ fetchRankings });
    useLeaderboardStore.getState().setPeriod("daily");
    expect(useLeaderboardStore.getState().period).toBe("daily");
  });

  it("setPeriod updates to monthly", () => {
    const fetchRankings = jest.fn().mockResolvedValue(undefined);
    useLeaderboardStore.setState({ fetchRankings });
    useLeaderboardStore.getState().setPeriod("monthly");
    expect(useLeaderboardStore.getState().period).toBe("monthly");
  });

  it("setPeriod updates to yearly (all-time)", () => {
    const fetchRankings = jest.fn().mockResolvedValue(undefined);
    useLeaderboardStore.setState({ fetchRankings });
    useLeaderboardStore.getState().setPeriod("yearly");
    expect(useLeaderboardStore.getState().period).toBe("yearly");
  });
});
