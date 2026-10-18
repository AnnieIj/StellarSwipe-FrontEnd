import React from "react";
import { AvatarImage } from "@/components/AvatarImage";
import {
  useLeaderboardStore,
  type LeaderboardEntry,
} from "../store/leaderboardStore";
import { useDataSaverStore } from "../store/useDataSaverStore";
import { getImageQuality } from "../lib/dataSaver";
import { formatNumber } from "../lib/utils";

const PERIOD_TABS: {
  value: "daily" | "weekly" | "monthly" | "yearly";
  label: string;
}[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "All Time" },
];

export const Leaderboard: React.FC = () => {
  const {
    rankings,
    loading,
    error,
    fetchRankings,
    period,
    setPeriod,
    currentUserId,
  } = useLeaderboardStore();
  // #408: serve lower-quality avatars when Data Saver mode is enabled.
  const dataSaverEnabled = useDataSaverStore((s) => s.dataSaverEnabled);
  const imageQuality = getImageQuality(dataSaverEnabled);

  React.useEffect(() => {
    fetchRankings();
  }, []);

  const currentUserEntry = React.useMemo(() => {
    if (!currentUserId) return null;
    const idx = rankings.findIndex((e) => e.id === currentUserId);
    if (idx === -1) return null;
    return { entry: rankings[idx], rank: idx + 1 };
  }, [rankings, currentUserId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-accent-danger p-4">
        Failed to load leaderboard: {error}
      </div>
    );
  }

  return (
    <section className="max-w-5xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-accent-market to-accent-primary text-transparent bg-clip-text">
        Community Leaderboard
      </h1>

      <nav aria-label="Leaderboard time period" className="mb-6 flex justify-center gap-2">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setPeriod(tab.value)}
            aria-pressed={period === tab.value}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              period === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-foreground/10 text-foreground hover:bg-foreground/20"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rankings.map((entry: LeaderboardEntry, idx: number) => {
          const isCurrentUser = currentUserId === entry.id;
          return (
            <article
              key={entry.id}
              aria-current={isCurrentUser ? "true" : undefined}
              className={`p-4 backdrop-filter backdrop-blur-lg rounded-xl shadow hover:shadow-xl transition-shadow ${
                isCurrentUser
                  ? "bg-indigo-50 ring-2 ring-indigo-500"
                  : "bg-white bg-opacity-70"
              }`}
            >
              <div className="flex items-center space-x-4">
                <span className="text-lg font-bold text-gray-400 w-6 shrink-0">
                  #{idx + 1}
                </span>
                <AvatarImage
                  src={entry.avatarUrl}
                  name={entry.anonymous ? "" : entry.username}
                  size={64}
                  quality={imageQuality}
                  priority={idx < 3}
                  className="border-2 border-primary"
                />
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {entry.anonymous ? "Anonymous" : entry.username}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-gray-600">{entry.marketType}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Return %</p>
                  <p className="text-lg font-medium text-green-600">
                    {formatNumber(entry.returnPct)}%
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {currentUserEntry && (
        <div
          role="complementary"
          aria-label="Your rank"
          className="sticky bottom-0 mt-4 p-3 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border-2 border-indigo-500 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-indigo-600">
              #{currentUserEntry.rank}
            </span>
            <span className="font-semibold text-gray-800 text-sm">
              {currentUserEntry.entry.anonymous
                ? "Anonymous"
                : currentUserEntry.entry.username}
            </span>
            <span className="text-xs text-gray-500">
              {currentUserEntry.entry.marketType}
            </span>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-500">Return %</p>
            <p className="text-base font-semibold text-green-600">
              {formatNumber(currentUserEntry.entry.returnPct)}%
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
