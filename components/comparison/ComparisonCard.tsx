"use client";

import {
  X,
  TrendingUp,
  TrendingDown,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/api-types.generated";
import { useBookmarkActions } from "@/hooks/useBookmarkActions";

interface ComparisonCardProps {
  signal: Signal;
  onRemove: () => void;
  hiddenMetrics: string[];
  bestValues: Record<string, number>;
}

const METRIC_LABELS: Record<string, string> = {
  confidence: "Confidence",
  entryPrice: "Entry Price",
  targetPrice: "Target Price",
  stopLoss: "Stop Loss",
  riskReward: "Risk/Reward",
};

export function ComparisonCard({
  signal,
  onRemove,
  hiddenMetrics,
  bestValues,
}: ComparisonCardProps) {
  const { hasBookmark, addBookmark, removeBookmark } = useBookmarkActions();
  const isBookmarked = hasBookmark(signal.id);
  const isBuy = signal.action === "BUY";

  const metrics = [
    {
      key: "confidence",
      value: signal.confidence,
      display: `${signal.confidence}%`,
      higherIsBetter: true,
    },
    {
      key: "entryPrice",
      value: undefined,
      display: "—",
      higherIsBetter: false,
    },
    {
      key: "targetPrice",
      value: undefined,
      display: "—",
      higherIsBetter: true,
    },
    { key: "stopLoss", value: undefined, display: "—", higherIsBetter: false },
    { key: "riskReward", value: undefined, display: "—", higherIsBetter: true },
  ];

  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-gray-900 overflow-hidden min-w-[200px]">
      {/* Header */}
      <div
        className={cn(
          "p-4 border-b border-white/10",
          isBuy ? "bg-green-950/40" : "bg-red-950/40"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              {isBuy ? (
                <TrendingUp className="h-4 w-4 text-green-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-400" />
              )}
              <span className="font-bold text-white text-lg">
                {signal.ticker}
              </span>
            </div>
            <span
              className={cn(
                "text-xs font-semibold px-1.5 py-0.5 rounded mt-1 inline-block",
                isBuy
                  ? "text-green-400 bg-green-400/10"
                  : "text-red-400 bg-red-400/10"
              )}
            >
              {signal.action}
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onRemove}
            aria-label="Remove from comparison"
            className="h-7 w-7 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {signal.provider && (
          <p className="mt-2 text-xs text-gray-400 truncate">
            {signal.provider}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {new Date(signal.timestamp).toLocaleDateString()}
        </p>
      </div>

      {/* Metrics */}
      <div className="divide-y divide-white/5">
        {metrics.map(({ key, value, display, higherIsBetter }) => {
          if (hiddenMetrics.includes(key)) return null;
          const isBest =
            value != null &&
            bestValues[key] != null &&
            value === bestValues[key] &&
            !isNaN(bestValues[key]);
          return (
            <div
              key={key}
              className={cn(
                "px-4 py-2.5 flex items-center justify-between gap-2",
                isBest && "bg-blue-950/30"
              )}
            >
              <span className="text-xs text-gray-400">
                {METRIC_LABELS[key]}
              </span>
              <span
                className={cn(
                  "text-sm font-mono font-medium",
                  isBest ? "text-blue-300" : "text-white"
                )}
              >
                {display}
                {isBest && (
                  <span className="ml-1 text-xs text-blue-400">★</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rationale */}
      {!hiddenMetrics.includes("rationale") && signal.details && (
        <div className="px-4 py-3 border-t border-white/5">
          <p className="text-xs text-gray-400 font-semibold mb-1">Rationale</p>
          <p className="text-xs text-gray-300 line-clamp-3">{signal.details}</p>
        </div>
      )}

      {/* Favorite */}
      <div className="p-3 border-t border-white/5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (isBookmarked) {
              removeBookmark(signal.id, signal.ticker);
            } else {
              addBookmark(signal.id);
            }
          }}
          className={cn(
            "w-full gap-2 text-xs",
            isBookmarked ? "text-yellow-400" : "text-gray-400"
          )}
        >
          {isBookmarked ? (
            <BookmarkCheck className="h-3.5 w-3.5" />
          ) : (
            <Bookmark className="h-3.5 w-3.5" />
          )}
          {isBookmarked ? "Saved" : "Save to Favorites"}
        </Button>
      </div>
    </div>
  );
}
