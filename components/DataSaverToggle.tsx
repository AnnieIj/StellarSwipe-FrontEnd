"use client";

import { Gauge } from "lucide-react";
import { useDataSaverStore } from "@/store/useDataSaverStore";

/**
 * Settings toggle for Data Saver mode (issue #408).
 *
 * Enabling Data Saver reduces the app's network / rendering footprint:
 * mini sparkline charts are replaced with a static placeholder, non-essential
 * decorative animations are skipped, and images load at a lower quality
 * variant. The preference is persisted across sessions and takes effect (or
 * is undone) immediately, without a reload.
 */
export function DataSaverToggle() {
  const { dataSaverEnabled, setDataSaverEnabled } = useDataSaverStore();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <Gauge
            size={13}
            className="text-foreground-muted"
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-foreground">
            Data Saver
          </span>
        </div>
        <p className="text-xs text-foreground-muted">
          Reduce data usage on limited or expensive plans. Hides mini sparkline
          charts, skips non-essential animations, and loads lower-quality
          images. Separate from your device&apos;s reduced-motion setting.
        </p>
      </div>
      <button
        role="switch"
        aria-checked={dataSaverEnabled}
        aria-label="Toggle Data Saver mode"
        onClick={() => setDataSaverEnabled(!dataSaverEnabled)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          dataSaverEnabled ? "bg-blue-500" : "bg-foreground-muted/30"
        }`}
      >
        <span
          className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            dataSaverEnabled ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
