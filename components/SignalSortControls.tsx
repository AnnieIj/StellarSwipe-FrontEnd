"use client";

import { Flame, Clock, Sparkles, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FeedSortOrder, useSignalFilterStore } from "@/store/useSignalFilterStore";
import { useSegmentedControlKeyboard } from "@/hooks/useSegmentedControlKeyboard";

interface SortOption {
  value: FeedSortOrder;
  label: string;
  icon: React.ElementType;
  description: string;
  activeColor: string;
  activeIconColor: string;
}

const SORT_OPTIONS: SortOption[] = [
  {
    value: "latest",
    label: "Newest",
    icon: Clock,
    description: "Most recently published signals",
    activeColor: "bg-sky-500/20 text-sky-400 border border-sky-500/40",
    activeIconColor: "text-sky-400",
  },
  {
    value: "hot",
    label: "Best Performing",
    icon: Flame,
    description: "Signals with the highest projected performance",
    activeColor: "bg-orange-500/20 text-orange-400 border border-orange-500/40",
    activeIconColor: "text-orange-400",
  },
  {
    value: "confidence",
    label: "Confidence",
    icon: BarChart2,
    description: "Signals ranked by highest confidence score",
    activeColor:
      "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
    activeIconColor: "text-emerald-400",
  },
  {
    value: "relevant",
    label: "Relevant",
    icon: Sparkles,
    description: "Signals best matching your active filters",
    activeColor: "bg-purple-500/20 text-purple-400 border border-purple-500/40",
    activeIconColor: "text-purple-400",
  },
];

interface SignalSortControlsProps {
  className?: string;
}

export function SignalSortControls({ className }: SignalSortControlsProps) {
  const { sortOrder, setSortOrder } = useSignalFilterStore();

  const activeIndex = SORT_OPTIONS.findIndex((o) => o.value === sortOrder);

  const { groupRef, handleKeyDown } = useSegmentedControlKeyboard({
    itemCount: SORT_OPTIONS.length,
    activeIndex: activeIndex >= 0 ? activeIndex : 0,
    onActiveChange: (i) => setSortOrder(SORT_OPTIONS[i].value),
  });

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="Sort signals"
      onKeyDown={handleKeyDown}
      className={cn("flex flex-wrap items-center gap-1", className)}
    >
      {SORT_OPTIONS.map(({ value, label, icon: Icon, description, activeColor, activeIconColor }, index) => {
        const isActive = sortOrder === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => setSortOrder(value)}
            title={description}
            aria-label={`Sort by ${label}: ${description}`}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
              isActive
                ? activeColor
                : "bg-white/5 text-slate-400 border border-white/10 hover:border-white/20 hover:text-slate-300"
            )}
          >
            <Icon
              size={12}
              aria-hidden="true"
              className={cn(isActive ? activeIconColor : "text-slate-500")}
            />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
