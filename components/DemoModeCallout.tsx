"use client";

import { Link } from "lucide-react";
import { useDemoModeStore } from "@/store/useDemoModeStore";
import { cn } from "@/lib/utils";

export function DemoModeCallout({ className }: { className?: string }) {
  const { setDemoMode } = useDemoModeStore();

  return (
    <div
      className={cn(
        "w-full max-w-md rounded-xl border border-blue-500/30 bg-blue-500/10 p-4",
        className
      )}
      role="status"
      aria-label="Demo mode active"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-blue-500/20 p-2">
          <Link size={16} className="text-blue-400" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-300">Demo Mode Active</p>
          <p className="mt-1 text-xs text-blue-300/90">
            You are viewing sample signals with $10,000 virtual funds. Connect a
            wallet and disable demo mode to trade with real assets.
          </p>
          <button
            onClick={() => setDemoMode(false)}
            className="mt-2 rounded text-xs font-medium text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Exit demo mode and switch to live trading"
          >
            Switch to Live Trading
          </button>
        </div>
      </div>
    </div>
  );
}
