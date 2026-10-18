"use client";

import { useEffect, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import {
  useDemoModeStore,
  useDemoModeHydrated,
  DEMO_SESSION_DURATION_MS,
  DEMO_WARNING_THRESHOLD_MS,
} from "@/store/useDemoModeStore";
import { cn } from "@/lib/utils";

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function DemoModeToggle({ className }: { className?: string }) {
  const { isDemoMode, toggleDemoMode, sessionStartedAt, resetDemoData } =
    useDemoModeStore();
  const isHydrated = useDemoModeHydrated();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!isDemoMode || sessionStartedAt === null) {
      setRemaining(null);
      return;
    }

    function tick() {
      const elapsed = Date.now() - (sessionStartedAt as number);
      setRemaining(Math.max(0, DEMO_SESSION_DURATION_MS - elapsed));
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isDemoMode, sessionStartedAt]);

  const isWarning =
    remaining !== null && remaining <= DEMO_WARNING_THRESHOLD_MS;

  function handleResetClick() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetDemoData();
    setConfirmReset(false);
  }

  function handleResetCancel() {
    setConfirmReset(false);
  }

  // Render a stable placeholder until localStorage has been read.
  if (!isHydrated) {
    return (
      <div
        className={cn(
          "h-7 w-24 rounded-full bg-foreground/5 animate-pulse",
          className
        )}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        onClick={toggleDemoMode}
        aria-pressed={isDemoMode}
        aria-label={isDemoMode ? "Exit demo mode" : "Enter demo mode"}
        className={cn(
          "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring forced-color-adjust-none",
          isDemoMode
            ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30 forced-colors:bg-[Highlight] forced-colors:text-[HighlightText] forced-colors:ring-[Highlight]"
            : "bg-foreground/5 text-foreground-muted hover:bg-foreground/10 hover:text-foreground forced-colors:border forced-colors:border-[ButtonText] forced-colors:text-[ButtonText]"
        )}
      >
        <Play size={12} aria-hidden="true" />
        <span>Demo Mode</span>
        {isDemoMode && (
          <span className="ml-1 rounded bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            ON
          </span>
        )}
      </button>

      {isDemoMode && remaining !== null && (
        <span
          data-testid="demo-countdown"
          className={cn(
            "text-xs font-mono px-2 py-0.5 rounded",
            isWarning
              ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/30"
              : "bg-white/10 text-foreground-muted"
          )}
          aria-label={`Demo session time remaining: ${formatCountdown(
            remaining
          )}`}
          data-warning={isWarning}
        >
          {formatCountdown(remaining)}
        </span>
      )}

      {isDemoMode &&
        (confirmReset ? (
          <span className="flex items-center gap-1 text-xs">
            <span className="text-yellow-400">Reset demo data?</span>
            <button
              onClick={handleResetClick}
              className="px-2 py-0.5 bg-red-500/80 hover:bg-red-500 text-white rounded text-xs"
              data-testid="demo-reset-confirm"
            >
              Confirm
            </button>
            <button
              onClick={handleResetCancel}
              className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-xs"
              data-testid="demo-reset-cancel"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={handleResetClick}
            aria-label="Reset demo data"
            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-foreground-muted hover:text-foreground bg-foreground/5 hover:bg-foreground/10 transition-colors forced-color-adjust-none"
            data-testid="demo-reset-open"
          >
            <RotateCcw size={11} aria-hidden="true" />
            Reset Data
          </button>
        ))}
    </div>
  );
}
