"use client";

/**
 * AnalyticsDebugConsole
 *
 * A dev-only overlay (gated behind process.env.NODE_ENV !== "production") that
 * surfaces analytics events as they fire, including event name and payload.
 *
 * Features:
 *  - Real-time log of tracked analytics events
 *  - Clear-log action to reset the list
 *  - Text filter to search/filter events by name or property
 *  - Fully excluded from production builds
 */

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Trash2,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { subscribeToAnalyticsEvents } from "@/services/analytics";
import type { AnalyticsEventEntry } from "@/services/analytics";

const MAX_EVENTS = 200;

export function AnalyticsDebugConsole() {
  // Hard-guard: never render in production
  if (process.env.NODE_ENV === "production") return null;

  return <AnalyticsDebugConsoleInner />;
}

function AnalyticsDebugConsoleInner() {
  const [events, setEvents] = useState<AnalyticsEventEntry[]>([]);
  const [minimised, setMinimised] = useState(true);
  const [filterText, setFilterText] = useState("");
  const listEndRef = useRef<HTMLDivElement>(null);
  // Subscribe to analytics events in dev mode
  useEffect(() => {
    const unsubscribe = subscribeToAnalyticsEvents((entry) => {
      setEvents((prev) => {
        const next = [entry, ...prev];
        if (next.length > MAX_EVENTS) {
          return next.slice(0, MAX_EVENTS);
        }
        return next;
      });
    });
    return unsubscribe;
  }, []);

  // Auto-scroll to top when new events arrive (we reverse order: newest first)
  useEffect(() => {
    if (!minimised && events.length > 0) {
      listEndRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [events.length, minimised]);

  const clearLog = useCallback(() => {
    setEvents([]);
  }, []);

  // Filter events based on text input
  const filteredEvents = useMemo(() => {
    if (!filterText.trim()) return events;

    const lowerFilter = filterText.toLowerCase();
    return events.filter((evt) => {
      if (evt.name.toLowerCase().includes(lowerFilter)) return true;
      if (evt.properties) {
        return Object.entries(evt.properties).some(
          ([key, val]) =>
            key.toLowerCase().includes(lowerFilter) ||
            String(val).toLowerCase().includes(lowerFilter)
        );
      }
      return false;
    });
  }, [events, filterText]);

  const eventCount = filteredEvents.length;
  const totalCount = events.length;

  return (
    <div
      role="complementary"
      aria-label="Analytics debug console (dev mode only)"
      className={cn(
        "fixed bottom-4 left-4 z-[9999] flex flex-col select-none text-[11px]",
        "border border-white/10 bg-slate-950/90 rounded-xl shadow-2xl shadow-black/60 backdrop-blur-sm",
        "transition-all duration-200",
        minimised ? "w-auto" : "w-80 max-h-96"
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setMinimised((v) => !v)}
        aria-expanded={!minimised}
        aria-label={
          minimised ? "Expand analytics console" : "Minimise analytics console"
        }
        className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        <span className="flex items-center gap-1.5 font-semibold text-slate-300">
          <Activity size={11} className="text-emerald-400" aria-hidden="true" />
          {!minimised && "Analytics"}
          <span className="rounded bg-emerald-500/20 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-400">
            DEV
          </span>
          {!minimised && totalCount > 0 && (
            <span className="text-slate-500 font-mono text-[10px]">
              {totalCount}
            </span>
          )}
        </span>
        {minimised ? (
          <ChevronUp size={11} className="text-slate-500" aria-hidden="true" />
        ) : (
          <ChevronDown
            size={11}
            className="text-slate-500"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Expanded content */}
      {!minimised && (
        <div className="border-t border-white/10 flex flex-col overflow-hidden rounded-b-xl">
          {/* Toolbar: filter + clear */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-white/5">
            <div className="relative flex-1">
              <Search
                size={10}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter events…"
                aria-label="Filter analytics events"
                className="w-full bg-slate-800/60 text-slate-200 text-[10px] rounded pl-5 pr-1.5 py-1 border border-white/5 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50 transition-colors"
              />
              {filterText && (
                <button
                  type="button"
                  onClick={() => setFilterText("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label="Clear filter"
                >
                  <X size={10} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={clearLog}
              disabled={events.length === 0}
              className="flex items-center gap-1 px-1.5 py-1 rounded text-[9px] bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Clear analytics log"
            >
              <Trash2 size={10} aria-hidden="true" />
              Clear
            </button>
          </div>

          {/* Event list */}
          <div className="overflow-y-auto flex-1 max-h-72">
            {eventCount === 0 && (
              <div className="px-2 py-2">
                <EmptyState
                  title={filterText ? "No matching events" : "No events yet"}
                  description={
                    filterText
                      ? "Try a broader filter to include more events."
                      : "Events will appear here as they fire."
                  }
                  icon={
                    <Activity
                      size={16}
                      className="opacity-40 text-slate-500"
                      aria-hidden="true"
                    />
                  }
                  className="rounded-lg border-white/5 bg-transparent py-6"
                />
              </div>
            )}

            {filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="border-b border-white/5 px-2.5 py-1.5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-200 truncate text-[10px]">
                    {evt.name}
                  </span>
                  <span className="text-[8px] text-slate-600 whitespace-nowrap font-mono">
                    {formatTimestamp(evt.timestamp)}
                  </span>
                </div>
                {evt.properties && Object.keys(evt.properties).length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {Object.entries(evt.properties).map(([key, val]) => (
                      <span
                        key={key}
                        className="inline-flex items-center gap-0.5 rounded bg-slate-800/60 px-1 py-0.5 text-[8px] font-mono"
                      >
                        <span className="text-slate-500">{key}:</span>
                        <span className="text-slate-300">
                          {formatPropertyValue(val)}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Invisible anchor for auto-scroll */}
            <div ref={listEndRef} />
          </div>

          {/* Footer */}
          <div className="border-t border-white/5 px-2.5 py-1 text-[9px] text-slate-600 flex items-center justify-between">
            <span>
              {filterText
                ? `${eventCount} / ${totalCount} events`
                : `${totalCount} events`}
            </span>
            <span>Dev only</span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatPropertyValue(
  val: string | number | boolean | null | undefined
): string {
  if (val === null) return "null";
  if (val === undefined) return "undefined";
  if (typeof val === "boolean") return val ? "true" : "false";
  return String(val);
}
