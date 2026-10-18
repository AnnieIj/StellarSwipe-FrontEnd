"use client";

import { useRecentlyViewedStore } from "@/store/useRecentlyViewedStore";
import { useInfiniteQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { History, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RelativeTimestamp } from "@/components/RelativeTimestamp";
import type { Signal } from "@/lib/signals";
import { cn } from "@/lib/utils";

export function RecentlyViewedStrip() {
  const { recentlyViewedIds, clearHistory, addView } = useRecentlyViewedStore();

  // We fetch all signals to find the ones we need.
  // In a real app, we might have a specific batch API or just rely on the feed cache.
  const { data } = useInfiniteQuery<any>({
    queryKey: ["signals"],
    queryFn: () => Promise.resolve({ items: [] }), // This just access the existing query cache
    initialPageParam: 1,
    getNextPageParam: () => null,
    enabled: false,
  });

  const allSignals = data?.pages.flatMap((page: any) => page.items) || [];
  const recentlyViewedSignals = recentlyViewedIds
    .map((id) => allSignals.find((s: Signal) => s.id === id))
    .filter(Boolean) as Signal[];

  if (recentlyViewedIds.length === 0) return null;

  return (
    <div className="mb-8 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-slate-400">
          <History size={14} className="text-sky-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest">
            Recently Viewed
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearHistory}
          className="h-6 px-2 text-[10px] text-slate-500 hover:text-red-400 hover:bg-red-400/10"
        >
          Clear History
        </Button>
      </div>

      <div className="relative -mx-4 px-4 overflow-x-auto pb-4 hide-scrollbar">
        <div className="flex gap-3 min-w-max">
          <AnimatePresence mode="popLayout" initial={false}>
            {recentlyViewedSignals.map((signal) => (
              <motion.div
                key={signal.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="group relative w-48 rounded-2xl border border-white/5 bg-slate-900/40 p-3 transition-all hover:border-sky-500/30 hover:bg-slate-900/60 cursor-pointer"
                onClick={() => {
                  // Re-trigger view to move it to front
                  addView(signal.id);
                  // Optionally scroll to it in the feed if possible
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                      signal.action === "BUY"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    )}
                  >
                    {signal.action}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    <RelativeTimestamp timestamp={new Date(signal.timestamp)} />
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  {signal.ticker}
                </h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="h-1 w-1 rounded-full bg-sky-500" />
                    <span className="text-[10px] text-slate-400">
                      {signal.confidence}%
                    </span>
                  </div>
                  <ChevronRight
                    size={12}
                    className="text-slate-600 group-hover:text-sky-400 transition-colors"
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty state within the strip if we have IDs but no cached data yet */}
          {recentlyViewedIds.length > 0 &&
            recentlyViewedSignals.length === 0 && (
              <div className="h-24 flex items-center justify-center gap-2 px-12 text-xs text-slate-500 italic">
                Loading history...
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
