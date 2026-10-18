"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { type ComparisonGranularity, formatGranularityLabel } from "@/lib/comparison";
import { cn } from "@/lib/utils";

interface ComparisonGranuritySelectorProps {
  value: ComparisonGranularity;
  onChange: (granularity: ComparisonGranularity) => void;
  className?: string;
}

const GRANULARITIES: ComparisonGranularity[] = ["week", "month", "quarter", "year"];

/**
 * ComparisonGranularitySelector — Dropdown/segmented control for selecting
 * the period-over-period comparison granularity.
 *
 * Features:
 * - Keyboard navigation (Arrow keys, Enter)
 * - Accessible labels and ARIA attributes
 * - Mobile-friendly dropdown
 * - Visual feedback for current selection
 */
export function ComparisonGranularitySelector({
  value,
  onChange,
  className,
}: ComparisonGranuritySelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleOptionKeyDown = (
    e: React.KeyboardEvent,
    granularity: ComparisonGranularity
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(granularity);
      setIsOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const currentIndex = GRANULARITIES.indexOf(granularity);
      const prevGranularity =
        GRANULARITIES[currentIndex - 1] || GRANULARITIES[GRANULARITIES.length - 1];
      onChange(prevGranularity);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const currentIndex = GRANULARITIES.indexOf(granularity);
      const nextGranularity = GRANULARITIES[(currentIndex + 1) % GRANULARITIES.length];
      onChange(nextGranularity);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Select period-over-period comparison granularity"
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium",
          "rounded-lg border border-border bg-white/5 text-foreground",
          "hover:bg-white/10 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2",
          "focus:ring-offset-slate-900"
        )}
      >
        <span>{formatGranularityLabel(value)}</span>
        <ChevronDown
          size={14}
          className={cn("transition-transform", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-48 overflow-hidden rounded-lg border border-border bg-slate-900 shadow-lg"
        >
          {GRANULARITIES.map((granularity) => (
            <button
              key={granularity}
              role="menuitem"
              onClick={() => {
                onChange(granularity);
                setIsOpen(false);
              }}
              onKeyDown={(e) => handleOptionKeyDown(e, granularity)}
              className={cn(
                "w-full px-4 py-2.5 text-left text-sm transition-colors",
                value === granularity
                  ? "bg-sky-500/20 text-sky-400 font-semibold"
                  : "text-foreground hover:bg-white/10"
              )}
            >
              {formatGranularityLabel(granularity)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
