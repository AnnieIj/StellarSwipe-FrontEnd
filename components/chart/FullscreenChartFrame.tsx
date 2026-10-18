"use client";

import type { ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useFullscreenPanel } from "@/hooks/useFullscreenPanel";
import { cn } from "@/lib/utils";

interface FullscreenChartFrameProps {
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a chart with an expand/collapse control that fills the viewport
 * on demand. Escape restores the previous size and returns focus to the
 * trigger; controls and labels stay usable in both states.
 */
export function FullscreenChartFrame({ title, children, className }: FullscreenChartFrameProps) {
  const { isFullscreen, toggle, triggerRef } = useFullscreenPanel();

  return (
    <div
      className={cn(
        isFullscreen
          ? "fixed inset-0 z-50 flex flex-col overflow-auto bg-background p-4 sm:p-8"
          : "relative flex flex-col",
        className
      )}
      role={isFullscreen ? "dialog" : undefined}
      aria-modal={isFullscreen || undefined}
      aria-label={isFullscreen ? `${title} (full screen)` : undefined}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        {isFullscreen && (
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
        )}
        <button
          ref={triggerRef}
          type="button"
          onClick={toggle}
          aria-pressed={isFullscreen}
          aria-label={isFullscreen ? `Exit full screen: ${title}` : `Expand ${title} to full screen`}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          {isFullscreen ? "Exit full screen" : "Full screen"}
        </button>
      </div>
      <div
        className={cn(
          "flex-1",
          isFullscreen && "flex items-center justify-center overflow-auto"
        )}
      >
        {children}
      </div>
    </div>
  );
}
