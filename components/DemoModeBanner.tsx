"use client";

import { useCallback } from "react";
import { AlertCircle, ArrowRight, RotateCcw, UserPlus, X } from "lucide-react";
import { useDemoModeStore } from "@/store/useDemoModeStore";
import { cn } from "@/lib/utils";

interface DemoModeBannerProps {
  className?: string;
}

export function DemoModeBanner({ className }: DemoModeBannerProps) {
  const { isDemoMode, _hasHydrated, setDemoMode, resetDemoData } =
    useDemoModeStore();

  const handleExitDemo = useCallback(() => setDemoMode(false), [setDemoMode]);
  const handleReset = useCallback(() => resetDemoData(), [resetDemoData]);

  if (!_hasHydrated || !isDemoMode) return null;

  return (
    <div
      role="region"
      aria-label="Demo mode active"
      className={cn(
        "w-full rounded-xl border border-amber-500/30 bg-amber-500/10 p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-amber-500/20 p-2 shrink-0">
          <AlertCircle size={16} className="text-amber-400" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-300">
            You&apos;re in demo mode
          </p>
          <p className="mt-1 text-xs text-amber-200/80 leading-relaxed">
            You&apos;re exploring with $10,000 virtual funds and simulated trades.
            No real assets are at risk, but you can&apos;t execute live trades or
            connect a wallet until you exit demo mode.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={handleExitDemo}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label="Create account to start trading with real assets"
            >
              <UserPlus size={12} aria-hidden="true" />
              Create account
              <ArrowRight size={12} aria-hidden="true" className="rtl-flip" />
            </button>

            <button
              onClick={handleExitDemo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-400/80 hover:bg-amber-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label="Continue exploring in demo mode"
            >
              Continue exploring
            </button>

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-amber-400/80 hover:text-amber-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label="Reset demo data to defaults"
            >
              <RotateCcw size={11} aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
