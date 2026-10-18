"use client";

import React from "react";
import { AvatarImage } from "@/components/AvatarImage";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  useLeaderboardStore,
  type LeaderboardEntry,
} from "../store/leaderboardStore";
import { useDataSaverStore } from "../store/useDataSaverStore";
import { getImageQuality } from "../lib/dataSaver";
import { formatNumber } from "../lib/utils";

function CompactRow({
  entry,
  rank,
  isCurrentUser,
  expanded,
  imageQuality,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
  expanded: boolean;
  imageQuality: number;
}) {
  return (
    <article
      aria-current={isCurrentUser ? "true" : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
        isCurrentUser
          ? "bg-indigo-50 ring-1 ring-indigo-500"
          : "bg-white/50 hover:bg-white/70"
      }`}
    >
      <span className="text-sm font-bold text-gray-400 w-5 text-center shrink-0">
        {rank}
      </span>

      <AvatarImage
        src={entry.avatarUrl}
        name={entry.anonymous ? "" : entry.username}
        size={32}
        quality={imageQuality}
        priority={rank <= 3}
        className="border border-primary"
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">
          {entry.anonymous ? "Anonymous" : entry.username}
          {isCurrentUser && (
            <span className="ml-1.5 text-[10px] font-medium text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full">
              You
            </span>
          )}
        </p>
        {expanded && (
          <p className="text-xs text-gray-500 truncate">{entry.marketType}</p>
        )}
      </div>

      <span className="text-sm font-medium text-green-600 shrink-0 tabular-nums">
        {formatNumber(entry.returnPct)}%
      </span>

      {expanded && entry.winRate !== undefined && (
        <span className="hidden sm:inline text-xs text-gray-500 shrink-0 tabular-nums">
          {entry.winRate}% WR
        </span>
      )}

      {expanded && entry.portfolioGrowth !== undefined && (
        <span className="hidden sm:inline text-xs text-gray-500 shrink-0 tabular-nums">
          +{formatNumber(entry.portfolioGrowth)}%
        </span>
      )}
    </article>
  );
}

export function LeaderboardCompact() {
  const {
    rankings,
    loading,
    error,
    fetchRankings,
    period,
    setPeriod,
    currentUserId,
  } = useLeaderboardStore();
  const dataSaverEnabled = useDataSaverStore((s) => s.dataSaverEnabled);
  const imageQuality = getImageQuality(dataSaverEnabled);

  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    fetchRankings();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 text-sm">
        Failed to load leaderboard: {error}
      </div>
    );
  }

  return (
    <section className="max-w-2xl mx-auto p-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-transparent bg-clip-text">
          Leaderboard
        </h2>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1 text-xs font-medium text-foreground-muted hover:text-foreground transition-colors"
        >
          {expanded ? "Compact" : "Detailed"}
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      <div
        className="flex gap-1 mb-3 border-b border-gray-200 overflow-x-auto"
        role="tablist"
        aria-label="Leaderboard time range"
      >
        {(
          [
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "All Time" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={period === tab.value}
            onClick={() => setPeriod(tab.value)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              period === tab.value
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        {rankings.map((entry: LeaderboardEntry, idx: number) => (
          <CompactRow
            key={entry.id}
            entry={entry}
            rank={idx + 1}
            isCurrentUser={currentUserId === entry.id}
            expanded={expanded}
            imageQuality={imageQuality}
          />
        ))}
      </div>
    </section>
  );
}
