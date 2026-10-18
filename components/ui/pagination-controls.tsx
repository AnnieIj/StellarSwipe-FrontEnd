"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PaginationControlsProps {
  page: number;
  totalPages: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  /** True while the dataset behind this page is being (re)fetched. */
  isLoading?: boolean;
  className?: string;
}

/**
 * Accessible Previous/Next pagination controls that stay in sync with a
 * dataset that can change size — pair with usePaginationClamp so `page`
 * always points at a page that actually exists.
 */
export function PaginationControls({
  page,
  totalPages,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  isLoading = false,
  className = "",
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-center gap-2 ${className}`}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevious}
        disabled={!canGoPrevious || isLoading}
        aria-label="Previous page"
      >
        Previous
      </Button>
      <span
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
        aria-live="polite"
      >
        {isLoading && (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        )}
        Page {page + 1} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={!canGoNext || isLoading}
        aria-label="Next page"
      >
        Next
      </Button>
    </nav>
  );
}
