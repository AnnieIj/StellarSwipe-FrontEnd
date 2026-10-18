import type { Meta, StoryFn, StoryObj } from "@storybook/react";
import { Leaderboard } from "@/components/Leaderboard";
import {
  useLeaderboardStore,
  type LeaderboardEntry,
} from "@/store/leaderboardStore";

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_RANKINGS: LeaderboardEntry[] = [
  {
    id: "1",
    username: "stellar_alpha",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=stellar_alpha",
    marketType: "crypto",
    returnPct: 42.5,
    winRate: 78,
    anonymous: false,
    badges: ["top_trader"],
    followed: false,
  },
  {
    id: "2",
    username: "moonshot_trader",
    avatarUrl:
      "https://api.dicebear.com/7.x/avataaars/svg?seed=moonshot_trader",
    marketType: "crypto",
    returnPct: 31.2,
    winRate: 65,
    anonymous: false,
    badges: [],
    followed: true,
  },
  {
    id: "3",
    username: "fx_wizard",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=fx_wizard",
    marketType: "forex",
    returnPct: 27.8,
    winRate: 72,
    anonymous: false,
    badges: [],
    followed: false,
  },
  {
    id: "4",
    username: "",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=anon4",
    marketType: "commodities",
    returnPct: 19.4,
    winRate: 58,
    anonymous: true,
    badges: [],
    followed: false,
  },
];

// ── Store injection decorator ─────────────────────────────────────────────────
// Override fetchRankings with a no-op so the component's useEffect does not
// clear the pre-seeded store state when Chromatic captures the snapshot.

function withLeaderboardState(
  rankings: LeaderboardEntry[],
  loading = false,
  error: string | null = null
) {
  return (Story: StoryFn) => {
    useLeaderboardStore.setState({
      rankings,
      loading,
      error,
      // Prevent the component's useEffect from re-fetching and wiping state
      fetchRankings: async () => {},
    });
    return <Story />;
  };
}

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta: Meta<typeof Leaderboard> = {
  title: "Components/Leaderboard",
  component: Leaderboard,
  tags: ["autodocs"],
  parameters: {
    chromatic: { viewports: [375, 768, 1280] },
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof Leaderboard>;

// ── Populated states ──────────────────────────────────────────────────────────

export const Default: Story = {
  name: "Default (4 traders)",
  decorators: [withLeaderboardState(MOCK_RANKINGS)],
};

export const DefaultDark: Story = {
  name: "Default – Dark",
  parameters: { themes: { themeOverride: "dark" } },
  decorators: [withLeaderboardState(MOCK_RANKINGS)],
};

export const DefaultLight: Story = {
  name: "Default – Light",
  parameters: { themes: { themeOverride: "light" } },
  decorators: [withLeaderboardState(MOCK_RANKINGS)],
};

export const SingleEntry: Story = {
  name: "Single entry",
  decorators: [withLeaderboardState([MOCK_RANKINGS[0]])],
};

export const WithAnonymousTrader: Story = {
  name: "Anonymous trader",
  decorators: [
    withLeaderboardState([
      ...MOCK_RANKINGS.slice(0, 2),
      { ...MOCK_RANKINGS[3], id: "anon-only", anonymous: true },
    ]),
  ],
};

// ── Loading state ─────────────────────────────────────────────────────────────

export const Loading: Story = {
  name: "Loading",
  decorators: [withLeaderboardState([], true, null)],
};

export const LoadingDark: Story = {
  name: "Loading – Dark",
  parameters: { themes: { themeOverride: "dark" } },
  decorators: [withLeaderboardState([], true, null)],
};

// ── Error state ───────────────────────────────────────────────────────────────

export const FetchError: Story = {
  name: "Error state",
  decorators: [withLeaderboardState([], false, "Network response was not ok")],
};

export const FetchErrorDark: Story = {
  name: "Error state – Dark",
  parameters: { themes: { themeOverride: "dark" } },
  decorators: [withLeaderboardState([], false, "Network response was not ok")],
};

// ── Empty state ───────────────────────────────────────────────────────────────

export const Empty: Story = {
  name: "Empty rankings",
  decorators: [withLeaderboardState([])],
};

// ── Extended list ─────────────────────────────────────────────────────────────

const EXTENDED_RANKINGS: LeaderboardEntry[] = [
  ...MOCK_RANKINGS,
  {
    id: "5",
    username: "arbitrage_king",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=arbitrage_king",
    marketType: "crypto",
    returnPct: 15.3,
    winRate: 61,
    anonymous: false,
    badges: [],
    followed: false,
  },
  {
    id: "6",
    username: "steady_gains",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=steady_gains",
    marketType: "forex",
    returnPct: 11.7,
    winRate: 69,
    anonymous: false,
    badges: [],
    followed: false,
  },
];

export const ManyEntries: Story = {
  name: "Many entries (6 traders)",
  decorators: [withLeaderboardState(EXTENDED_RANKINGS)],
};
