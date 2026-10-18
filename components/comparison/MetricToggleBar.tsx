"use client";

import { cn } from "@/lib/utils";

const ALL_METRICS = [
  { key: "confidence", label: "Confidence" },
  { key: "entryPrice", label: "Entry" },
  { key: "targetPrice", label: "Target" },
  { key: "stopLoss", label: "Stop Loss" },
  { key: "riskReward", label: "Risk/Reward" },
  { key: "rationale", label: "Rationale" },
];

interface MetricToggleBarProps {
  hiddenMetrics: string[];
  onToggle: (key: string) => void;
}

export function MetricToggleBar({
  hiddenMetrics,
  onToggle,
}: MetricToggleBarProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Toggle metrics"
    >
      {ALL_METRICS.map(({ key, label }) => {
        const visible = !hiddenMetrics.includes(key);
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            aria-pressed={visible}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              visible
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-gray-800 border-white/10 text-gray-400 hover:border-white/20"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
