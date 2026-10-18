"use client";

import { AlignJustify } from "lucide-react";
import { useChartDensityStore, type ChartAxisDensity } from "@/store/useChartDensityStore";
import { cn } from "@/lib/utils";

interface ChartDensityToggleProps {
  className?: string;
}

const OPTIONS: { value: ChartAxisDensity; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "standard", label: "Standard" },
  { value: "expanded", label: "Expanded" },
];

/**
 * Lets users choose how many axis labels dense time-series charts show.
 * Applies globally to chart components that read useChartDensityStore
 * (e.g. MiniChart), so a single choice here updates every signal chart.
 */
export function ChartDensityToggle({ className }: ChartDensityToggleProps) {
  const { density, setDensity } = useChartDensityStore();

  return (
    <div
      role="radiogroup"
      aria-label="Chart axis label density"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/5 p-0.5 text-xs",
        className
      )}
    >
      <AlignJustify size={12} className="ml-1.5 text-slate-500" aria-hidden="true" />
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={density === opt.value}
          onClick={() => setDensity(opt.value)}
          title={`${opt.label} axis labels`}
          className={cn(
            "rounded-full px-2 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
            density === opt.value
              ? "bg-sky-500/20 text-sky-300"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
