"use client";

import { AlertCircle, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";

type ListState = "loading" | "idle" | "error" | "end-of-list" | "has-more";

interface ListStateIndicatorProps {
  state: ListState;
  onRetry?: () => void;
  itemCount?: number;
  totalCount?: number;
  className?: string;
}

/**
 * Minimal indicator component for list loading, completion, and error states.
 * Shows clear feedback about pagination and infinite-scroll progress.
 *
 * States:
 * - loading: Shows spinner while fetching data
 * - idle: No indicator shown
 * - error: Error message with retry button
 * - end-of-list: Message indicating no more items available
 * - has-more: Indicator that more items are available
 */
export function ListStateIndicator({
  state,
  onRetry,
  itemCount,
  totalCount,
  className = "",
}: ListStateIndicatorProps) {
  const { t } = useI18n();
  switch (state) {
    case "loading":
      return (
        <div
          className={`flex items-center justify-center gap-2 py-4 ${className}`}
          role="status"
          aria-live="polite"
          aria-label="Loading more items"
        >
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      );

    case "error":
      return (
        <div
          className={`flex items-center justify-between rounded-2xl border border-destructive/30 bg-destructive/5 p-3 sm:p-4 ${className}`}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-destructive shrink-0" />
            <div className="text-sm text-foreground">
              Failed to load items. Try again?
            </div>
          </div>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="ml-2 shrink-0"
            >
              Retry
            </Button>
          )}
        </div>
      );

    case "end-of-list":
      return (
        <div
          className={`flex items-center justify-center py-6 text-center ${className}`}
          role="status"
          aria-live="polite"
        >
          <div className="text-sm text-muted-foreground">
            {itemCount ? (
              <>
                <p className="font-medium text-foreground mb-1">
                  No more items
                </p>
                <p className="text-xs">
                  {t("list.viewed_all", { count: itemCount })}
                </p>
              </>
            ) : (
              "You've reached the end"
            )}
          </div>
        </div>
      );

    case "has-more":
      return (
        <div
          className={`flex items-center justify-center py-3 text-xs text-muted-foreground ${className}`}
          role="status"
        >
          <div className="flex items-center gap-1">
            <span>
              {itemCount && totalCount
                ? `Showing ${itemCount} of ${totalCount} items`
                : "More items available"}
            </span>
            <ChevronDown size={14} className="animate-bounce" />
          </div>
        </div>
      );

    case "idle":
    default:
      return null;
  }
}
