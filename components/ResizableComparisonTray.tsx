"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface ComparisonItem {
  id: string;
  name: string;
}

interface ResizableComparisonTrayProps {
  items: ComparisonItem[];
  onRemove: (id: string) => void;
  onCompare: (ids: string[]) => void;
  defaultHeight?: number;
}

const MIN_HEIGHT = 48;
const MAX_HEIGHT = 400;
const STORAGE_KEY = "comparison-tray-height";

export function ResizableComparisonTray({
  items,
  onRemove,
  onCompare,
  defaultHeight = 160,
}: ResizableComparisonTrayProps) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [height, setHeight] = useState(defaultHeight);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const h = parseInt(stored, 10);
      if (!isNaN(h) && h >= MIN_HEIGHT && h <= MAX_HEIGHT) setHeight(h);
    }
  }, []);

  const saveHeight = useCallback((h: number) => {
    setHeight(h);
    localStorage.setItem(STORAGE_KEY, String(h));
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startY.current = e.clientY;
      startHeight.current = collapsed ? MIN_HEIGHT : height;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [collapsed, height]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const delta = startY.current - e.clientY;
      const next = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeight.current + delta));
      if (collapsed) setCollapsed(false);
      saveHeight(next);
    },
    [collapsed, saveHeight]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface shadow-lg"
      style={{
        height: collapsed ? MIN_HEIGHT : height,
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <div
        className="flex h-2 cursor-ns-resize items-center justify-center hover:bg-surface-high/20 transition-colors"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        aria-label="Resize comparison tray"
        role="separator"
        aria-orientation="horizontal"
        aria-valuenow={collapsed ? MIN_HEIGHT : height}
        aria-valuemin={MIN_HEIGHT}
        aria-valuemax={MAX_HEIGHT}
      >
        <div className="h-1 w-8 rounded-full bg-foreground-muted/30" />
      </div>

      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm font-medium">
          {t("comparison.items_selected", { count: items.length })}
        </span>
        <div className="flex items-center gap-2">
          {items.length >= 2 && (
            <button
              onClick={() => onCompare(items.map((i) => i.id))}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Compare
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand tray" : "Collapse tray"}
            className="rounded-md p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface-high/10 transition-colors"
          >
            {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex flex-wrap gap-2 overflow-y-auto px-4 pb-3">
          {items.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-high/10 px-3 py-1 text-xs"
            >
              {item.name}
              <button
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.name}`}
                className="rounded-full p-0.5 hover:bg-surface-high/30 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
