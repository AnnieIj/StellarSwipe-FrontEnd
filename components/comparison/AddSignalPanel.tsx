"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useSignals } from "@/hooks/useSignals";
import { useComparisonStore } from "@/store/useComparisonStore";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Check, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Signal } from "@/lib/api-types.generated";

const ROW_HEIGHT = 60;
const ROW_GAP = 8;

function SignalRow({ signal }: { signal: Signal }) {
  const { addSignal, isSelected, canAdd } = useComparisonStore();
  const selected = isSelected(signal.id);
  const isBuy = signal.action === "BUY";

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-800/60 border border-white/5">
      <div className="flex items-center gap-2 min-w-0">
        {isBuy ? (
          <TrendingUp className="h-4 w-4 text-green-400 shrink-0" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-400 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {signal.ticker}
          </p>
          {signal.provider && (
            <p className="text-xs text-gray-400 truncate">
              {signal.provider}
            </p>
          )}
        </div>
        <span
          className={cn(
            "text-xs ml-1 shrink-0",
            isBuy ? "text-green-400" : "text-red-400"
          )}
        >
          {signal.confidence}%
        </span>
      </div>
      <Button
        size="sm"
        variant={selected ? "secondary" : "default"}
        disabled={selected || (!canAdd() && !selected)}
        onClick={() => addSignal(signal)}
        aria-label={
          selected ? "Already added" : `Add ${signal.ticker} to comparison`
        }
        className="shrink-0 h-7 text-xs gap-1"
      >
        {selected ? (
          <Check className="h-3 w-3" />
        ) : (
          <Plus className="h-3 w-3" />
        )}
        {selected ? "Added" : "Add"}
      </Button>
    </div>
  );
}

export function AddSignalPanel() {
  const { data: signals, isLoading } = useSignals();
  const scrollRef = useRef<HTMLDivElement>(null);
  const items = signals?.items ?? [];

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT + ROW_GAP,
    overscan: 6,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading signals…
      </div>
    );
  }

  if (!items.length) {
    return (
      <EmptyState
        title="No signals available"
        description="Try again in a moment or adjust your signal source filters."
        className="rounded-xl bg-transparent py-6"
      />
    );
  }

  return (
    <div ref={scrollRef} className="max-h-72 overflow-y-auto pr-1">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const signal = items[virtualRow.index];
          return (
            <div
              key={signal.id}
              data-index={virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                paddingBottom: `${ROW_GAP}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <SignalRow signal={signal} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
