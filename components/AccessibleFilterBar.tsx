"use client";

import { Search, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface FilterOption {
  id: string;
  label: string;
}

interface AccessibleFilterBarProps {
  filters: FilterOption[];
  activeFilters: string[];
  onFilterChange: (ids: string[]) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
}

export function AccessibleFilterBar({
  filters,
  activeFilters,
  onFilterChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
}: AccessibleFilterBarProps) {
  const { t } = useI18n();
  const [focusedFilter, setFocusedFilter] = useState<number>(0);
  const filterRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const toggleFilter = useCallback(
    (id: string) => {
      onFilterChange(
        activeFilters.includes(id)
          ? activeFilters.filter((f) => f !== id)
          : [...activeFilters, id]
      );
    },
    [activeFilters, onFilterChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, idx: number) => {
      let next = idx;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        next = (idx + 1) % filters.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        next = (idx - 1 + filters.length) % filters.length;
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        toggleFilter(filters[idx].id);
        return;
      } else {
        return;
      }
      e.preventDefault();
      filterRefs.current[next]?.focus();
      setFocusedFilter(next);
    },
    [filters, toggleFilter]
  );

  const activeCount = activeFilters.length;

  return (
    <div className="flex flex-col gap-3" role="search" aria-label="Filter and search">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" aria-hidden="true" />
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="w-full rounded-lg border border-border bg-surface pl-9 pr-4 py-2 text-sm placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filters">
        {filters.map((filter, idx) => {
          const active = activeFilters.includes(filter.id);
          return (
            <button
              key={filter.id}
              ref={(el) => { filterRefs.current[idx] = el; }}
              role="checkbox"
              aria-checked={active}
              tabIndex={focusedFilter === idx ? 0 : -1}
              onClick={() => toggleFilter(filter.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              onFocus={() => setFocusedFilter(idx)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                active
                  ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "border-border bg-surface text-foreground-muted hover:bg-surface-high/10"
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {activeCount > 0
          ? t("filters.active_count", { count: activeCount })
          : t("filters.none_active")}
      </div>
    </div>
  );
}
